CREATE OR REPLACE FUNCTION public.open_support_case(
  p_subject TEXT,
  p_detail TEXT,
  p_category TEXT DEFAULT 'general',
  p_booking_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
  v_case UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.support_cases (user_id, booking_id, category, subject, detail)
  VALUES (v_me, p_booking_id, COALESCE(p_category, 'general'), p_subject, p_detail)
  RETURNING id INTO v_case;

  INSERT INTO public.support_case_messages (case_id, author_id, body)
  VALUES (v_case, v_me, p_detail);

  RETURN v_case;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.open_support_case(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_support_case(TEXT, TEXT, TEXT, UUID) TO authenticated;
