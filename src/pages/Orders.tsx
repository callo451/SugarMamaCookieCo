import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, Download, Filter, Search, Calendar, ArrowUpDown, Users as UsersIcon, BarChart, DollarSign, Plus, Trash2, LogOut } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import OrderModal from '../components/OrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  quantity: number;
  description: string;
  category: string;
  shape: string;
  special_fonts: string;
  special_instructions: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  created_at: string;
  updated_at: string;
  quantity: number;
  unit_price: number;
  description: string;
}

type SortField = 'created_at' | 'total_amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  uniqueCustomers: number;
  avgOrderValue: number;
}

export default function Orders() {
  const location = useLocation();
  const navigate = useNavigate();
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
    avgOrderValue: 0
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
      let query = supabaseAdmin
        .from('orders')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });

      // Apply filters if they exist
      if (searchQuery) {
        query = query.or(`customer_email.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`);
      }
      if (selectedStatus && selectedStatus.length > 0) {
        query = query.in('status', selectedStatus);
      }
      if (dateRange[0]) {
        query = query.gte('created_at', dateRange[0].toISOString());
      }
      if (dateRange[1]) {
        query = query.lte('created_at', dateRange[1].toISOString());
      }
      if (minAmount) {
        query = query.gte('total_amount', parseFloat(minAmount));
      }
      if (maxAmount) {
        query = query.lte('total_amount', parseFloat(maxAmount));
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching order items:', error);
      return [];
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('total_amount, customer_email')
        .eq('status', 'completed');

      if (error) throw error;

      if (data) {
        const totalRevenue = data.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const uniqueCustomers = new Set(data.map(order => order.customer_email)).size;
        
        setAnalytics({
          totalRevenue,
          totalOrders: data.length,
          uniqueCustomers,
          avgOrderValue: data.length > 0 ? totalRevenue / data.length : 0
        });
      }
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
      'Items': order.description,
      'Shipping Address': ''
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
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', {
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
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOrderClick = async (order: Order) => {
    const items = await fetchOrderItems(order.id);
    setSelectedOrder({ ...order, items });
    setIsDetailsModalOpen(true);
  };

  const deleteSelectedOrders = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete order items first
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrderIds[0]);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: ordersError } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', selectedOrderIds[0]);

      if (ordersError) throw ordersError;

      setSelectedOrderIds([]);
      await fetchOrders();
      await fetchAnalytics();
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabaseAdmin.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out. Please try again.');
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
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold">{analytics.totalOrders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Customers</p>
              <p className="text-2xl font-semibold">{analytics.uniqueCustomers}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-2xl font-semibold">{formatCurrency(analytics.avgOrderValue)}</p>
            </div>
            <BarChart className="h-8 w-8 text-orange-500" />
          </div>
        </div>
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
                  {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((status) => (
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
                  onClick={() => handleOrderClick(order)}
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
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-500">{order.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
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