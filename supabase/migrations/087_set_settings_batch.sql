CREATE OR REPLACE FUNCTION public.set_settings(p_values JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_value JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  IF p_values IS NULL OR jsonb_typeof(p_values) <> 'object' THEN
    RAISE EXCEPTION 'Settings must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_values) LOOP
    PERFORM public.set_setting(v_key, v_value);
  END LOOP;

  RETURN p_values;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_settings(JSONB) TO authenticated;
