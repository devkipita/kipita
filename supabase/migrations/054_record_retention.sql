BEGIN;

CREATE OR REPLACE FUNCTION public.retention_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'bookings'
     AND OLD.status IN ('rejected', 'cancelled')
     AND OLD.paid_at IS NULL
     AND OLD.refunded_amount IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.booking_id = OLD.id) THEN
    RETURN OLD;
  END IF;

  IF OLD.created_at > NOW() - INTERVAL '3 years' THEN
    RAISE EXCEPTION 'Trip and payment records are kept for three years (% %)', TG_TABLE_NAME, OLD.id
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.retention_guard() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trips', 'bookings', 'payments', 'wallet_transactions',
    'wallet_topups', 'wallet_withdrawals', 'refund_requests', 'ratings'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_retention_guard ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_retention_guard BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.retention_guard()',
        t
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.wallet_topups
  DROP CONSTRAINT IF EXISTS wallet_topups_user_id_fkey,
  ADD CONSTRAINT wallet_topups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE RESTRICT;

ALTER TABLE public.wallet_withdrawals
  DROP CONSTRAINT IF EXISTS wallet_withdrawals_user_id_fkey,
  ADD CONSTRAINT wallet_withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE RESTRICT;

ALTER TABLE public.trips     ADD COLUMN IF NOT EXISTS anonymised_at TIMESTAMPTZ;
ALTER TABLE public.bookings  ADD COLUMN IF NOT EXISTS anonymised_at TIMESTAMPTZ;
ALTER TABLE public.users     ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.anonymise_old_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cut   TIMESTAMPTZ := NOW() - INTERVAL '3 years';
  v_count INTEGER := 0;
  v_n     INTEGER;
BEGIN
  UPDATE public.bookings
     SET cancel_reason = NULL,
         pickup_location = NULL,
         dropoff_location = NULL,
         anonymised_at = NOW()
   WHERE created_at < v_cut AND anonymised_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;

  UPDATE public.trips
     SET description = NULL,
         from_lat = NULL, from_lng = NULL,
         to_lat = NULL, to_lng = NULL,
         anonymised_at = NOW()
   WHERE created_at < v_cut AND anonymised_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;

  UPDATE public.wallet_topups SET phone = NULL WHERE created_at < v_cut AND phone IS NOT NULL;
  UPDATE public.wallet_withdrawals SET phone = '', failure_reason = NULL WHERE created_at < v_cut AND phone <> '';
  UPDATE public.ratings SET comment = NULL WHERE created_at < v_cut AND comment IS NOT NULL;

  IF to_regclass('public.send_requests') IS NOT NULL THEN
    UPDATE public.send_requests
       SET recipient_name = NULL, recipient_phone = NULL, photo_urls = '{}'
     WHERE created_at < v_cut AND (recipient_phone IS NOT NULL OR recipient_name IS NOT NULL);
  END IF;

  DELETE FROM public.messages m
   USING public.conversations c
   WHERE m.conversation_id = c.id
     AND m.created_at < v_cut;

  DELETE FROM public.conversations c
   WHERE COALESCE(c.last_message_at, c.created_at) < v_cut
     AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = c.id);

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymise_old_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymise_old_records() TO service_role;

CREATE OR REPLACE FUNCTION public.purge_trip_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  IF to_regclass('public.trip_locations') IS NULL THEN
    RETURN 0;
  END IF;
  DELETE FROM public.trip_locations l
   USING public.trips t
   WHERE t.id = l.trip_id
     AND (t.status <> 'in_progress' OR l.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_trip_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_trip_locations() TO service_role;

CREATE OR REPLACE FUNCTION public.erase_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
     SET full_name = 'Deleted user',
         phone = NULL,
         email = NULL,
         avatar_url = NULL,
         push_token = NULL,
         push_platform = NULL,
         erased_at = NOW()
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such user' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.wallet_topups SET phone = NULL WHERE user_id = p_user_id;
  DELETE FROM public.trip_locations WHERE driver_id = p_user_id;

  PERFORM public.record_admin_action('user.erase', 'users', p_user_id::TEXT, '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.erase_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erase_user(UUID) TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('kipita-anonymise-old-records', 'kipita-purge-trip-locations');
  PERFORM cron.schedule('kipita-anonymise-old-records', '15 0 * * *', 'SELECT public.anonymise_old_records()');
  PERFORM cron.schedule('kipita-purge-trip-locations', '*/15 * * * *', 'SELECT public.purge_trip_locations()');
END $$;

COMMIT;
