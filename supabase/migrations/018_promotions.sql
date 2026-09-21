-- ══════════════════════════════════════════════════════════════
-- 018 — PROMOTIONS (discounts & gift cards)
--
-- Admin-curated offers shown in the offers band on /home. Anyone may read
-- offers that are active and inside their date window; only admins can read
-- drafts, scheduled or expired rows, or create / edit / delete. Mirrors the
-- structure of 017_faqs.sql.
--
-- Display-only: nothing here grants or redeems value. Redemption needs a
-- payment surface the web app does not have — apps/web/lib/bookings.ts stops
-- at `pending_payment` and hands off to the mobile app.
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE promotion_kind AS ENUM ('discount', 'gift_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promotion_value_type AS ENUM ('percent', 'amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.promotions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  blurb        TEXT NOT NULL,
  kind         promotion_kind NOT NULL DEFAULT 'discount',
  value_type   promotion_value_type NOT NULL DEFAULT 'percent',
  -- percent: 1-100. amount: whole KES (M-Pesa has no cents in practice).
  value_amount NUMERIC(10,2) NOT NULL,
  code         TEXT,
  -- Must be a member of ToneName in apps/web/lib/theme.ts — the CHECK below
  -- keeps the two lists honest. Add a tone there, add it here.
  tone         TEXT NOT NULL DEFAULT 'green',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  starts_at    TIMESTAMPTZ,   -- NULL = live immediately
  ends_at      TIMESTAMPTZ,   -- NULL = no expiry
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT promotions_value_range CHECK (
    (value_type = 'percent' AND value_amount > 0 AND value_amount <= 100)
    OR (value_type = 'amount' AND value_amount > 0)
  ),
  CONSTRAINT promotions_window CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  CONSTRAINT promotions_tone CHECK (tone IN (
    'green','mint','tan','blue','amber','lav','deep','dark','surface',
    'forest','peach','lilac','lime'
  ))
);

-- One row per title (also makes the seed below idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_title ON public.promotions (title);
-- One code per offer, when a code is used at all.
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_code
  ON public.promotions (code) WHERE code IS NOT NULL;
-- The band's read path: live rows in display order.
CREATE INDEX IF NOT EXISTS idx_promotions_live
  ON public.promotions (sort_order, created_at DESC) WHERE is_active;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public (incl. anonymous) may read live offers only.
DROP POLICY IF EXISTS "Anyone reads live promotions" ON public.promotions;
CREATE POLICY "Anyone reads live promotions" ON public.promotions
  FOR SELECT USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >  NOW())
  );

-- Admins may read everything, including drafts, scheduled and expired rows.
DROP POLICY IF EXISTS "Admins read all promotions" ON public.promotions;
CREATE POLICY "Admins read all promotions" ON public.promotions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

-- Admins may create / edit / delete.
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
CREATE POLICY "Admins manage promotions" ON public.promotions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION public.promotions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.promotions_touch_updated_at();

-- Seed two examples so the band renders on a fresh environment.
INSERT INTO public.promotions (title, blurb, kind, value_type, value_amount, code, tone, sort_order) VALUES
  ('First ride, 20% off', 'New to Kipita? Your first booked seat is 20% off, on any route.', 'discount', 'percent', 20, 'FIRSTRIDE', 'green', 0),
  ('KES 500 gift card', 'Send a friend a ride. They redeem it in the app at checkout.', 'gift_card', 'amount', 500, NULL, 'lilac', 1)
ON CONFLICT (title) DO NOTHING;
