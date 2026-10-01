-- ============================================================
-- Evigo Platform — Combo Packs Service Migration
-- Tables: combo_packs, combo_pack_items, combo_bookings, combo_booking_items
-- ============================================================

-- Auto-update updated_at trigger function if not already present
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. COMBO PACKS TABLE
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

-- ─────────────────────────────────────────────────────────────
-- 2. COMBO PACK ITEMS TABLE
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 3. COMBO BOOKINGS TABLE
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 4. COMBO BOOKING ITEMS TABLE
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.combo_packs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_pack_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_booking_items ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS POLICIES
-- ─────────────────────────────────────────────────────────────

-- Combo Packs: Public read active, full access for authenticated/service_role
DROP POLICY IF EXISTS "Public can view active combo packs" ON public.combo_packs;
CREATE POLICY "Public can view active combo packs"
  ON public.combo_packs FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Combo Pack Items: Public read
DROP POLICY IF EXISTS "Public can view combo pack items" ON public.combo_pack_items;
CREATE POLICY "Public can view combo pack items"
  ON public.combo_pack_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Combo Bookings: Users can view own bookings; providers can view bookings containing their items
DROP POLICY IF EXISTS "Users can view own combo bookings" ON public.combo_bookings;
CREATE POLICY "Users can view own combo bookings"
  ON public.combo_bookings FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.combo_booking_items cbi
      JOIN public.providers p ON p.id = cbi.provider_id
      WHERE cbi.combo_booking_id = combo_bookings.id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own combo bookings" ON public.combo_bookings;
CREATE POLICY "Users can create own combo bookings"
  ON public.combo_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can cancel own combo bookings" ON public.combo_bookings;
CREATE POLICY "Users can cancel own combo bookings"
  ON public.combo_bookings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Combo Booking Items: Users can view their booking items; providers can view only assigned items
DROP POLICY IF EXISTS "Users and assigned providers can view combo booking items" ON public.combo_booking_items;
CREATE POLICY "Users and assigned providers can view combo booking items"
  ON public.combo_booking_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.combo_bookings cb
      WHERE cb.id = combo_booking_items.combo_booking_id
        AND cb.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = combo_booking_items.provider_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

-- Providers can update only their assigned combo booking items
DROP POLICY IF EXISTS "Providers can update assigned combo booking items" ON public.combo_booking_items;
CREATE POLICY "Providers can update assigned combo booking items"
  ON public.combo_booking_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = combo_booking_items.provider_id
        AND p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = combo_booking_items.provider_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

