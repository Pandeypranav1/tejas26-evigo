// ============================================================
// Payment Router Service
// Handles intelligent gateway selection with failover
// ============================================================

import { createAdminClient } from '@/lib/supabase';

import {
  GatewayConfig,
  GatewayCode,
  PaymentMethod,
  RoutingDecision,
} from './types';

export interface RouterContext {
  amount: number;
  payment_method: PaymentMethod;
  exclude_gateway_ids?: string[];
}

export class PaymentRouter {
  /**
   * Select the best payment gateway.
   *
   * Routing priority:
   * 1. Active gateway
   * 2. Gateway not in maintenance
   * 3. Requested payment method supported
   * 4. Per-transaction limit
   * 5. Daily transaction capacity
   * 6. Gateway priority
   * 7. Lower daily usage
   */
  static async selectGateway(
    context: RouterContext
  ): Promise<RoutingDecision | null> {
    const supabase = createAdminClient();

    try {
      // --------------------------------------------------------
      // First try the database routing function.
      // --------------------------------------------------------

      const { data: selectedGatewayId, error: rpcError } =
        await supabase.rpc('select_best_gateway', {
          p_amount: context.amount,
          p_payment_method: context.payment_method,
        });

      if (!rpcError && selectedGatewayId) {
        // Do not use an excluded gateway.
        if (
          !context.exclude_gateway_ids?.includes(
            selectedGatewayId
          )
        ) {
          const { data: gateway, error: gatewayError } =
            await supabase
              .from('payment_gateways')
              .select('*')
              .eq('id', selectedGatewayId)
              .single();

          if (!gatewayError && gateway) {
            return {
              gateway_id: gateway.id,
              gateway_code: gateway.code as GatewayCode,
              reason:
                'Gateway selected by database routing rules based on priority, payment method, limits and daily usage',
            };
          }
        }
      }

      // --------------------------------------------------------
      // Fallback routing
      // --------------------------------------------------------

      if (rpcError) {
        console.error(
          '[PaymentRouter] select_best_gateway RPC error:',
          rpcError
        );
      }

      return await this.selectGatewayFallback(context);
    } catch (error) {
      console.error(
        '[PaymentRouter] selectGateway error:',
        error
      );

      return await this.selectGatewayFallback(context);
    }
  }

