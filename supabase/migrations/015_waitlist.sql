-- ══════════════════════════════════════════════════════════════
-- 015 — LANDING PAGE WAITLIST
--
-- Email capture for the pre-launch waitlist on the marketing site.
-- Anonymous visitors may INSERT their own email (nothing else); only
-- admins can read the list. Duplicate emails are collapsed to a single
-- row via a case-insensitive unique index.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per email, case-insensitive (so "You@x.com" == "you@x.com").
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_email
  ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may add themselves to the waitlist.
-- INSERT-only: they can't read the list back or see other signups.
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Admins can read the full list (for an internal export/dashboard).
DROP POLICY IF EXISTS "Admins read waitlist" ON public.waitlist;
CREATE POLICY "Admins read waitlist" ON public.waitlist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT ON public.waitlist TO authenticated;
