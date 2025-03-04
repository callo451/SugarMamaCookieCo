import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Package, ShoppingBag, Download, Filter, Search, Calendar, ArrowUpDown, Users as UsersIcon, BarChart, DollarSign, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OrderModal from '../components/OrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';

interface Order {
  id: string;
  customer_email: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
  items: OrderItem[];
  order_details: {
    description: string;
    category: string;
    shape: string;
    specialFonts: string;
    specialInstructions: string;
  };
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  product: {
    name: string;
    image_url: string;
  };
}

type SortField = 'created_at' | 'total_amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
}

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
    orderGrowth: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();
  }, [searchQuery, selectedStatus, dateRange, sortField, sortDirection, minAmount, maxAmount]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters if they exist
      if (searchQuery) {
        query = query.ilike('customer_email', `%${searchQuery}%`);
      }
      if (selectedStatus && selectedStatus.length > 0) {
        query = query.in('status', selectedStatus);
      }
      if (dateRange) {
        if (dateRange[0]) {
          query = query.gte('created_at', dateRange[0].toISOString());
        }
        if (dateRange[1]) {
          query = query.lte('created_at', dateRange[1].toISOString());
        }
      }
      if (minAmount) {
        query = query.gte('total_amount', minAmount);
      }
      if (maxAmount) {
        query = query.lte('total_amount', maxAmount);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              product:products(*)
            `)
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return order;
          }

          return {
            ...order,
            items: items || []
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Get completed orders
      const { data: completedOrders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, customer_email')
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching analytics:', error);
        throw error;
      }

      // Calculate analytics
      const totalRevenue = completedOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = completedOrders?.length || 0;
      const uniqueCustomers = new Set(completedOrders?.map(order => order.customer_email)).size;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setAnalytics({
        totalRevenue,
        totalOrders,
        uniqueCustomers,
        avgOrderValue,
        revenueGrowth: 0,
        orderGrowth: 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const exportOrders = () => {
    type OrderCSV = {
      'Order ID': string;
      'Date': string;
      'Email': string;
      'Status': string;
      'Total': string;
      'Items': string;
      'Shipping Address': string;
    };

    const csvData: OrderCSV[] = orders.map(order => ({
      'Order ID': order.id,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Email': order.customer_email,
      'Status': order.status,
      'Total': order.total_amount.toFixed(2),
      'Items': order.items.map(item => `${item.quantity}x ${item.product.name}`).join(', '),
      'Shipping Address': `${order.shipping_address.street}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country}`
    }));

    const headers = Object.keys(csvData[0]) as (keyof OrderCSV)[];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = [
    {
      name: 'Total Revenue',
      value: `$${analytics.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      change: `${analytics.revenueGrowth?.toFixed(1) || '0'}%`,
      changeType: analytics.revenueGrowth > 0 ? 'positive' : 'negative',
    },
    {
      name: 'Total Orders',
      value: analytics.totalOrders?.toString() || '0',
      icon: Package,
      change: `${analytics.orderGrowth?.toFixed(1) || '0'}%`,
      changeType: analytics.orderGrowth > 0 ? 'positive' : 'negative',
    },
    {
      name: 'Total Customers',
      value: analytics.uniqueCustomers?.toString() || '0', 
      icon: UsersIcon,
      change: 'Lifetime',
      changeType: 'neutral',
    },
    {
      name: 'Average Order Value',
      value: `$${analytics.avgOrderValue?.toFixed(2) || '0.00'}`,
      icon: BarChart,
      change: 'Per Order',
      changeType: 'neutral',
    },
  ];

  const deleteSelectedOrders = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', selectedOrderIds);

      if (itemsError) throw itemsError;

      // Then delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrderIds);

      if (ordersError) throw ordersError;

      setSelectedOrderIds([]);
      fetchOrders();
      fetchAnalytics();
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Admin Navigation */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Admin Portal</h2>
          <div className="flex space-x-4">
            {selectedOrderIds.length > 0 && (
              <button
                onClick={deleteSelectedOrders}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedOrderIds.length})
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage-600 hover:bg-sage-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </button>
            <button
              onClick={exportOrders}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage-600 hover:bg-sage-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Orders
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white p-6 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-sage-50 rounded-lg">
                <stat.icon className="h-6 w-6 text-sage-600" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 
                  stat.changeType === 'negative' ? 'text-red-600' : 
                  'text-gray-600'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange[0]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange([new Date(e.target.value), dateRange[1]])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                  <input
                    type="date"
                    value={dateRange[1]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange([dateRange[0], new Date(e.target.value)])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'processing', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(prev =>
                          prev.includes(status)
                            ? prev.filter(s => s !== status)
                            : [...prev, status]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        selectedStatus.includes(status)
                          ? getStatusColor(status)
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  >
                    <option value="created_at">Date</option>
                    <option value="total_amount">Amount</option>
                    <option value="status">Status</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Orders Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new order or wait for customers to make purchases
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage-600 hover:bg-sage-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </button>
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.length === orders.length && orders.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(orders.map(order => order.id));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                    className="h-4 w-4 text-sage-600 focus:ring-sage-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-gray-50 cursor-pointer" 
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds([...selectedOrderIds, order.id]);
                        } else {
                          setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                        }
                      }}
                      className="h-4 w-4 text-sage-600 focus:ring-sage-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4" onClick={() => {
                    setSelectedOrder(order);
                    setIsDetailsModalOpen(true);
                  }}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {order.items[0]?.product.image_url && (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={order.items[0].product.image_url}
                            alt=""
                          />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Order #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items.length} items
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customer_email}
                    </div>
                    <div className="text-sm text-gray-500">
                      Customer
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOrderCreated={() => {
          fetchOrders();
          fetchAnalytics();
        }}
      />

      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onOrderUpdated={() => {
          fetchOrders();
          fetchAnalytics();
        }}
        onOrderDeleted={() => {
          fetchOrders();
          fetchAnalytics();
        }}
      />
    </div>
  );
}