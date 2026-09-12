import InspirationPhotos from '../../components/customer/InspirationPhotos';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Mail,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import OrderConversation from '../../components/customer/OrderConversation';
import OrderInvoices from '../../components/customer/OrderInvoices';
import { generateOrderPdf } from '../../utils/generateOrderPdf';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  quote_priced: boolean;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  collection_date?: string | null;
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*, display_order_id').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
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
  }, [id, navigate]);

  useEffect(() => { if (id) void fetchOrder(); }, [id, fetchOrder]);

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
      setEditedOrder(order);
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
      [name]: name === 'collection_date' ? (value || null) : name === 'total_amount' || name === 'quantity' ? parseFloat(value) || 0 : value,
    });
  };

  const handleBlur = (fieldName: keyof Order) => {
    if (!editedOrder || !order) return;
    const oldVal = order[fieldName];
    const newVal = editedOrder[fieldName];
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

  const orderId = order.display_order_id || order.id.slice(0, 8);

  const field = (name: keyof Order, label: string, type = 'text') => <label className="order-field" htmlFor={`order-${name}`}><span>{label}</span><input id={`order-${name}`} name={name} type={type} value={String(editedOrder[name] ?? '')} onChange={handleInputChange} onBlur={() => handleBlur(name)} min={name === 'quantity' ? 1 : type === 'number' ? 0 : undefined} step={name === 'total_amount' ? '0.01' : undefined}/></label>;
  const notes = (name: 'description' | 'special_fonts' | 'special_instructions', label: string, rows = 3) => <label className="order-field" htmlFor={`order-${name}`}><span>{label}</span><textarea id={`order-${name}`} name={name} value={editedOrder[name] || ''} onChange={handleInputChange} onBlur={() => handleBlur(name)} rows={rows}/></label>;
  return (
    <motion.div className="order-detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <button className="order-back" onClick={() => navigate('/admin/orders')}><ArrowLeft size={16}/>All orders</button>
      <header className="page-heading order-heading">
        <div><p className="eyebrow">THE ORDER BOOK</p><h1>Order #{orderId}</h1><p className="muted">{order.customer_name} · {order.quantity} cookies</p></div>
        <div className="order-actions">
          <button className="studio-button secondary" disabled={sendingEmail || saving} onClick={handleResendEmail}>{sendingEmail ? <Loader2 size={16} className="animate-spin"/> : <Mail size={16}/>} {sendingEmail ? 'Sending…' : 'Resend confirmation'}</button>
          <button className="studio-button" disabled={exportingPdf || saving} onClick={async () => {
            setExportingPdf(true);
            try { await generateOrderPdf(order, items); }
            catch (error) { toast.error(error instanceof Error ? error.message : 'Could not export PDF. Please try again.'); }
            finally { setExportingPdf(false); }
          }}>{exportingPdf ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>} {exportingPdf ? 'Preparing PDF…' : 'Export PDF'}</button>
        </div>
      </header>
      <div className="order-save-note" role="status">{saving ? <><Loader2 size={14} className="animate-spin"/>Saving changes…</> : 'Changes save when you leave a field.'}</div>
      <div className="order-detail-grid">
        <div className="order-main">
          <section className="studio-panel order-panel"><header><p className="eyebrow">01 / CUSTOMER</p><h2>Who we’re baking for</h2></header><div className="order-fields order-contact">{field('customer_name','Name')}{field('customer_email','Email','email')}{field('customer_phone','Phone','tel')}</div></section>
          <section className="studio-panel order-panel"><header><p className="eyebrow">02 / THE COOKIES</p><h2>Design & details</h2></header><div className="order-fields">
            {notes('description','Design brief',4)}
            <div className="order-three-fields">
              <label className="order-field" htmlFor="order-category"><span>Occasion</span><select id="order-category" name="category" value={editedOrder.category || ''} onChange={e => {handleInputChange(e); void updateOrder({category:e.target.value});}}>{CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
              <label className="order-field" htmlFor="order-shape"><span>Shape</span><select id="order-shape" name="shape" value={editedOrder.shape || ''} onChange={e => {handleInputChange(e); void updateOrder({shape:e.target.value});}}>{SHAPE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
              {field('quantity','Quantity','number')}
            </div>
            {notes('special_fonts','Text & fonts',2)}{notes('special_instructions','Special instructions')}
          </div></section>
          <div className="customer-portal customer-admin order-attachments"><InspirationPhotos key={`photos-${order.id}`} orderId={order.id}/><OrderConversation key={order.id} orderId={order.id}/><OrderInvoices key={`invoices-${order.id}`} orderId={order.id} staff/></div>
        </div>
        <aside className="order-sidebar">
          <section className="studio-panel order-panel"><header><p className="eyebrow">IN THE KITCHEN</p><h2>Progress & collection</h2></header><div className="order-fields">
            <label className="order-field" htmlFor="order-status"><span>Order status</span><select id="order-status" value={editedOrder.status} disabled={saving} onChange={e => handleStatusChange(e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            {field('collection_date','Collection date','date')}<p className="order-help">This date appears on your production board and collection calendar.</p>
          </div></section>
          <section className="studio-panel order-panel order-pricing"><header><p className="eyebrow">THE QUOTE</p><h2>Pricing</h2></header><div className="order-fields">
            {field('total_amount','Total (AUD)','number')}
            {editedOrder.quantity > 0 && <p className="order-help">{editedOrder.quantity} cookies × {currencyFormat.format(editedOrder.total_amount / editedOrder.quantity)} each</p>}
            {items.length > 0 && <ul className="order-items">{items.map(item => <li key={item.id}><div>{item.description}<small>Quantity: {item.quantity}</small></div><strong>{currencyFormat.format(item.unit_price * item.quantity)}</strong></li>)}</ul>}
            <p className="order-help">This total is visible to the customer in their account and PDF.</p>
          </div></section>
          <section className="order-record"><h2>Order record</h2><dl><div><dt>Created</dt><dd>{dateFormat.format(new Date(order.created_at))}</dd></div><div><dt>Last updated</dt><dd>{dateFormat.format(new Date(order.updated_at))}</dd></div></dl></section>
          <div className="order-delete"><button disabled={deleting || saving} onClick={handleDelete}>{deleting ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>} {deleting ? 'Deleting…' : 'Delete order'}</button><p>Permanently remove this order.</p></div>
        </aside>
      </div>
    </motion.div>
  );
}
