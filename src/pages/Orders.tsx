import { useState, useEffect } from 'react'; // Removed React as it's implicitly available
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Download, Filter, Search, ArrowUpDown, BarChart, DollarSign, Plus, Trash2, LogOut, Mail, Edit3, Clock } from 'lucide-react'; // Added Edit3 icon
import { supabase, supabaseAdmin } from '../lib/supabase';
import OrderModal from '../components/OrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import PricingSettingsModal from '../components/PricingSettingsModal';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  quantity: number;
  description: string;
  category: string;
  shape: string;
  special_fonts: string;
  special_instructions: string;
  display_order_id?: string; // Human-readable order ID like QU001
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
  avgOrderValue: number;
  pendingOrders?: number; // Added for pending orders count
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
    avgOrderValue: 0,
    pendingOrders: 0 // Initialize pendingOrders
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedOrderForNotification, setSelectedOrderForNotification] = useState<Order | null>(null);

  // State for Email Template Customization
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'orderConfirmation' | 'adminReminder'>('orderConfirmation');
  const [orderConfirmationTemplateHtml, setOrderConfirmationTemplateHtml] = useState('');
  const [adminReminderTemplateHtml, setAdminReminderTemplateHtml] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Default order confirmation template with placeholders
  const DEFAULT_ORDER_CONFIRMATION_TEMPLATE = `
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
      .container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 20px auto; }
      h1 { color: #5a3e36; font-size: 24px; margin-top: 0; }
      p { line-height: 1.6; margin-bottom: 15px; }
      .order-details { margin-top: 20px; margin-bottom: 20px; }
      .order-details strong { display: inline-block; width: 120px; }
      .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; }
      .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
      .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      .items-table th { background-color: #f8f8f8; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Thank you for your order, {{customer_name}}!</h1>
      <p>We're excited to prepare your delicious treats. Your order has been confirmed.</p>
      <div class="order-details">
        <p><strong>Order ID:</strong> #{{order_id}}</p>
        <p><strong>Order Date:</strong> {{order_date}}</p>
        <p><strong>Order Total:</strong> {{order_total}}</p>
      </div>
      <h2 style="font-size: 20px; color: #5a3e36; margin-top: 30px;">Order Summary:</h2>
      {{order_items_table}} 
      <p>We'll notify you again once your order is out for delivery or ready for pickup.</p>
      <div class="footer">
        <p>Thanks for choosing Sugar Mama Cookie Co!</p>
        <p>Sugar Mama Cookie Co | Melbourne, Australia</p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const DEFAULT_ADMIN_REMINDER_TEMPLATE = `
