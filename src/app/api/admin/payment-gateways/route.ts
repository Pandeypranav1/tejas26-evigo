import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { createAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // TODO: Add admin role check

    const supabase = createAdminClient();

    // Get gateways with today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: gateways, error } = await supabase
      .from('payment_gateways')
      .select(`
        *,
        usage:payment_gateway_usage(
          transaction_count,
          successful_amount,
          failed_amount
        )
      `)
      .order('priority', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/payment-gateways] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Calculate remaining capacity for each gateway
    const gatewaysWithCapacity = (gateways || []).map((gateway: any) => {
      const todayUsage = gateway.usage?.[0] || { transaction_count: 0, successful_amount: 0, failed_amount: 0 };
      const remainingCapacity = gateway.daily_limit 
        ? gateway.daily_limit - todayUsage.successful_amount 
        : null;

      return {
        ...gateway,
        today_usage: todayUsage,
        remaining_capacity: remainingCapacity,
      };
    });

    return NextResponse.json({
      success: true,
      gateways: gatewaysWithCapacity,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/payment-gateways] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gateways' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // TODO: Add admin role check

    const body = await request.json();
    const { gateway_id, is_active, priority, daily_limit, warning_threshold, per_transaction_limit, in_maintenance } = body;

    if (!gateway_id) {
      return NextResponse.json(
        { success: false, error: 'Missing gateway_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current gateway values for audit
    const { data: currentGateway } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('id', gateway_id)
      .single();

    if (!currentGateway) {
      return NextResponse.json({ success: false, error: 'Gateway not found' }, { status: 404 });
    }

    // Update gateway
    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (priority !== undefined) updateData.priority = priority;
    if (daily_limit !== undefined) updateData.daily_limit = daily_limit;
    if (warning_threshold !== undefined) updateData.warning_threshold = warning_threshold;
    if (per_transaction_limit !== undefined) updateData.per_transaction_limit = per_transaction_limit;
    if (in_maintenance !== undefined) updateData.in_maintenance = in_maintenance;

    const { data: updatedGateway, error } = await supabase
      .from('payment_gateways')
      .update(updateData)
      .eq('id', gateway_id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/admin/payment-gateways] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Log audit
    await supabase.from('payment_admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'update_gateway',
      target_type: 'payment_gateway',
      target_id: gateway_id,
      old_value: currentGateway,
      new_value: updatedGateway,
    });

    return NextResponse.json({
      success: true,
      gateway: updatedGateway,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/payment-gateways] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update gateway' },
      { status: 500 }
    );
  }
}
