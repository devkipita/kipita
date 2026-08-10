-- ══════════════════════════════════════════════════════════════
-- 017 — HELP CENTRE FAQ
--
-- Editable FAQ entries for the /help page. Anyone may read published
-- entries; only admins can read drafts or create / edit / delete. This
-- lets the help FAQ be maintained from the admin panel instead of code.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.faqs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per question (also makes the seed below idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS uq_faqs_question ON public.faqs (question);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public (incl. anonymous) may read published FAQs.
DROP POLICY IF EXISTS "Anyone reads published FAQs" ON public.faqs;
CREATE POLICY "Anyone reads published FAQs" ON public.faqs
  FOR SELECT USING (is_published);

-- Admins may read everything, including unpublished drafts.
DROP POLICY IF EXISTS "Admins read all FAQs" ON public.faqs;
CREATE POLICY "Admins read all FAQs" ON public.faqs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

-- Admins may create / edit / delete.
DROP POLICY IF EXISTS "Admins manage FAQs" ON public.faqs;
CREATE POLICY "Admins manage FAQs" ON public.faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION public.faqs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON public.faqs;
CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.faqs_touch_updated_at();

-- Seed the existing help-centre questions (no-op if they already exist).
INSERT INTO public.faqs (question, answer, sort_order) VALUES
  ('How does payment work?', 'You pay with M-Pesa when you book. Kipita holds the fare in escrow and only releases it to the driver once your trip is completed — so your money is protected.', 0),
  ('Is my ride safe?', 'Riders and drivers are verified, every trip is rated, and payments are escrow-protected. Share your trip details with a friend any time from the app.', 1),
  ('Can I sign up with my phone number?', 'Yes. Choose the Phone tab on sign in, enter your Kenyan number, and we''ll text you a 6-digit code to verify it.', 2),
  ('How do I become a driver?', 'Create an account, then submit your licence and ID for KYC verification from the app. Once approved, you can start offering seats.', 3),
  ('What if I need to cancel?', 'You can cancel from your bookings. Refunds follow our refund policy — escrow-held fares are returned when eligible.', 4),
  ('How do I change my email or phone?', 'Head to your profile, edit your details, and confirm the change via the code or link we send you.', 5)
ON CONFLICT (question) DO NOTHING;
