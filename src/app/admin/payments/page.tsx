'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/Button';
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  selected_gateway: string;
  gateway_order_id: string;
  gateway_payment_id: string;
  payment_method: string;
  created_at: string;
  paid_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

interface Gateway {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  priority: number;
  daily_limit: number;
  today_usage: {
    transaction_count: number;
    successful_amount: number;
    failed_amount: number;
  };
  remaining_capacity: number;
  in_maintenance: boolean;
}

export default function AdminPaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [stats, setStats] = useState({
    totalVolume: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    refundedAmount: 0,
    todayTransactions: 0,
    todayCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, user:profiles(id, full_name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentsData) {
        setPayments(paymentsData as Payment[]);
        calculateStats(paymentsData as Payment[]);
      }

      const { data: gatewaysData } = await fetch('/api/admin/payment-gateways').then(r => r.json());
      if (gatewaysData.success) {
        setGateways(gatewaysData.gateways);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (payments: Payment[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const totalVolume = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const successfulPayments = payments.filter(p => p.status === 'success').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'checkout_started').length;
    
    const refundedPayments = payments.filter(p => p.status === 'refunded' || p.status === 'partially_refunded');
    const refundedAmount = refundedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const todayPayments = payments.filter(p => p.created_at.startsWith(today));
    const todayTransactions = todayPayments.length;
    const todayCollected = todayPayments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    setStats({
      totalVolume,
      successfulPayments,
      failedPayments,
      pendingPayments,
      refundedAmount,
      todayTransactions,
      todayCollected,
    });
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      success: 'bg-green-500',
      failed: 'bg-red-500',
      pending: 'bg-yellow-500',
      checkout_started: 'bg-blue-500',
      refunded: 'bg-purple-500',
      partially_refunded: 'bg-purple-400',
    };
    const color = colorMap[status] || 'bg-gray-500';
    return (
      <span className={`${color} text-white px-2 py-1 rounded text-xs font-medium`}>
        {status}
      </span>
    );
  };

  const toggleGatewayStatus = async (gatewayId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/payment-gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway_id: gatewayId, is_active: !isActive }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling gateway:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor transactions, manage gateways, and view analytics
          </p>
        </div>
        <Button onClick={fetchData} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-2 px-4 ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('gateways')}
            className={`pb-2 px-4 ${activeTab === 'gateways' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Gateways
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p>
                  <p className="text-2xl font-bold mt-1">₹{stats.totalVolume.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">All time</p>
                </div>
                <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Successful Payments</p>
                  <p className="text-2xl font-bold mt-1">{stats.successfulPayments}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {((stats.successfulPayments / Math.max(payments.length, 1)) * 100).toFixed(1)}% success rate
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Today's Transactions</p>
                  <p className="text-2xl font-bold mt-1">{stats.todayTransactions}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    ₹{stats.todayCollected.toLocaleString()} collected
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Refunded Amount</p>
                  <p className="text-2xl font-bold mt-1">₹{stats.refundedAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {payments.filter(p => p.status === 'refunded' || p.status === 'partially_refunded').length} refunds
                  </p>
                </div>
                <RefreshCw className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Latest payment activity</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gateway</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payments.slice(0, 10).map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {payment.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{payment.user?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{payment.user?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        ₹{Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{payment.selected_gateway}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(payment.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">All Transactions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Complete payment history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gateway</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {payment.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{payment.user?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{payment.user?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      ₹{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{payment.selected_gateway}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{payment.payment_method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gateways.map((gateway) => (
            <div key={gateway.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{gateway.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{gateway.code}</p>
                  </div>
                  <Button
                    onClick={() => toggleGatewayStatus(gateway.id, gateway.is_active)}
                    variant={gateway.is_active ? 'primary' : 'secondary'}
                  >
                    {gateway.is_active ? 'Active' : 'Inactive'}
                  </Button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                    <p className="font-medium">{gateway.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="font-medium">
                      {gateway.in_maintenance ? (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">Maintenance</span>
                      ) : (
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Operational</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Daily Limit</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${gateway.daily_limit ? (gateway.today_usage?.successful_amount / gateway.daily_limit) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span>₹{gateway.today_usage?.successful_amount?.toLocaleString() || 0} used</span>
                    <span>₹{gateway.daily_limit?.toLocaleString() || '∞'} limit</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                    <p className="font-medium">{gateway.today_usage?.transaction_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success</p>
                    <p className="font-medium text-green-600">
                      ₹{gateway.today_usage?.successful_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                    <p className="font-medium text-red-600">
                      ₹{gateway.today_usage?.failed_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
