ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'referral';

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'rewarded', 'void');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id      UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  status          referral_status NOT NULL DEFAULT 'pending',
  referrer_reward NUMERIC(10,2) NOT NULL DEFAULT 0,
  referee_reward  NUMERIC(10,2) NOT NULL DEFAULT 0,
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at     TIMESTAMPTZ,
  CONSTRAINT referral_not_self CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals(referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_pending
  ON public.referrals(referee_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code    TEXT;
  v_base    TEXT;
  v_try     INT := 0;
BEGIN
  v_user_id := COALESCE(p_user_id, public.current_app_user_id());
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  SELECT UPPER(REGEXP_REPLACE(COALESCE(NULLIF(SPLIT_PART(full_name, ' ', 1), ''), 'RIDER'), '[^A-Za-z]', '', 'g'))
    INTO v_base
    FROM public.users WHERE id = v_user_id;

  v_base := SUBSTRING(COALESCE(NULLIF(v_base, ''), 'RIDER') FROM 1 FOR 6);

  LOOP
    v_try := v_try + 1;
    v_code := v_base || SUBSTRING(UPPER(REPLACE(gen_random_uuid()::TEXT, '-', '')) FROM 1 FOR 4);

    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (v_user_id, v_code);
      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_user_id;
        IF v_code IS NOT NULL THEN RETURN v_code; END IF;
        IF v_try > 8 THEN RAISE EXCEPTION 'could not allocate referral code'; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referee  UUID;
  v_referrer UUID;
  v_code     TEXT;
  v_joined   TIMESTAMPTZ;
BEGIN
  v_referee := public.current_app_user_id();
  IF v_referee IS NULL THEN RETURN FALSE; END IF;

  v_code := UPPER(TRIM(p_code));
  IF v_code = '' THEN RETURN FALSE; END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = v_referee) THEN
    RETURN FALSE;
  END IF;

  SELECT user_id INTO v_referrer FROM public.referral_codes WHERE code = v_code;
  IF v_referrer IS NULL OR v_referrer = v_referee THEN RETURN FALSE; END IF;

  SELECT created_at INTO v_joined FROM public.users WHERE id = v_referee;
  IF v_joined < NOW() - INTERVAL '30 days' THEN RETURN FALSE; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE passenger_id = v_referee AND status = 'completed'
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, code)
  VALUES (v_referrer, v_referee, v_code)
  ON CONFLICT (referee_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_referral(
  p_referee_id UUID,
  p_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral       public.referrals%ROWTYPE;
  v_joined         INT;
  v_referrer_award NUMERIC(10,2);
  v_referee_award  NUMERIC(10,2) := 100;
BEGIN
  SELECT * INTO v_referral
    FROM public.referrals
   WHERE referee_id = p_referee_id AND status = 'pending'
     FOR UPDATE;

  IF v_referral.id IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_joined
    FROM public.referrals
   WHERE referrer_id = v_referral.referrer_id AND status = 'rewarded';

  v_referrer_award := CASE
                        WHEN v_joined >= 10 THEN 300
                        WHEN v_joined >= 3  THEN 250
                        ELSE 200
                      END;

  UPDATE public.referrals
     SET status          = 'rewarded',
         referrer_reward = v_referrer_award,
         referee_reward  = v_referee_award,
         booking_id      = COALESCE(p_booking_id, booking_id),
         rewarded_at     = NOW()
   WHERE id = v_referral.id AND status = 'pending';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  PERFORM public.credit_wallet(
    v_referral.referrer_id, v_referrer_award, 'referral',
    v_referral.id::TEXT, 'Referral bonus', p_booking_id
  );

  PERFORM public.credit_wallet(
    v_referral.referee_id, v_referee_award, 'referral',
    v_referral.id::TEXT, 'Welcome bonus', p_booking_id
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_referral.referrer_id, 'payment_success', 'Referral Paid',
    'KES ' || v_referrer_award || ' added to your wallet — your invite took their first ride.',
    jsonb_build_object('referral_id', v_referral.id)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_summary()
RETURNS TABLE (
  code    TEXT,
  joined  INT,
  pending INT,
  earned  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := public.current_app_user_id();
  IF v_user_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    public.ensure_referral_code(v_user_id),
    (SELECT COUNT(*)::INT FROM public.referrals r
      WHERE r.referrer_id = v_user_id AND r.status = 'rewarded'),
    (SELECT COUNT(*)::INT FROM public.referrals r
      WHERE r.referrer_id = v_user_id AND r.status = 'pending'),
    (SELECT COALESCE(SUM(r.referrer_reward), 0)::NUMERIC FROM public.referrals r
      WHERE r.referrer_id = v_user_id AND r.status = 'rewarded');
END;
$$;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referral code own" ON public.referral_codes;
CREATE POLICY "Referral code own" ON public.referral_codes
  FOR SELECT USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Referrals own" ON public.referrals;
CREATE POLICY "Referrals own" ON public.referrals
  FOR SELECT USING (
    referrer_id = public.current_app_user_id()
    OR referee_id = public.current_app_user_id()
    OR public.is_admin()
  );

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referrals      TO authenticated;

REVOKE ALL ON FUNCTION public.convert_referral(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_referral(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.ensure_referral_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.referral_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_summary() TO authenticated;
