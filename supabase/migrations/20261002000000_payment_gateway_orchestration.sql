-- ============================================================
-- Evigo Payment Gateway Orchestration System
-- Migration: 20261002000000_payment_gateway_orchestration.sql
-- ============================================================

-- Enable pgcrypto for hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable realtime for payment tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_refunds;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_attempts;

-- ============================================================
-- 1. PAYMENT_GATEWAYS TABLE
-- Stores configuration for each payment gateway
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  supports_upi BOOLEAN NOT NULL DEFAULT false,
  supports_cards BOOLEAN NOT NULL DEFAULT false,
  supports_netbanking BOOLEAN NOT NULL DEFAULT false,
  supports_wallets BOOLEAN NOT NULL DEFAULT false,
  daily_limit NUMERIC,
  warning_threshold NUMERIC,
  per_transaction_limit NUMERIC,
  in_maintenance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_code ON public.payment_gateways(code);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON public.payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_priority ON public.payment_gateways(priority);

DROP TRIGGER IF EXISTS set_payment_gateways_updated_at ON public.payment_gateways;
CREATE TRIGGER set_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. PAYMENTS TABLE
-- Central payments table linking to bookings/combo_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  combo_booking_id UUID REFERENCES public.combo_bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created',
    'checkout_started',
    'pending',
    'success',
    'failed',
    'cancelled',
    'refund_pending',
    'refunded',
    'partially_refunded'
  )),
  selected_gateway TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_combo_booking_id ON public.payments(combo_booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. PAYMENT_ATTEMPTS TABLE
-- Tracks each payment attempt with gateway selection
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id),
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'started',
    'order_created',
    'processing',
    'success',
    'failed',
    'timeout'
  )),
  request_reference TEXT,
  gateway_order_id TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON public.payment_attempts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway_id ON public.payment_attempts(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts(status);

-- ============================================================
-- 4. PAYMENT_WEBHOOK_EVENTS TABLE
-- Idempotent webhook event processing
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_unique 
  ON public.payment_webhook_events(gateway, event_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status ON public.payment_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at ON public.payment_webhook_events(created_at DESC);

-- ============================================================
-- 5. PAYMENT_REFUNDS TABLE
-- Tracks refund transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  gateway TEXT NOT NULL,
  gateway_refund_id TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'success',
    'failed'
  )),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON public.payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON public.payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_gateway_refund_id ON public.payment_refunds(gateway_refund_id);

-- ============================================================
-- 6. PAYMENT_GATEWAY_USAGE TABLE
-- Daily usage tracking for each gateway
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateway_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  successful_amount NUMERIC NOT NULL DEFAULT 0,
  failed_amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gateway_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_usage_gateway_date ON public.payment_gateway_usage(gateway_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_usage_date ON public.payment_gateway_usage(usage_date DESC);

-- ============================================================
-- 7. PAYMENT_ROUTING_LOGS TABLE
-- Audit trail for gateway routing decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'initial_selection',
    'failover',
    'manual_override',
    'maintenance_bypass'
  )),
  reason TEXT,
  attempt_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_routing_logs_payment_id ON public.payment_routing_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_routing_logs_gateway_id ON public.payment_routing_logs(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_routing_logs_created_at ON public.payment_routing_logs(created_at DESC);

-- ============================================================
-- 8. PAYMENT_ADMIN_AUDIT_LOG TABLE
-- Audit admin actions on payment system
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_admin_audit_log_admin ON public.payment_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_admin_audit_log_target ON public.payment_admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_payment_admin_audit_log_created_at ON public.payment_admin_audit_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- payment_gateways: No public access (server-side only)
CREATE POLICY "No public access to payment_gateways"
  ON public.payment_gateways
  FOR ALL
  TO anon, authenticated
  USING (false);

-- payments: Clients can view their own payments
CREATE POLICY "Clients can view own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
      AND b.client_id = auth.uid()
    )
  );

-- payments: No insert/update/delete from client (API only)
CREATE POLICY "No client insert on payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client update on payments"
  ON public.payments
  FOR UPDATE
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client delete on payments"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (false);

-- payment_attempts: No public access (server-side only)
CREATE POLICY "No public access to payment_attempts"
  ON public.payment_attempts
  FOR ALL
  TO anon, authenticated
  USING (false);

-- payment_webhook_events: No public access (server-side only)
CREATE POLICY "No public access to payment_webhook_events"
  ON public.payment_webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false);

-- payment_refunds: Clients can view refunds for their payments
CREATE POLICY "Clients can view own refunds"
  ON public.payment_refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_refunds.payment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "No client insert on payment_refunds"
  ON public.payment_refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client update on payment_refunds"
  ON public.payment_refunds
  FOR UPDATE
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client delete on payment_refunds"
  ON public.payment_refunds
  FOR DELETE
  TO authenticated
  USING (false);

-- payment_gateway_usage: No public access (admin only)
CREATE POLICY "No public access to payment_gateway_usage"
  ON public.payment_gateway_usage
  FOR ALL
  TO anon, authenticated
  USING (false);

-- payment_routing_logs: No public access (admin only)
CREATE POLICY "No public access to payment_routing_logs"
  ON public.payment_routing_logs
  FOR ALL
  TO anon, authenticated
  USING (false);

-- payment_admin_audit_log: No public access (admin only)
CREATE POLICY "No public access to payment_admin_audit_log"
  ON public.payment_admin_audit_log
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ============================================================
-- GRANT USAGE
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ============================================================
-- INITIAL GATEWAY DATA
-- ============================================================
INSERT INTO public.payment_gateways (code, name, is_active, priority, supports_upi, supports_cards, supports_netbanking, supports_wallets, daily_limit, warning_threshold, per_transaction_limit)
VALUES 
  ('razorpay', 'Razorpay', true, 1, true, true, true, true, 1000000.00, 800000.00, 100000.00),
  ('cashfree', 'Cashfree', true, 2, true, true, true, true, 1000000.00, 800000.00, 100000.00)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get or create daily usage record for a gateway
CREATE OR REPLACE FUNCTION public.get_or_create_gateway_usage(p_gateway_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO public.payment_gateway_usage (gateway_id, usage_date)
  VALUES (p_gateway_id, p_date)
  ON CONFLICT (gateway_id, usage_date) DO NOTHING
  RETURNING id INTO v_usage_id;
  
  IF v_usage_id IS NULL THEN
    SELECT id INTO v_usage_id
    FROM public.payment_gateway_usage
    WHERE gateway_id = p_gateway_id AND usage_date = p_date;
  END IF;
  
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update gateway usage after a payment
CREATE OR REPLACE FUNCTION public.update_gateway_usage(
  p_gateway_id UUID,
  p_amount NUMERIC,
  p_success BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE public.payment_gateway_usage
  SET 
    transaction_count = transaction_count + 1,
    successful_amount = successful_amount + CASE WHEN p_success THEN p_amount ELSE 0 END,
    failed_amount = failed_amount + CASE WHEN NOT p_success THEN p_amount ELSE 0 END,
    updated_at = now()
  WHERE gateway_id = p_gateway_id AND usage_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REALTIME ENABLEMENT
-- ============================================================
-- Enable realtime for payments table (for client dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Enable realtime for payment_refunds (for client refund status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_refunds;

-- Note: payment_gateway_usage, payment_routing_logs, payment_attempts are admin-only
-- and should not be exposed via realtime to clients
