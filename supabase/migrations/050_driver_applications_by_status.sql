CREATE OR REPLACE FUNCTION public.driver_applications(p_status public.kyc_status)
RETURNS TABLE (
  user_id         UUID,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  document_type   TEXT,
  document_number TEXT,
  national_id     TEXT,
  license_number  TEXT,
  license_expiry  DATE,
  document_photo  TEXT,
  license_photo   TEXT,
  selfie_photo    TEXT,
  vehicle_photo   TEXT,
  approval_status public.kyc_status,
  waiting_rides   INTEGER,
  submitted_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.user_id, u.full_name, u.avatar_url, u.phone,
         d.document_type, d.document_number, d.national_id, d.license_number, d.license_expiry,
         d.document_photo, d.license_photo, d.selfie_photo, d.vehicle_photo,
         d.approval_status,
         (SELECT count(*)::INTEGER FROM public.trips t
           WHERE t.driver_id = d.user_id AND t.status = 'awaiting_approval'),
         COALESCE(d.updated_at, d.created_at)
    FROM public.driver_profiles d
    JOIN public.users u ON u.id = d.user_id
   WHERE d.approval_status = p_status
   ORDER BY
     CASE WHEN p_status = 'pending' THEN COALESCE(d.updated_at, d.created_at) END ASC,
     COALESCE(d.updated_at, d.created_at) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.driver_applications(public.kyc_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_applications(public.kyc_status) TO authenticated, service_role;
