DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_case_status') THEN
    CREATE TYPE public.support_case_status AS ENUM ('open', 'awaiting_reply', 'resolved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.support_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status public.support_case_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_cases_user
  ON public.support_cases(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_cases_open
  ON public.support_cases(user_id)
  WHERE status <> 'resolved';

CREATE TABLE IF NOT EXISTS public.support_case_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  from_support BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_case_messages_case
  ON public.support_case_messages(case_id, created_at);

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cases readable by owner" ON public.support_cases;
CREATE POLICY "Cases readable by owner" ON public.support_cases
  FOR SELECT USING (user_id = public.current_app_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Cases opened by owner" ON public.support_cases;
CREATE POLICY "Cases opened by owner" ON public.support_cases
  FOR INSERT WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Cases updated by owner" ON public.support_cases;
CREATE POLICY "Cases updated by owner" ON public.support_cases
  FOR UPDATE USING (user_id = public.current_app_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Case messages readable by owner" ON public.support_case_messages;
CREATE POLICY "Case messages readable by owner" ON public.support_case_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_cases c
       WHERE c.id = case_id
         AND (c.user_id = public.current_app_user_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Case messages written by owner" ON public.support_case_messages;
CREATE POLICY "Case messages written by owner" ON public.support_case_messages
  FOR INSERT WITH CHECK (
    from_support = FALSE
    AND author_id = public.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.support_cases c
       WHERE c.id = case_id
         AND c.user_id = public.current_app_user_id()
         AND c.status <> 'resolved'
    )
  );

CREATE OR REPLACE FUNCTION public.touch_support_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at := NOW();
  ELSIF NEW.status <> 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_support_case ON public.support_cases;
CREATE TRIGGER trg_touch_support_case
  BEFORE UPDATE ON public.support_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_case();

GRANT SELECT, INSERT ON public.support_cases TO authenticated;
GRANT UPDATE (status) ON public.support_cases TO authenticated;
GRANT SELECT, INSERT ON public.support_case_messages TO authenticated;
