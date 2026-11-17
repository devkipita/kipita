BEGIN;

CREATE UNLOGGED TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, window_start)
) WITH (fillfactor = 70);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limit_hits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(
  p_bucket TEXT,
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_hits INTEGER;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) NOT BETWEEN 1 AND 64
     OR p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 128
     OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'hit_rate_limit: invalid arguments' USING ERRCODE = '22023';
  END IF;

  v_window_start := to_timestamp(
    (floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds)::double precision
  );

  INSERT INTO public.rate_limit_hits AS r (bucket, key, window_start, hits)
  VALUES (p_bucket, p_key, v_window_start, 1)
  ON CONFLICT ON CONSTRAINT rate_limit_hits_pkey
  DO UPDATE SET hits = LEAST(r.hits + 1, p_limit + 1)
  RETURNING r.hits INTO v_hits;

  allowed := v_hits <= p_limit;
  remaining := GREATEST(p_limit - v_hits, 0);
  reset_at := v_window_start + make_interval(secs => p_window_seconds);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.hit_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

DO $cron$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limit-hits-prune') THEN
    PERFORM cron.unschedule('rate-limit-hits-prune');
  END IF;

  PERFORM cron.schedule(
    'rate-limit-hits-prune',
    '17 * * * *',
    $job$DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day'$job$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable, rate_limit_hits prune job not scheduled: %', SQLERRM;
END;
$cron$;

COMMIT;
