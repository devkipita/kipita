CREATE OR REPLACE FUNCTION public.admin_sidebar_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'drivers', (SELECT count(*) FROM public.driver_profiles WHERE approval_status = 'pending'),
    'disputes', (SELECT count(*) FROM public.reports WHERE status = 'open'),
    'problems', (SELECT count(DISTINCT booking_id) FROM public.booking_problems WHERE status = 'open'),
    'payouts', public.admin_payout_count()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_sidebar_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_sidebar_counts() TO authenticated;
