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

    const { searchParams } = new URL(request.url);
    const gateway_id = searchParams.get('gateway_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const supabase = createAdminClient();

    let query = supabase
      .from('payment_gateway_usage')
      .select('*, gateway:payment_gateways(*)')
      .order('usage_date', { ascending: false });

    if (gateway_id) {
      query = query.eq('gateway_id', gateway_id);
    }

    if (start_date) {
      query = query.gte('usage_date', start_date);
    }

    if (end_date) {
      query = query.lte('usage_date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/admin/payment-usage] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      usage: data || [],
    });
  } catch (error: any) {
    console.error('[GET /api/admin/payment-usage] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