  /**
   * Application-level fallback gateway selection.
   */
  private static async selectGatewayFallback(
    context: RouterContext
  ): Promise<RoutingDecision | null> {
    const supabase = createAdminClient();

    try {
      const { data: gateways, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .eq('in_maintenance', false)
        .order('priority', { ascending: true });

      if (
        error ||
        !gateways ||
        gateways.length === 0
      ) {
        console.error(
          '[PaymentRouter] No active gateways available:',
          error
        );

        return null;
      }

      const availableGateways = gateways.filter(
        (gateway) =>
          !context.exclude_gateway_ids?.includes(
            gateway.id
          )
      );

      if (availableGateways.length === 0) {
        console.error(
          '[PaymentRouter] All gateways are excluded'
        );

        return null;
      }

      for (const gateway of availableGateways) {
        const decision = await this.evaluateGateway(
          gateway as GatewayConfig,
          context
        );

        if (decision) {
          return decision;
        }
      }

      console.error(
        '[PaymentRouter] No gateway matched routing criteria'
      );

      return null;
    } catch (error) {
      console.error(
        '[PaymentRouter] selectGatewayFallback error:',
        error
      );

      return null;
    }
  }

  /**
   * Evaluate a single gateway.
   */
  private static async evaluateGateway(
    gateway: GatewayConfig,
    context: RouterContext
  ): Promise<RoutingDecision | null> {
    // --------------------------------------------------------
    // 1. Payment method support
    // --------------------------------------------------------

    if (
      !this.supportsPaymentMethod(
        gateway,
        context.payment_method
      )
    ) {
      return null;
    }

    // --------------------------------------------------------
    // 2. Per transaction limit
    // --------------------------------------------------------

    if (
      gateway.per_transaction_limit != null &&
      context.amount > gateway.per_transaction_limit
    ) {
      console.log(
        `[PaymentRouter] Gateway ${gateway.code} exceeds per-transaction limit`
      );

      return null;
    }

    // --------------------------------------------------------
    // 3. Daily capacity
    // --------------------------------------------------------

    const hasCapacity =
      await this.checkDailyCapacity(
        gateway,
        context.amount
      );

    if (!hasCapacity) {
      console.log(
        `[PaymentRouter] Gateway ${gateway.code} has insufficient daily capacity`
      );

      return null;
    }

    // --------------------------------------------------------
    // Gateway passed all checks
    // --------------------------------------------------------

    return {
      gateway_id: gateway.id,
      gateway_code: gateway.code as GatewayCode,
      reason:
        'Gateway selected based on priority, payment method support and available daily capacity',
    };
  }

  /**
   * Check whether a gateway supports a payment method.
   */
  private static supportsPaymentMethod(
    gateway: GatewayConfig,
    method: PaymentMethod
  ): boolean {
    switch (method) {
      case 'upi':
        return gateway.supports_upi === true;

      case 'card':
        return gateway.supports_cards === true;

      case 'netbanking':
        return gateway.supports_netbanking === true;

      case 'wallet':
        return gateway.supports_wallets === true;

      case 'emi':
        return gateway.supports_cards === true;

      default:
        return false;
    }
  }

  /**
   * Check daily gateway capacity.
   */
  private static async checkDailyCapacity(
    gateway: GatewayConfig,
    amount: number
  ): Promise<boolean> {
    const supabase = createAdminClient();

    try {
      // --------------------------------------------------------
      // Get gateway limits
      // --------------------------------------------------------

      const {
        data: gatewayConfig,
        error: gatewayError,
      } = await supabase
        .from('payment_gateways')
        .select(
          'code, daily_limit, warning_threshold, per_transaction_limit, is_active, in_maintenance'
        )
        .eq('id', gateway.id)
        .single();

      if (gatewayError || !gatewayConfig) {
        console.error(
          `[PaymentRouter] Failed to fetch gateway config for ${gateway.code}`,
          gatewayError
        );

        return false;
      }

      // Gateway must be active and not under maintenance.
      if (
        gatewayConfig.is_active !== true ||
        gatewayConfig.in_maintenance === true
      ) {
        return false;
      }

      // No daily limit configured.
      if (
        gatewayConfig.daily_limit == null ||
        Number(gatewayConfig.daily_limit) <= 0
      ) {
        return true;
      }

      // --------------------------------------------------------
      // Get today's usage
      // --------------------------------------------------------

      const today = new Date()
        .toISOString()
        .split('T')[0];

      const {
        data: usage,
        error: usageError,
      } = await supabase
        .from('payment_gateway_usage')
        .select(
          'gateway, usage_date, transaction_count, total_amount'
        )
        .eq('gateway', gateway.code)
        .eq('usage_date', today)
        .maybeSingle();

      if (usageError) {
        console.error(
          `[PaymentRouter] Failed to fetch usage for ${gateway.code}`,
          usageError
        );

        return false;
      }

      // No usage row means zero usage today.
      const usedAmount = Number(
        usage?.total_amount ?? 0
      );

      const dailyLimit = Number(
        gatewayConfig.daily_limit
      );

      const remainingCapacity =
        dailyLimit - usedAmount;

      // --------------------------------------------------------
      // Requested payment must fit
      // --------------------------------------------------------

      if (remainingCapacity < amount) {
        console.log(
          `[PaymentRouter] ${gateway.code} daily capacity exceeded. ` +
          `Remaining: ${remainingCapacity}, Requested: ${amount}`
        );

        return false;
      }

      // --------------------------------------------------------
      // Warning threshold
      // --------------------------------------------------------

      if (
        gatewayConfig.warning_threshold != null &&
        remainingCapacity <
        Number(gatewayConfig.warning_threshold)
      ) {
        console.warn(
          `[PaymentRouter] Gateway ${gateway.code} is below warning threshold. ` +
          `Remaining capacity: ${remainingCapacity}`
        );
      }

      return true;
    } catch (error) {
      console.error(
        `[PaymentRouter] checkDailyCapacity error for ${gateway.code}:`,
        error
      );

      return false;
    }
  }

  /**
   * Log routing decision for audit.
   *
   * IMPORTANT:
   * payment_routing_logs uses:
   * - payment_id
   * - gateway
   * - action
   * - reason
   * - success
   * - metadata
   * - attempt_number
   *
   * It does NOT use:
   * - gateway_id
   * - decision_type
   */
  static async logRoutingDecision(
    paymentId: string,
    gatewayId: string,
    decisionType:
      | 'initial_selection'
      | 'failover'
      | 'manual_override'
      | 'maintenance_bypass',
    reason: string,
    attemptNumber: number
  ): Promise<void> {
    const supabase = createAdminClient();

    try {
      // Resolve gateway UUID to gateway code.
      const {
        data: gatewayRow,
        error: gatewayLookupError,
      } = await supabase
        .from('payment_gateways')
        .select('code')
        .eq('id', gatewayId)
        .maybeSingle();

      if (gatewayLookupError) {
        console.error(
          '[PaymentRouter] Failed to resolve gateway code:',
          gatewayLookupError
        );

        return;
      }

      const gatewayCode =
        gatewayRow?.code ?? gatewayId;

      // IMPORTANT:
      // Use the actual columns present in payment_routing_logs.
      const { error } = await supabase
        .from('payment_routing_logs')
        .insert({
          payment_id: paymentId,
          gateway: gatewayCode,
          action: decisionType,
          reason,
          success: true,
          metadata: {
            gateway_id: gatewayId,
            decision_type: decisionType,
            attempt_number: attemptNumber,
          },
          attempt_number: attemptNumber,
        });

      if (error) {
        console.error(
          '[PaymentRouter] Failed to log routing decision:',
          error
        );
      }
    } catch (error) {
      console.error(
        '[PaymentRouter] logRoutingDecision error:',
        error
      );
    }
  }

  /**
   * Get next available gateway for failover.
   *
   * The previous gateway is excluded.
   */
  static async getFailoverGateway(
    context: RouterContext,
    previousGatewayId: string
  ): Promise<RoutingDecision | null> {
    return this.selectGateway({
      ...context,
      exclude_gateway_ids: [
        ...(context.exclude_gateway_ids ?? []),
        previousGatewayId,
      ],
    });
  }
}