-- Grant permissions
GRANT SELECT ON public.combo_packs TO anon, authenticated;
GRANT SELECT ON public.combo_pack_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.combo_bookings TO authenticated;
GRANT SELECT, UPDATE ON public.combo_booking_items TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'combo_bookings'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.combo_bookings';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'combo_booking_items'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.combo_booking_items';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. SEED DATA (Minimal demo combo packs using active providers/partners)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.combo_packs (id, name, slug, description, category, image_url, base_price, discount, final_price, city, duration, is_active)
VALUES
  (
    'c0010001-0000-0000-0000-000000000001',
    'Jamui Heritage & Hill Stay Combo',
    'jamui-heritage-hill-stay-combo',
    'Experience the best of Jamui with full-day inter-city cab pickup, a 2-day guided tour of Simultala & Jain heritage sites, plus a premium 1-night hotel stay with complimentary breakfast.',
    'Travel + Stay',
    '/partners/events/usha_nand/usha_nand_1.png',
    4500,
    700,
    3800,
    'Jamui, Bihar',
    '2 Days / 1 Night',
    false
  ),
  (
    'c0010001-0000-0000-0000-000000000002',
    'Grand Wedding & Reception Combo',
    'grand-wedding-reception-combo',
    'Complete celebration package featuring an air-conditioned banquet hall, premium multi-cuisine catering, professional wedding photography/reels, and sound/DJ system.',
    'Event Combo',
    '/partners/events/genx_brij/genx_brij_1.png',
    75000,
    10000,
    65000,
    'Jamui, Bihar',
    '1 Day / Evening',
    false
  ),
  (
    'c0010001-0000-0000-0000-000000000003',
    'Simultala & Jain Circuit Heritage Trail',
    'simultala-jain-circuit-heritage-trail',
    'Explore Kshatriya Kund Gram, Lachhuar Jain Mandir, and Simultala Hill Station with dedicated local transport and verified heritage guide assistance.',
    'Tourism Package',
    '/tourism/simultala.jpg',
    3200,
    400,
    2800,
    'Jamui, Bihar',
    'Full Day (8 Hours)',
    false
  ),
  (
    'c0010001-0000-0000-0000-000000000004',
    'Patna Airport / Jamui Railway Connect & Stay',
    'patna-airport-jamui-railway-connect-stay',
    'Hassle-free airport or station pickup/drop with FaabCab plus luxury accommodation at GenX Brij Jamui with priority check-in.',
    'Airport/Railway + Stay',
    '/partners/events/jp_grand/jp_grand_1.png',
    5200,
    800,
    4400,
    'Jamui, Bihar',
    '2 Days / 1 Night',
    false
  ),
  (
    'c0010001-0000-0000-0000-000000000005',
    'Spiritual Bihar Discovery Expedition',
    'spiritual-bihar-discovery-expedition',
    'Multi-district pilgrimage & sightseeing trip across Jamui, Gaya & Nalanda with round-trip transport, hotel booking, and verified local guidance.',
    'Trip Combo',
    '/partners/hotel_shagun_vatika.jpeg',
    8900,
    1400,
    7500,
    'Jamui & Gaya, Bihar',
    '3 Days / 2 Nights',
    false
  ),
  (
    'c0010001-0000-0000-0000-000000000006',
    'Custom Weekend Getaway Package',
    'custom-weekend-getaway-package',
    'Tailored weekend leisure package combining customizable cab rentals, handpicked resort/hotel rooms, and bespoke itineraries for family and group travelers.',
    'Custom Combo',
    '/partners/events/nirmala_inn/nirmala_inn_1.png',
    6000,
    1000,
    5000,
    'Jamui, Bihar',
    'Flexible (1-3 Days)',
    false
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  base_price = EXCLUDED.base_price,
  discount = EXCLUDED.discount,
  final_price = EXCLUDED.final_price,
  city = EXCLUDED.city,
  duration = EXCLUDED.duration,
  is_active = EXCLUDED.is_active;

-- Seed items linking to FaabCab provider (6105241d-1d38-4274-b912-eea67f4c32b0)
INSERT INTO public.combo_pack_items (id, combo_pack_id, service_type, service_id, provider_id, quantity, is_required)
VALUES
  -- Jamui Heritage & Hill Stay Combo items
  ('c0020001-0000-0000-0000-000000000001', 'c0010001-0000-0000-0000-000000000001', 'Transport', 'b72bf79e-3b1d-4af6-b326-a0f7940f1901', '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000002', 'c0010001-0000-0000-0000-000000000001', 'Hotel Stay', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000003', 'c0010001-0000-0000-0000-000000000001', 'Heritage Guide', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, false),

  -- Grand Wedding & Reception Combo items
  ('c0020001-0000-0000-0000-000000000004', 'c0010001-0000-0000-0000-000000000002', 'Banquet Hall', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000005', 'c0010001-0000-0000-0000-000000000002', 'Catering', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000006', 'c0010001-0000-0000-0000-000000000002', 'Photography', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000007', 'c0010001-0000-0000-0000-000000000002', 'DJ & Sound', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, false),

  -- Simultala & Jain Circuit items
  ('c0020001-0000-0000-0000-000000000008', 'c0010001-0000-0000-0000-000000000003', 'Transport', '414956e0-95ad-4740-9914-4333c3be21e0', '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000009', 'c0010001-0000-0000-0000-000000000003', 'Heritage Guide', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),

  -- Patna Airport / Jamui Railway items
  ('c0020001-0000-0000-0000-000000000010', 'c0010001-0000-0000-0000-000000000004', 'Airport Transfer', '9303c9f1-3e06-4c6e-bfdc-9423c681e03b', '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000011', 'c0010001-0000-0000-0000-000000000004', 'Hotel Stay', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),

  -- Spiritual Bihar Discovery items
  ('c0020001-0000-0000-0000-000000000012', 'c0010001-0000-0000-0000-000000000005', 'Transport', '414956e0-95ad-4740-9914-4333c3be21e0', '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000013', 'c0010001-0000-0000-0000-000000000005', 'Hotel Stay', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 2, true),

  -- Custom Weekend Getaway items
  ('c0020001-0000-0000-0000-000000000014', 'c0010001-0000-0000-0000-000000000006', 'Transport', 'b72bf79e-3b1d-4af6-b326-a0f7940f1901', '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true),
  ('c0020001-0000-0000-0000-000000000015', 'c0010001-0000-0000-0000-000000000006', 'Hotel Stay', NULL, '6105241d-1d38-4274-b912-eea67f4c32b0', 1, true)
ON CONFLICT (id) DO NOTHING;
