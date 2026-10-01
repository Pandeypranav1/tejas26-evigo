-- ============================================================
-- Evigo Platform — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the DB.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USERS TABLE
--    Stores all registered users (clients + providers).
--    Phone is the primary identifier (OTP-based auth).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('client', 'provider')),
  name            TEXT,
  email           TEXT,
  city            TEXT,
  profile_image   TEXT,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 2. PAGE VISITS TABLE
--    Tracks every page view on the Evigo platform.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       TEXT NOT NULL,
  page_path        TEXT NOT NULL,
  page_title       TEXT,
  referrer         TEXT,
  ip_address       TEXT,
  user_agent       TEXT,
  country          TEXT,
  city             TEXT,
  device_type      TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  user_phone       TEXT,            -- nullable: set when user is logged in
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common analytics queries
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at  ON public.page_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id  ON public.page_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path   ON public.page_visits (page_path);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_phone  ON public.page_visits (user_phone);
CREATE INDEX IF NOT EXISTS idx_users_phone             ON public.users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role              ON public.users (role);

-- ─────────────────────────────────────────────────────────────
-- 3. ENABLE ROW LEVEL SECURITY
--    RLS must be enabled on all public-schema tables.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. PROVIDER BOOKABILITY / SERVICE AREA MIGRATION
--    Keep approval status separate from actual booking eligibility.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.providers
  ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] NOT NULL DEFAULT '{}';

-- Only enable a configured platform-managed provider when the business logic intentionally marks it bookable.
-- This does not derive bookability from registration approval.
UPDATE public.providers
SET is_bookable = true
WHERE id = '6105241d-1d38-4274-b912-eea67f4c32b0'
  AND registration_status <> 'rejected';

-- ─────────────────────────────────────────────────────────────
-- 4. RLS POLICIES
--
--    The backend uses the service_role key which bypasses RLS,
--    so these policies only affect direct PostgREST / anon access.
--    We intentionally restrict anon access to both tables.
-- ─────────────────────────────────────────────────────────────

-- Users table: no public access (only service_role can read/write)
CREATE POLICY "No public access to users"
  ON public.users
  FOR ALL
  TO anon, authenticated
  USING (false);

-- Page visits: no public access (only service_role can write)
CREATE POLICY "No public access to page_visits"
  ON public.page_visits
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- 5. GRANT USAGE (required to expose via Data API)
--    The service_role already has full access.
--    We do NOT grant anon/authenticated access to these tables.
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. COMBO PACKS SERVICE TABLES & POLICIES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.combo_packs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  category     TEXT NOT NULL CHECK (category IN (
    'Travel + Stay',
    'Trip Combo',
    'Event Combo',
    'Airport/Railway + Stay',
    'Tourism Package',
    'Custom Combo'
  )),
  image_url    TEXT,
  base_price   NUMERIC NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  discount     NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
  final_price  NUMERIC NOT NULL DEFAULT 0 CHECK (final_price >= 0),
  city         TEXT NOT NULL DEFAULT 'Jamui, Bihar',
  duration     TEXT NOT NULL DEFAULT '1 Day',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combo_packs_category  ON public.combo_packs (category);
CREATE INDEX IF NOT EXISTS idx_combo_packs_is_active ON public.combo_packs (is_active);
CREATE INDEX IF NOT EXISTS idx_combo_packs_slug      ON public.combo_packs (slug);

DROP TRIGGER IF EXISTS set_combo_packs_updated_at ON public.combo_packs;
CREATE TRIGGER set_combo_packs_updated_at
  BEFORE UPDATE ON public.combo_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.combo_pack_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_pack_id  UUID NOT NULL REFERENCES public.combo_packs(id) ON DELETE CASCADE,
  service_type   TEXT NOT NULL,
  service_id     UUID REFERENCES public.services(id) ON DELETE SET NULL,
  provider_id    UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  is_required    BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combo_pack_items_pack_id ON public.combo_pack_items (combo_pack_id);
CREATE INDEX IF NOT EXISTS idx_combo_pack_items_prov_id ON public.combo_pack_items (provider_id);

CREATE TABLE IF NOT EXISTS public.combo_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  combo_pack_id     UUID REFERENCES public.combo_packs(id) ON DELETE SET NULL,
  combo_name        TEXT,
  total_amount      NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  booking_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date        DATE,
  end_date          DATE,
  guest_count       INTEGER DEFAULT 1 CHECK (guest_count >= 1),
  pickup_location   TEXT,
  drop_location     TEXT,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT,
  special_requests  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partially_confirmed',
    'confirmed',
    'rejected',
    'action_required',
    'completed',
    'cancelled'
  )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_combo_bookings_user_id    ON public.combo_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_combo_bookings_pack_id    ON public.combo_bookings (combo_pack_id);
CREATE INDEX IF NOT EXISTS idx_combo_bookings_status     ON public.combo_bookings (status);
CREATE INDEX IF NOT EXISTS idx_combo_bookings_created_at ON public.combo_bookings (created_at DESC);

DROP TRIGGER IF EXISTS set_combo_bookings_updated_at ON public.combo_bookings;
CREATE TRIGGER set_combo_bookings_updated_at
  BEFORE UPDATE ON public.combo_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.combo_booking_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_booking_id         UUID NOT NULL REFERENCES public.combo_bookings(id) ON DELETE CASCADE,
  service_type             TEXT NOT NULL,
  service_id               UUID REFERENCES public.services(id) ON DELETE SET NULL,
  provider_id              UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  provider_name            TEXT,
  provider_booking_status  TEXT NOT NULL DEFAULT 'pending' CHECK (provider_booking_status IN (
    'pending',
    'confirmed',
    'rejected',
    'cancelled',
    'completed'
  )),
  service_status           TEXT NOT NULL DEFAULT 'pending' CHECK (service_status IN (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  )),
  price_snapshot           NUMERIC NOT NULL DEFAULT 0 CHECK (price_snapshot >= 0),
  rejection_reason         TEXT,
  provider_response_at     TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combo_booking_items_booking_id ON public.combo_booking_items (combo_booking_id);
CREATE INDEX IF NOT EXISTS idx_combo_booking_items_prov_id    ON public.combo_booking_items (provider_id);
CREATE INDEX IF NOT EXISTS idx_combo_booking_items_status     ON public.combo_booking_items (provider_booking_status);

DROP TRIGGER IF EXISTS set_combo_booking_items_updated_at ON public.combo_booking_items;
CREATE TRIGGER set_combo_booking_items_updated_at
  BEFORE UPDATE ON public.combo_booking_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.combo_packs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_pack_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_booking_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.combo_packs TO anon, authenticated;
GRANT SELECT ON public.combo_pack_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.combo_bookings TO authenticated;
GRANT SELECT, UPDATE ON public.combo_booking_items TO authenticated;