<html>
  <head><title>Order Reminder</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
      h1 { color: #d9534f; }
      p { margin-bottom: 10px; }
      .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
      .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .items-table th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <h1>Admin Reminder: Unacknowledged Order</h1>
    <p>The following order requires attention as it has not been acknowledged or processed in a timely manner:</p>
    <p><strong>Order ID:</strong> #{{order_id}}</p>
    <p><strong>Customer:</strong> {{customer_name}} ({{customer_email}})</p>
    <p><strong>Order Date:</strong> {{order_date}}</p>
    <p><strong>Order Total:</strong> {{order_total}}</p>
    <h2 style="font-size: 1.2em; margin-top: 20px;">Order Items:</h2>
    {{order_items_table}}
    <p style="margin-top: 20px;">Please review this order in the admin panel and update its status accordingly.</p>
  </body>
</html>
  `.trim();

  const loadEmailTemplate = async (templateName: 'orderConfirmation' | 'adminReminder') => {
    console.log(`Loading ${templateName} template from Supabase...`);
    setTemplateLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('html_content')
        .eq('name', templateName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: 'Searched item was not found'
        console.error('Error loading email template:', error);
        if (templateName === 'orderConfirmation') {
          setOrderConfirmationTemplateHtml(DEFAULT_ORDER_CONFIRMATION_TEMPLATE);
        } else {
          setAdminReminderTemplateHtml(DEFAULT_ADMIN_REMINDER_TEMPLATE);
        }
        alert(`Error loading template: ${error.message}`);
      } else if (data && data.html_content) {
        if (templateName === 'orderConfirmation') {
          setOrderConfirmationTemplateHtml(data.html_content);
        } else {
          setAdminReminderTemplateHtml(data.html_content);
        }
        console.log(`${templateName} template loaded from Supabase.`);
      } else {
        // No template found in DB, use default
        console.log(`No '${templateName}' template found in DB, using default.`);
        if (templateName === 'orderConfirmation') {
          setOrderConfirmationTemplateHtml(DEFAULT_ORDER_CONFIRMATION_TEMPLATE);
        } else {
          setAdminReminderTemplateHtml(DEFAULT_ADMIN_REMINDER_TEMPLATE);
        }
      }
    } catch (err) {
      console.error('Unexpected error loading email template:', err);
      if (templateName === 'orderConfirmation') {
        setOrderConfirmationTemplateHtml(DEFAULT_ORDER_CONFIRMATION_TEMPLATE);
      } else {
        setAdminReminderTemplateHtml(DEFAULT_ADMIN_REMINDER_TEMPLATE);
      }
      alert(`An unexpected error occurred while loading the ${templateName} template.`);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleTemplateTabChange = (tab: 'orderConfirmation' | 'adminReminder') => {
    setActiveTemplateTab(tab);
    // Load the template for the selected tab if it's not already loaded or to refresh
    // For simplicity, we can always call loadEmailTemplate, it will use its own loading state
    // and default values if content is not found.
    if (tab === 'orderConfirmation' && !orderConfirmationTemplateHtml) {
        loadEmailTemplate('orderConfirmation');
    } else if (tab === 'adminReminder' && !adminReminderTemplateHtml) {
        loadEmailTemplate('adminReminder');
    }
  };

  const handleSaveTemplate = async () => {
    const templateNameToSave = activeTemplateTab;
    const htmlContentToSave = templateNameToSave === 'orderConfirmation' ? orderConfirmationTemplateHtml : adminReminderTemplateHtml;
    setTemplateSaving(true);
    console.log(`Saving ${templateNameToSave} template to Supabase...`);
    try {
      const { error } = await supabase
        .from('email_templates')
        .upsert(
          { name: templateNameToSave, html_content: htmlContentToSave, updated_at: new Date().toISOString() },
          { onConflict: 'name' } // This ensures it updates if 'name' exists, or inserts if not.
        );

      if (error) {
        console.error('Error saving email template:', error);
        alert(`Error saving template: ${error.message}`);
      } else {
        console.log(`${templateNameToSave} template saved successfully to Supabase.`);
        alert(`${templateNameToSave} template saved successfully!`);
        setIsTemplateModalOpen(false);
      }
    } catch (err) {
      console.error('Unexpected error saving email template:', err);
      alert(`An unexpected error occurred while saving the ${templateNameToSave} template.`);
    } finally {
      setTemplateSaving(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();
    loadEmailTemplate('orderConfirmation'); // Load default active tab template on mount
    // Consider loading the other template in the background or when its tab is clicked for the first time.
  }, [searchQuery, selectedStatus, dateRange, sortField, sortDirection, minAmount, maxAmount]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabaseAdmin
        .from('orders')
        .select('*, display_order_id')
        .order(sortField, { ascending: sortDirection === 'asc' });

      // Apply filters if they exist
      if (searchQuery) {
        query = query.or(`customer_email.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`);
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
      // Query 1: Fetch data for ALL orders (for new Total Orders and new Avg Order Value)
      const { data: allOrdersData, error: allOrdersError } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount'); // Select id for count, total_amount for sum

      if (allOrdersError) {
        console.error('Error fetching all orders data for analytics:', allOrdersError);
      }

      let newTotalOrders = 0;
      let sumOfAllOrderValues = 0;
      let newAvgOrderValue = 0;

      if (allOrdersData) {
        newTotalOrders = allOrdersData.length;
        sumOfAllOrderValues = allOrdersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        newAvgOrderValue = newTotalOrders > 0 ? sumOfAllOrderValues / newTotalOrders : 0;
      }

      // Query 2: Fetch data for COMPLETED orders (for Total Revenue)
      const { data: completedOrdersDataForRevenue, error: completedRevenueError } = await supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed');

      if (completedRevenueError) {
        console.error('Error fetching completed orders data for revenue:', completedRevenueError);
      }

      let totalRevenue = 0;
      if (completedOrdersDataForRevenue) {
        totalRevenue = completedOrdersDataForRevenue.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      }

      // Query 3: Fetch count of PENDING orders (remains the same)
      const { count: pendingOrdersCount, error: pendingError } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error fetching pending orders count:', pendingError);
      }
      
      setAnalytics(prevAnalytics => ({
        ...prevAnalytics,
        totalRevenue, // Based on completed orders
        totalOrders: newTotalOrders, // Based on ALL orders
        avgOrderValue: newAvgOrderValue, // Based on ALL orders
        pendingOrders: pendingOrdersCount || 0,
      }));

    } catch (error) {
      console.error('Generic error in fetchAnalytics:', error);
      setAnalytics({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        pendingOrders: 0,
      });
    }
  };

  const openNotificationModal = (order: Order) => {
    setSelectedOrderForNotification(order);
    setIsNotificationModalOpen(true);
  };

  const closeNotificationModal = () => {
    setSelectedOrderForNotification(null);
    setIsNotificationModalOpen(false);
  };

  const handleSendNotification = async () => {
    if (!selectedOrderForNotification) return;

    setSendingNotification(true);
    try {
      let currentOrderItems = selectedOrderForNotification.items;
      if (!currentOrderItems || currentOrderItems.length === 0) {
        console.log(`Fetching items for order ${selectedOrderForNotification.id} as they were not pre-loaded for notification.`);
        currentOrderItems = await fetchOrderItems(selectedOrderForNotification.id);
        // Optionally update selectedOrderForNotification.items if you want to cache this, but be mindful of state updates
      }

      if (!currentOrderItems || currentOrderItems.length === 0) {
        console.error('Order items could not be fetched or are empty for notification.');
        alert('Error: Could not fetch order items, or order has no items. Please try again.');
        setSendingNotification(false);
        return;
      }

      const orderDataPayload = {
        customer_email: selectedOrderForNotification.customer_email,
        customer_name: selectedOrderForNotification.customer_name || 'Valued Customer',
        customer_phone: selectedOrderForNotification.customer_phone,
        order_number: selectedOrderForNotification.display_order_id || selectedOrderForNotification.id.slice(0,8),
        order_id: selectedOrderForNotification.id, // This is the short ID from the Order interface
        order_date: selectedOrderForNotification.created_at,
        order_total: selectedOrderForNotification.total_amount,
        items: currentOrderItems.map(item => ({
          product_name: item.description, // Use description from OrderItem interface
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price, // Calculate total_price
        }))
      };

      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('send-order-notification', {
        body: { orderData: orderDataPayload },
      });

      if (invokeError) {
        console.error('Error sending notification:', invokeError);
        let errorMessage = invokeError.message;
        if (invokeError.context && typeof invokeError.context === 'object' && invokeError.context.details) {
           // Supabase function errors often have details in invokeError.context.details
           errorMessage += ` Details: ${JSON.stringify(invokeError.context.details)}`;
        } else if (invokeError.details) { // Some errors might have a direct 'details' property
           errorMessage += ` Details: ${JSON.stringify(invokeError.details)}`;
        }
        alert(`Failed to send notification: ${errorMessage}`);
      } else {
        console.log('Notification sent successfully:', invokeData);
        alert('Notification sent successfully!');
        setIsNotificationModalOpen(false);
      }
    } catch (error) { // Catch errors from the try block itself, not just function invocation
      console.error('Overall error in handleSendNotification:', error);
      alert(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSendingNotification(false);
    }
  };

  const exportOrders = () => {
    type OrderCSV = {
      'Order ID': string;
      'Date': string;
      'Email': string;
      'Phone': string;
      'Status': string;
      'Total': string;
      'Items': string;
      'Shipping Address': string;
    };

    const csvData: OrderCSV[] = orders.map(order => ({
      'Order ID': order.display_order_id || order.id,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Email': order.customer_email,
      'Phone': order.customer_phone || '',
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
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Customize Email
            </button>
            {/* Correctly placed Logout Button */}
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
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-2xl font-semibold">{formatCurrency(analytics.avgOrderValue)}</p>
            </div>
            <BarChart className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        {/* Pending Orders Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-semibold">{analytics.pendingOrders ?? 0}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                    <div className="text-sm font-medium text-gray-900">#{order.display_order_id || order.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-500">{order.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                    {order.customer_phone && (
                      <div className="text-xs text-gray-400">{order.customer_phone}</div>
                    )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}
                      className="text-sage-600 hover:text-sage-900"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openNotificationModal(order); }}
                      className="text-blue-600 hover:text-blue-900 ml-4"
                    >
                      <Mail className="h-4 w-4 inline mr-1" /> Resend Confirmation
                    </button>
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

      {/* Notification Modal */}
      {isNotificationModalOpen && selectedOrderForNotification && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Send Order Notification
            </h3>
            <div className="mb-4">
              <p><strong>Order ID:</strong> {selectedOrderForNotification.id}</p>
              <p><strong>Customer:</strong> {selectedOrderForNotification.customer_name} ({selectedOrderForNotification.customer_email}{selectedOrderForNotification.customer_phone ? `, ${selectedOrderForNotification.customer_phone}` : ''})</p>
              <p><strong>Status:</strong> {selectedOrderForNotification.status}</p>
              <p>An email confirmation will be sent to {selectedOrderForNotification.customer_email}.</p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeNotificationModal} // Make sure closeNotificationModal is defined
                disabled={sendingNotification}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sendingNotification}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-blue-400"
              >
                {sendingNotification ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Customization Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
          <div className="relative bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold leading-6 text-gray-900">
                Customize Email Templates
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => handleTemplateTabChange('orderConfirmation')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTemplateTab === 'orderConfirmation'
                      ? 'border-sage-500 text-sage-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Order Confirmation
                </button>
                <button
                  onClick={() => handleTemplateTabChange('adminReminder')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTemplateTab === 'adminReminder'
                      ? 'border-sage-500 text-sage-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Admin Order Reminder
                </button>
              </nav>
            </div>

            {templateLoading && (
              <div className="text-center p-10">
                <p className="text-gray-500">Loading template...</p>
              </div>
            )}
            {!templateLoading && (
            <div className="flex flex-col md:flex-row md:space-x-4">
              {/* Left Pane: Editor */}
              <div className="md:w-1/2 flex flex-col mb-4 md:mb-0">
                <p className="text-sm text-gray-600 mb-1">
                  Edit the HTML for the order confirmation email. Use the following placeholders for dynamic content:
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {activeTemplateTab === 'orderConfirmation'
                    ? 'Edit the HTML for the order confirmation email. Use placeholders:'
                    : 'Edit the HTML for the admin order reminder email. Use placeholders:'}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-500 mb-2 pl-4 bg-gray-50 p-3 rounded-md text-xs">
                  <li><code>{'{{customer_name}}'}</code> - Customer's full name</li>
                  <li><code>{'{{order_id}}'}</code> - Order ID (short version)</li>
                  <li><code>{'{{order_date}}'}</code> - Date of order (e.g., May 29, 2025)</li>
                  <li><code>{'{{order_total}}'}</code> - Total amount of the order (e.g., $25.00)</li>
                  <li><code>{'{{order_items_table}}'}</code> - An HTML table of items in the order</li>
                </ul>
                <textarea
                  value={activeTemplateTab === 'orderConfirmation' ? orderConfirmationTemplateHtml : adminReminderTemplateHtml}
                  onChange={(e) => activeTemplateTab === 'orderConfirmation' ? setOrderConfirmationTemplateHtml(e.target.value) : setAdminReminderTemplateHtml(e.target.value)}
                  rows={20} // Increased rows for better editing experience
                  className="w-full flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500 text-sm font-mono resize-y"
                  placeholder="Enter email HTML here..."
                />
              </div>

              {/* Right Pane: Preview */}
              <div className="md:w-1/2 flex flex-col">
                <p className="text-sm text-gray-600 mb-1">Live Preview:</p>
                <iframe
                  srcDoc={activeTemplateTab === 'orderConfirmation' ? orderConfirmationTemplateHtml : adminReminderTemplateHtml} // Dynamically set the HTML content
                  title="Email Preview"
                  className="w-full flex-grow border border-gray-300 rounded-md bg-white"
                  sandbox="allow-same-origin" // For security, restricts iframe capabilities
                />
              </div>
            </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                disabled={templateSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={templateSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-sage-600 border border-transparent rounded-md shadow-sm hover:bg-sage-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 disabled:opacity-50 disabled:bg-sage-400"
              >
                {templateSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Pricing Settings Button */}
      <button
        type="button"
        onClick={() => setIsPricingModalOpen(true)}
        className="fixed bottom-4 right-4 bg-sage-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-sage-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500"
      >
        Pricing Settings
      </button>
      <PricingSettingsModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSaved={() => {
          fetchOrders();
          fetchAnalytics();
        }}
      />
    </div>
  );
}