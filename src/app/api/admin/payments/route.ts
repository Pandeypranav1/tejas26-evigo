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
    // For now, allow all authenticated users (restrict in production)

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const gateway = searchParams.get('gateway');
    const search = searchParams.get('search');

    const supabase = createAdminClient();
    let query = supabase
      .from('payments')
      .select('*, user:profiles(id, full_name, email, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (gateway) {
      query = query.eq('selected_gateway', gateway);
    }

    if (search) {
      query = query.or(`gateway_order_id.ilike.%${search}%,gateway_payment_id.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('[GET /api/admin/payments] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      payments: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/payments] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
