import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  display_order_id?: string;
  description: string;
}

interface CustomerAggregate {
  email: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: Order[];
}

const currencyFormat = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

const dateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function Customers() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, total_amount, status, customer_name, customer_email, customer_phone, display_order_id, description')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const customers = useMemo(() => {
    const map = new Map<string, CustomerAggregate>();

    orders.forEach((order: any) => {
      const email = (order.customer_email || '').toLowerCase().trim();
      if (!email) return;

      const existing = map.get(email);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += order.total_amount || 0;
        if (order.created_at > existing.lastOrderDate) {
          existing.lastOrderDate = order.created_at;
          existing.name = order.customer_name || existing.name;
          existing.phone = order.customer_phone || existing.phone;
        }
        existing.orders.push(order);
      } else {
        map.set(email, {
          email,
          name: order.customer_name || '',
          phone: order.customer_phone || '',
          totalOrders: 1,
          totalSpent: order.total_amount || 0,
          lastOrderDate: order.created_at,
          orders: [order],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );
  }, [orders]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <span className="inline-flex items-center rounded-full bg-sage-50 px-2.5 py-0.5 text-xs font-medium text-sage-700">
              {customers.length}
            </span>
          </div>
          <p className="mt-1 text-gray-500">Aggregated from order history.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-sage-500 focus:ring-sage-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-400">
              {searchQuery ? 'No customers match your search.' : 'No customers yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-8 px-3 sm:px-4 py-3" />
                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="hidden px-3 sm:px-4 py-3 text-left font-medium text-gray-500 md:table-cell">Phone</th>
                  <th className="px-3 sm:px-4 py-3 text-center font-medium text-gray-500">Orders</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-medium text-gray-500">Total Spent</th>
                  <th className="hidden px-3 sm:px-4 py-3 text-right font-medium text-gray-500 sm:table-cell">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((customer) => {
                  const expanded = expandedEmail === customer.email;
                  return (
                    <CustomerRow
                      key={customer.email}
                      customer={customer}
                      expanded={expanded}
                      onToggle={() =>
                        setExpandedEmail(expanded ? null : customer.email)
                      }
                      onOrderClick={(id) => navigate(`/admin/orders/${id}`)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerRow({
  customer,
  expanded,
  onToggle,
  onOrderClick,
}: {
  customer: CustomerAggregate;
  expanded: boolean;
  onToggle: () => void;
  onOrderClick: (id: string) => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-gray-50"
        onClick={onToggle}
      >
        <td className="px-3 sm:px-4 py-3">
          <Chevron className="h-4 w-4 text-gray-400" />
        </td>
        <td className="px-3 sm:px-4 py-3">
          <p className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">{customer.name || '—'}</p>
          <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{customer.email}</p>
        </td>
        <td className="hidden px-3 sm:px-4 py-3 text-gray-600 md:table-cell">
          {customer.phone || '—'}
        </td>
        <td className="px-3 sm:px-4 py-3 text-center text-gray-900">{customer.totalOrders}</td>
        <td className="px-3 sm:px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
          {currencyFormat.format(customer.totalSpent)}
        </td>
        <td className="hidden px-3 sm:px-4 py-3 text-right text-gray-500 sm:table-cell whitespace-nowrap">
          {dateFormat.format(new Date(customer.lastOrderDate))}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50/50 px-2 sm:px-4 pb-4 pt-1">
            <div className="sm:ml-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Order</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Date</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customer.orders.map((order) => {
                    const statusClass =
                      statusColors[order.status] || statusColors.pending;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          #{order.display_order_id || order.id.slice(0, 8)}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-gray-600">
                          {order.description || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusClass}`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {currencyFormat.format(order.total_amount || 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {dateFormat.format(new Date(order.created_at))}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrderClick(order.id);
                            }}
                            className="text-sage-600 hover:text-sage-700"
                            title="View order"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
