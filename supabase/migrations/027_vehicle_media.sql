INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-media',
  'vehicle-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vehicle-media read" ON storage.objects;
CREATE POLICY "vehicle-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-media');

DROP POLICY IF EXISTS "vehicle-media insert own" ON storage.objects;
CREATE POLICY "vehicle-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP POLICY IF EXISTS "vehicle-media update own" ON storage.objects;
CREATE POLICY "vehicle-media update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP POLICY IF EXISTS "vehicle-media delete own" ON storage.objects;
CREATE POLICY "vehicle-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-media'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP POLICY IF EXISTS "Vehicles own write" ON public.vehicles;
CREATE POLICY "Vehicles own write" ON public.vehicles
  FOR ALL
  USING (driver_id = public.current_app_user_id())
  WITH CHECK (driver_id = public.current_app_user_id());

GRANT SELECT, INSERT, UPDATE ON public.vehicles TO authenticated;
