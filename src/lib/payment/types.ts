// ============================================================
// Payment Gateway Types
// ============================================================

export type PaymentStatus = 
  | 'created'
  | 'checkout_started'
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded'
  | 'partially_refunded';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'emi';

export type GatewayCode = 'razorpay' | 'cashfree';

export interface GatewayConfig {
  id: string;
  code: GatewayCode;
  name: string;
  is_active: boolean;
  priority: number;
  supports_upi: boolean;
  supports_cards: boolean;
  supports_netbanking: boolean;
  supports_wallets: boolean;
  daily_limit?: number;
  warning_threshold?: number;
  per_transaction_limit?: number;
  in_maintenance: boolean;
}

export interface CreateOrderParams {
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  booking_id?: string;
  combo_booking_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateOrderResult {
  success: boolean;
  gateway_order_id?: string;
  checkout_data?: any;
  error?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  status?: PaymentStatus;
  gateway_payment_id?: string;
  paid_amount?: number;
  error?: string;
}

export interface VerifyPaymentParams {
  gateway_order_id: string;
  gateway_payment_id?: string;
  signature?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  gateway_payment_id?: string;
  error?: string;
}

export interface RefundParams {
  gateway_payment_id: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  gateway_refund_id?: string;
  error?: string;
}

export interface WebhookEvent {
  gateway: GatewayCode;
  event_id: string;
  event_type: string;
  payload: any;
  signature?: string;
}

export interface ProcessWebhookResult {
  success: boolean;
  payment_id?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface GatewayUsage {
  gateway_id: string;
  usage_date: Date;
  transaction_count: number;
  successful_amount: number;
  failed_amount: number;
  remaining_capacity: number;
}

export interface RoutingDecision {
  gateway_id: string;
  gateway_code: GatewayCode;
  reason: string;
}

export interface PaymentAttempt {
  id: string;
  payment_id: string;
  gateway_id: string;
  attempt_number: number;
  status: string;
  gateway_order_id?: string;
  error_code?: string;
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
}
