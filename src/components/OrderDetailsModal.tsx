import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Trash2 } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    created_at: string;
    customer_email: string;
    status: string;
    total_amount: number;
    shipping_address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    order_details: {
      description: string;
      category: string;
      shape: string;
      specialFonts: string;
      specialInstructions: string;
    };
  } | null;
  onOrderUpdated?: () => void;
  onOrderDeleted?: () => void;
}

export default function OrderDetailsModal({ isOpen, onClose, order, onOrderUpdated, onOrderDeleted }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedOrder, setEditedOrder] = useState(order);
  const [currentStatus, setCurrentStatus] = useState(order?.status || '');

  React.useEffect(() => {
    if (order) {
      setEditedOrder(order);
      setCurrentStatus(order.status);
    }
  }, [order]);

  const updateOrder = async (updates: Partial<typeof order>) => {
    if (!order) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabaseAdmin
        .from('orders')
        .update(updates)
        .eq('id', order.id);

      if (error) throw error;

      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteOrder = async () => {
    if (!order || !window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      // Delete order items first
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (orderError) throw orderError;

      if (onOrderDeleted) {
        onOrderDeleted();
      }
      onClose();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    section?: 'shipping_address' | 'order_details'
  ) => {
    if (!editedOrder) return;

    const { name, value } = e.target;
    
    if (section === 'shipping_address') {
      setEditedOrder({
        ...editedOrder,
        shipping_address: {
          ...editedOrder.shipping_address,
          [name]: value
        }
      });
    } else if (section === 'order_details') {
      setEditedOrder({
        ...editedOrder,
        order_details: {
          ...editedOrder.order_details,
          [name]: value
        }
      });
    } else {
      setEditedOrder({
        ...editedOrder,
        [name]: name === 'total_amount' ? parseFloat(value) : value
      });
    }
  };

  const handleBlur = (section?: 'shipping_address' | 'order_details') => {
    if (!editedOrder || !order) return;

    if (section === 'shipping_address') {
      if (JSON.stringify(editedOrder.shipping_address) !== JSON.stringify(order.shipping_address)) {
        updateOrder({ shipping_address: editedOrder.shipping_address });
      }
    } else if (section === 'order_details') {
      if (JSON.stringify(editedOrder.order_details) !== JSON.stringify(order.order_details)) {
        updateOrder({ order_details: editedOrder.order_details });
      }
    } else {
      const updates: any = {};
      if (editedOrder.customer_email !== order.customer_email) {
        updates.customer_email = editedOrder.customer_email;
      }
      if (editedOrder.total_amount !== order.total_amount) {
        updates.total_amount = editedOrder.total_amount;
      }
      if (Object.keys(updates).length > 0) {
        updateOrder(updates);
      }
    }
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

  if (!isOpen || !editedOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={deleteOrder}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Trash2 className="h-6 w-6" />
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Order ID</h3>
                <p className="mt-1 text-sm text-gray-900">{editedOrder.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(editedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Customer Email</h3>
                <input
                  type="email"
                  name="customer_email"
                  value={editedOrder.customer_email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur()}
                  className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={currentStatus}
                    onChange={(e) => {
                      setCurrentStatus(e.target.value);
                      updateOrder({ status: e.target.value });
                    }}
                    disabled={isUpdating}
                    className={`text-sm rounded-full px-2 py-1 ${getStatusColor(currentStatus)} border-0 focus:ring-2 focus:ring-sage-500`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {isUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin text-sage-600" />
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
                <input
                  type="number"
                  name="total_amount"
                  value={editedOrder.total_amount}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur()}
                  step="0.01"
                  min="0"
                  className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Shipping Address</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Street</label>
                  <input
                    type="text"
                    name="street"
                    value={editedOrder.shipping_address.street}
                    onChange={(e) => handleInputChange(e, 'shipping_address')}
                    onBlur={() => handleBlur('shipping_address')}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">City</label>
                    <input
                      type="text"
                      name="city"
                      value={editedOrder.shipping_address.city}
                      onChange={(e) => handleInputChange(e, 'shipping_address')}
                      onBlur={() => handleBlur('shipping_address')}
                      className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">State</label>
                    <input
                      type="text"
                      name="state"
                      value={editedOrder.shipping_address.state}
                      onChange={(e) => handleInputChange(e, 'shipping_address')}
                      onBlur={() => handleBlur('shipping_address')}
                      className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Postal Code</label>
                    <input
                      type="text"
                      name="postal_code"
                      value={editedOrder.shipping_address.postal_code}
                      onChange={(e) => handleInputChange(e, 'shipping_address')}
                      onBlur={() => handleBlur('shipping_address')}
                      className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={editedOrder.shipping_address.country}
                      onChange={(e) => handleInputChange(e, 'shipping_address')}
                      onBlur={() => handleBlur('shipping_address')}
                      className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Order Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Description</label>
                  <textarea
                    name="description"
                    value={editedOrder.order_details.description}
                    onChange={(e) => handleInputChange(e, 'order_details')}
                    onBlur={() => handleBlur('order_details')}
                    rows={3}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={editedOrder.order_details.category}
                    onChange={(e) => handleInputChange(e, 'order_details')}
                    onBlur={() => handleBlur('order_details')}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Shape</label>
                  <input
                    type="text"
                    name="shape"
                    value={editedOrder.order_details.shape}
                    onChange={(e) => handleInputChange(e, 'order_details')}
                    onBlur={() => handleBlur('order_details')}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Special Fonts</label>
                  <input
                    type="text"
                    name="specialFonts"
                    value={editedOrder.order_details.specialFonts}
                    onChange={(e) => handleInputChange(e, 'order_details')}
                    onBlur={() => handleBlur('order_details')}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Special Instructions</label>
                  <textarea
                    name="specialInstructions"
                    value={editedOrder.order_details.specialInstructions}
                    onChange={(e) => handleInputChange(e, 'order_details')}
                    onBlur={() => handleBlur('order_details')}
                    rows={3}
                    className="mt-1 w-full text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 