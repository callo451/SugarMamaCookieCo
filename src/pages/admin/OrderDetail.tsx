import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Mail,
  User,
  Cookie,
  FileText,
  DollarSign,
  Calendar,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

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
  display_order_id?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  description: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
  { value: 'confirmed', label: 'Confirmed', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  { value: 'in_progress', label: 'In Progress', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  { value: 'completed', label: 'Completed', className: 'bg-green-50 text-green-700 ring-green-600/20' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-red-600/20' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'bridal-shower', label: 'Bridal Shower' },
  { value: 'baby-shower', label: 'Baby Shower' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' },
];

const SHAPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'custom', label: 'Custom' },
];

const currencyFormat = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const dateFormat = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*, display_order_id').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ]);

      if (orderRes.error) throw orderRes.error;
      setOrder(orderRes.data);
      setEditedOrder(orderRes.data);
      setItems(itemsRes.data || []);
    } catch (err) {
      console.error('Error fetching order:', err);
      toast.error('Order not found');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (updates: Partial<Order>) => {
    if (!order) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
      if (error) throw error;
      setOrder((prev) => (prev ? { ...prev, ...updates } : prev));
      toast.success('Order updated');
    } catch (err) {
      console.error('Error updating order:', err);
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (!editedOrder) return;
    const { name, value } = e.target;
    setEditedOrder({
      ...editedOrder,
      [name]: name === 'total_amount' || name === 'quantity' ? parseFloat(value) || 0 : value,
    });
  };

  const handleBlur = (fieldName: string) => {
    if (!editedOrder || !order) return;
    const oldVal = (order as any)[fieldName];
    const newVal = (editedOrder as any)[fieldName];
    if (oldVal !== newVal) {
      updateOrder({ [fieldName]: newVal });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, status: newStatus as Order['status'] });
    updateOrder({ status: newStatus as Order['status'] });
  };

  const handleDelete = async () => {
    if (!order || !window.confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await supabase.from('order_items').delete().eq('order_id', order.id);
      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('Order deleted');
      navigate('/admin/orders');
    } catch (err) {
      console.error('Error deleting order:', err);
      toast.error('Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setSendingEmail(true);
    try {
      const orderItems = items.length > 0 ? items : await supabase.from('order_items').select('*').eq('order_id', order.id).then(r => r.data || []);

      const { error } = await supabase.functions.invoke('send-order-notification', {
        body: {
          orderData: {
            customer_email: order.customer_email,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            order_number: order.display_order_id || order.id.slice(0, 8),
            order_id: order.id,
            order_date: order.created_at,
            order_total: order.total_amount,
            items: orderItems.map((item: OrderItem) => ({
              product_name: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
            })),
          },
        },
      });

      if (error) throw error;
      toast.success('Confirmation email sent');
    } catch (err) {
      console.error('Error sending email:', err);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-600" />
      </div>
    );
  }

  if (!editedOrder || !order) return null;

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === editedOrder.status) || STATUS_OPTIONS[0];
  const orderId = order.display_order_id || order.id.slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{orderId}</h1>
            <p className="text-sm text-gray-500">{dateFormat.format(new Date(order.created_at))}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status dropdown */}
          <select
            value={editedOrder.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset border-0 cursor-pointer ${statusConfig.className}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={handleResendEmail}
            disabled={sendingEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Resend Email
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>

          {saving && (
            <span className="flex items-center gap-1 text-xs text-sage-600">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Info */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <User className="h-4 w-4 text-sage-500" />
              <h2 className="text-sm font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                <input
                  type="text"
                  name="customer_name"
                  value={editedOrder.customer_name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('customer_name')}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                <input
                  type="email"
                  name="customer_email"
                  value={editedOrder.customer_email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('customer_email')}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={editedOrder.customer_phone || ''}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('customer_phone')}
                  placeholder="—"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
            </div>
          </div>

          {/* Cookie Details */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <Cookie className="h-4 w-4 text-sage-500" />
              <h2 className="text-sm font-semibold text-gray-900">Cookie Details</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                <textarea
                  name="description"
                  value={editedOrder.description || ''}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('description')}
                  rows={3}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
                  <select
                    name="category"
                    value={editedOrder.category || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      updateOrder({ category: e.target.value });
                    }}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Shape</label>
                  <select
                    name="shape"
                    value={editedOrder.shape || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      updateOrder({ shape: e.target.value });
                    }}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                  >
                    {SHAPE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={editedOrder.quantity}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('quantity')}
                    min="1"
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <FileText className="h-4 w-4 text-sage-500" />
              <h2 className="text-sm font-semibold text-gray-900">Special Requests</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Text & Fonts</label>
                <textarea
                  name="special_fonts"
                  value={editedOrder.special_fonts || ''}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('special_fonts')}
                  rows={2}
                  placeholder="No text specified"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Special Instructions</label>
                <textarea
                  name="special_instructions"
                  value={editedOrder.special_instructions || ''}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('special_instructions')}
                  rows={3}
                  placeholder="No special instructions"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pricing */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <DollarSign className="h-4 w-4 text-sage-500" />
              <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-gray-500">Total Amount</label>
                <input
                  type="number"
                  name="total_amount"
                  value={editedOrder.total_amount}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('total_amount')}
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border-gray-200 text-lg font-semibold text-gray-900 focus:border-sage-500 focus:ring-sage-500"
                />
              </div>

              {editedOrder.quantity > 0 && (
                <p className="mb-4 text-sm text-gray-500">
                  {editedOrder.quantity} cookies &times; {currencyFormat.format(editedOrder.total_amount / editedOrder.quantity)} each
                </p>
              )}

              {items.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">Order Items</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {currencyFormat.format(item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <Calendar className="h-4 w-4 text-sage-500" />
              <h2 className="text-sm font-semibold text-gray-900">Timeline</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
                  <Calendar className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{dateFormat.format(new Date(order.created_at))}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Clock className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">{dateFormat.format(new Date(order.updated_at))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
