// ============================================================
// Gateway Adapter Factory
// ============================================================

import { IPaymentGatewayAdapter } from '../gateway-adapter';
import { RazorpayAdapter } from './razorpay-adapter';
import { CashfreeAdapter } from './cashfree-adapter';
import { GatewayCode } from '../types';

export function createGatewayAdapter(code: GatewayCode): IPaymentGatewayAdapter {
  switch (code) {
    case 'razorpay':
      return new RazorpayAdapter();
    case 'cashfree':
      return new CashfreeAdapter();
    default:
      throw new Error(`Unsupported gateway: ${code}`);
  }
}
