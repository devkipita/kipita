UPDATE public.platform_settings
   SET value = '6'::jsonb,
       updated_at = NOW()
 WHERE key = 'release_window_hours';
