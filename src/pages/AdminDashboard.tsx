import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Image,
  Settings,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  display_order_id?: string;
}

interface KpiData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  pendingOrders: number;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const currencyFormat = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

const dateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700 ring-green-600/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-red-600/20' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  confirmed: '#3b82f6',
  in_progress: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

function getDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, customer_name, customer_email, display_order_id')
        .order('created_at', { ascending: false });

      if (data) setAllOrders(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return allOrders;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = getDaysAgo(days);
    return allOrders.filter((o) => new Date(o.created_at) >= cutoff);
  }, [allOrders, dateRange]);

  const kpi = useMemo<KpiData>(() => {
    const completed = filteredOrders.filter((o) => o.status === 'completed');
    const pending = filteredOrders.filter((o) => o.status === 'pending');
    const totalRevenue = completed.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    return {
      totalRevenue,
      totalOrders: filteredOrders.length,
      avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
      pendingOrders: pending.length,
    };
  }, [filteredOrders]);

  // Revenue chart data — daily revenue
  const revenueData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders
      .filter((o) => o.status === 'completed')
      .forEach((o) => {
        const day = new Date(o.created_at).toISOString().split('T')[0];
        map.set(day, (map.get(day) || 0) + (o.total_amount || 0));
      });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(
          new Date(date)
        ),
        revenue,
      }));
  }, [filteredOrders]);

  // Status donut data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, count]) => ({
        name: statusConfig[status]?.label || status,
        value: count,
        color: STATUS_COLORS[status] || '#9ca3af',
      }));
  }, [filteredOrders]);

  const recentOrders = filteredOrders.slice(0, 10);

  const kpiCards = [
    { label: 'Total Revenue', value: currencyFormat.format(kpi.totalRevenue), icon: DollarSign, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Total Orders', value: kpi.totalOrders.toString(), icon: ShoppingBag, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Avg Order Value', value: currencyFormat.format(kpi.avgOrderValue), icon: TrendingUp, iconBg: 'bg-sage-50', iconColor: 'text-sage-600' },
    { label: 'Pending Orders', value: kpi.pendingOrders.toString(), icon: Clock, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your business at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-all duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Order
          </Link>
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <Image className="h-4 w-4" />
            View Gallery
          </Link>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit overflow-x-auto">
        {DATE_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              dateRange === r.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">{card.label}</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue</h2>
          {revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
              No completed orders in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78918a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#78918a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [currencyFormat.format(value), 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#78918a"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Order Status</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
              No orders in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} orders`, name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <Link
            to="/admin/orders"
            className="text-sm font-medium text-sage-600 hover:text-sage-700 flex items-center gap-1 transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders in this period.</p>
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="divide-y divide-gray-50 sm:hidden">
              {recentOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <div
                    key={order.id}
                    className="px-4 py-3 active:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        #{order.display_order_id || order.id.slice(0, 8)}
                      </span>
                      <span className="font-medium text-sm text-gray-900">
                        {currencyFormat.format(order.total_amount || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 truncate mr-2">{order.customer_name}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {dateFormat.format(new Date(order.created_at))}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 px-5 py-3">Order ID</th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">Customer</th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">Status</th>
                    <th className="text-right font-medium text-gray-500 px-5 py-3">Total</th>
                    <th className="text-right font-medium text-gray-500 px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {order.display_order_id || order.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{order.customer_name}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 font-medium">
                          {currencyFormat.format(order.total_amount || 0)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {dateFormat.format(new Date(order.created_at))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
