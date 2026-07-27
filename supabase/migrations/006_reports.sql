-- ══════════════════════════════════════════
-- REPORTS (lost items, safety issues, reporting a person)
-- ══════════════════════════════════════════
-- A single table backs the "Help & safety" actions on a trip and the "Report"
-- action on a person's profile. `type` distinguishes the flow:
--   lost_item → left something in the vehicle, tied to a booking
--   safety    → a safety concern about a trip
--   user      → reporting a specific driver / passenger
-- reported_user_id / booking_id are nullable so each flow only fills what it has.

CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('lost_item', 'safety', 'user')),
  reason           TEXT,
  description      TEXT NOT NULL,
  contact          TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON public.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS reports_booking_idx  ON public.reports (booking_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- A user can file a report as themselves and read back only their own reports.
-- (Moderation/admin access is handled out-of-band via the service role.)
CREATE POLICY "Reports insert own" ON public.reports
  FOR INSERT
  WITH CHECK (
    reporter_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Reports select own" ON public.reports
  FOR SELECT
  USING (
    reporter_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
