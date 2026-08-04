-- ══════════════════════════════════════════════════════════════
-- 014 — ADMIN-VERIFIED REFUNDS
--
-- Cancelling a paid ride does NOT auto-refund. Instead it opens a
-- `refund_request` (status 'pending') and moves the escrow to
-- 'refund_pending'. An admin then reviews it:
--   • APPROVE → the fare is credited back to the passenger's Kipita wallet
--               and the escrow is marked 'refunded'.
--   • REJECT  → the fare is released to the driver (wallet) as a normal
--               payout and the escrow is marked 'released'.
-- ══════════════════════════════════════════════════════════════

-- Admin flag (gates the refund review screens + resolve-refund fn).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 004 uses column-level SELECT grants on public.users; the app + web
-- admin must be able to read is_admin for the caller's own row, so grant it.
GRANT SELECT (is_admin) ON public.users TO anon, authenticated;

-- Escrow gains a "waiting on admin" state.
ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'refund_pending';

-- Refund request lifecycle.
DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id   UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users(id),
  driver_id    UUID REFERENCES public.users(id),
  amount       NUMERIC(10,2) NOT NULL,
  reason       TEXT,
  status       refund_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES public.users(id),
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one open request per payment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_refund_pending_payment
  ON public.refund_requests(payment_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests(status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Passengers see their own requests…
DROP POLICY IF EXISTS "Passengers read own refunds" ON public.refund_requests;
CREATE POLICY "Passengers read own refunds" ON public.refund_requests
  FOR SELECT USING (
    passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- …admins read them all (drives the review screen). Writes go through the
-- service-role edge functions, so no INSERT/UPDATE policies are needed.
DROP POLICY IF EXISTS "Admins read refunds" ON public.refund_requests;
CREATE POLICY "Admins read refunds" ON public.refund_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );
