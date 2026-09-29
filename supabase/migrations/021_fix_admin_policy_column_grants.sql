CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE auth_id = auth.uid()
       AND is_admin
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage FAQs"   ON public.faqs;
DROP POLICY IF EXISTS "Admins read all FAQs" ON public.faqs;

CREATE POLICY "Admins read all FAQs" ON public.faqs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins manage FAQs" ON public.faqs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage promotions"   ON public.promotions;
DROP POLICY IF EXISTS "Admins read all promotions" ON public.promotions;

CREATE POLICY "Admins read all promotions" ON public.promotions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins manage promotions" ON public.promotions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read waitlist" ON public.waitlist;

CREATE POLICY "Admins read waitlist" ON public.waitlist
  FOR SELECT USING (public.is_admin());
