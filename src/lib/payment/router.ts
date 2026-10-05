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
  static async selectGateway(
    context: RouterContext
  ): Promise<RoutingDecision | null> {
    const supabase = createAdminClient();

    try {
      const { data: selectedGatewayId, error: rpcError } = await supabase
        .rpc('select_best_gateway', {
          p_amount: context.amount,
          p_payment_method: context.payment_method,
        });

      if (!rpcError && selectedGatewayId) {
        if (!context.exclude_gateway_ids?.includes(selectedGatewayId)) {
          const { data: gateway, error: gatewayError } = await supabase
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

      if (rpcError) {
        console.error(
          '[PaymentRouter] select_best_gateway RPC error:',
          rpcError
        );
      }

      return await this.selectGatewayFallback(context);
    } catch (error) {
      console.error('[PaymentRouter] selectGateway error:', error);

      return await this.selectGatewayFallback(context);
    }
  }

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

      if (error || !gateways || gateways.length === 0) {
        console.error(
          '[PaymentRouter] No active gateways available:',
          error
        );

        return null;
      }

      const availableGateways = gateways.filter(
        (gateway) =>
          !context.exclude_gateway_ids?.includes(gateway.id)
      );

      if (availableGateways.length === 0) {
        console.error('[PaymentRouter] All gateways are excluded');

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

  private static async evaluateGateway(
    gateway: GatewayConfig,
    context: RouterContext
  ): Promise<RoutingDecision | null> {
    if (
      !this.supportsPaymentMethod(
        gateway,
        context.payment_method
      )
    ) {
      return null;
    }

    if (
      gateway.per_transaction_limit != null &&
      context.amount > gateway.per_transaction_limit
    ) {
      console.log(
        `[PaymentRouter] Gateway ${gateway.code} exceeds per-transaction limit`
      );

      return null;
    }

    const hasCapacity = await this.checkDailyCapacity(
      gateway,
      context.amount
    );

    if (!hasCapacity) {
      console.log(
        `[PaymentRouter] Gateway ${gateway.code} has insufficient daily capacity`
      );

      return null;
    }

    return {
      gateway_id: gateway.id,
      gateway_code: gateway.code as GatewayCode,
      reason:
        'Gateway selected based on priority, payment method support and available daily capacity',
    };
  }

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

  private static async checkDailyCapacity(
    gateway: GatewayConfig,
    amount: number
  ): Promise<boolean> {
    const supabase = createAdminClient();

    try {
      const { data: gatewayConfig, error: gatewayError } =
        await supabase
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

      if (
        gatewayConfig.is_active !== true ||
        gatewayConfig.in_maintenance === true
      ) {
        return false;
      }

      if (
        gatewayConfig.daily_limit == null ||
        Number(gatewayConfig.daily_limit) <= 0
      ) {
        return true;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data: usage, error: usageError } = await supabase
        .from('payment_gateway_usage')
        .select(
          'gateway_id, usage_date, transaction_count, successful_amount, failed_amount'
        )
        .eq('gateway_id', gateway.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (usageError) {
        console.error(
          `[PaymentRouter] Failed to fetch usage for ${gateway.code}`,
          usageError
        );

        return false;
      }

      const usedAmount =
        Number(usage?.successful_amount ?? 0) +
        Number(usage?.failed_amount ?? 0);

      const dailyLimit = Number(gatewayConfig.daily_limit);
      const remainingCapacity = dailyLimit - usedAmount;

      if (remainingCapacity < amount) {
        console.log(
          `[PaymentRouter] ${gateway.code} daily capacity exceeded. ` +
          `Remaining: ${remainingCapacity}, Requested: ${amount}`
        );

        return false;
      }

      if (
        gatewayConfig.warning_threshold != null &&
        remainingCapacity < Number(gatewayConfig.warning_threshold)
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
      const { data: gatewayRow, error: gatewayLookupError } =
        await supabase
          .from('payment_gateways')
          .select('code')
          .eq('id', gatewayId)
          .maybeSingle();

      if (gatewayLookupError) {
        console.error(
          '[PaymentRouter] Failed to resolve gateway code for routing log:',
          gatewayLookupError
        );
      }

      const { error } = await supabase
        .from('payment_routing_logs')
        .insert({
          payment_id: paymentId,
          gateway: gatewayRow?.code ?? gatewayId,
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