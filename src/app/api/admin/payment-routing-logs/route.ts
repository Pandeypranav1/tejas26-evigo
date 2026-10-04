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
    const payment_id = searchParams.get('payment_id');
    const gateway_id = searchParams.get('gateway_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createAdminClient();

    let query = supabase
      .from('payment_routing_logs')
      .select('*, gateway:payment_gateways(*), payment:payments(id, amount, status)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (payment_id) {
      query = query.eq('payment_id', payment_id);
    }

    if (gateway_id) {
      query = query.eq('gateway_id', gateway_id);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('[GET /api/admin/payment-routing-logs] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/payment-routing-logs] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch routing logs' },
      { status: 500 }
    );
  }
}
