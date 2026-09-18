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

-- Done! Verify with:
-- SELECT * FROM public.users LIMIT 5;
-- SELECT * FROM public.page_visits ORDER BY created_at DESC LIMIT 10;
