// ============================================================
// Payment Gateway Adapter Interface
// All gateways must implement this interface
// ============================================================

import {
  CreateOrderParams,
  CreateOrderResult,
  PaymentStatusResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
  WebhookEvent,
  ProcessWebhookResult,
  PaymentMethod,
} from './types';

export interface IPaymentGatewayAdapter {
  /**
   * Create an order with the gateway
   */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;

  /**
   * Get payment status from gateway
   */
  getPaymentStatus(gateway_order_id: string): Promise<PaymentStatusResult>;

  /**
   * Verify payment signature/callback
   */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

  /**
   * Process webhook event
   */
  handleWebhook(event: WebhookEvent): Promise<ProcessWebhookResult>;

  /**
   * Initiate refund
   */
  refundPayment(params: RefundParams): Promise<RefundResult>;

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): PaymentMethod[];

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
