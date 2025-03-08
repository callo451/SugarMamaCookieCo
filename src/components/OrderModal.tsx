import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface OrderFormData {
  customer_name: string;
  customer_email: string;
  quantity: number;
  description: string;
  category: string;
  shape: string;
  special_fonts: string;
  special_instructions: string;
}

export default function OrderModal({ isOpen, onClose, onOrderCreated }: OrderModalProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: '',
    customer_email: '',
    quantity: 1,
    description: '',
    category: '',
    shape: '',
    special_fonts: '',
    special_instructions: ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BASE_PRICE = 3.50;

  const calculateBulkDiscount = (quantity: number): number => {
    if (quantity >= 50) return 0.30;
    if (quantity >= 24) return 0.20;
    if (quantity >= 12) return 0.10;
    return 0;
  };

  const calculatePrice = (quantity: number): number => {
    const discount = calculateBulkDiscount(quantity);
    const pricePerCookie = BASE_PRICE * (1 - discount);
    return Number((quantity * pricePerCookie).toFixed(2));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value
    }));

    if (name === 'quantity') {
      setTotalPrice(calculatePrice(parseInt(value) || 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the order
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([{
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          status: 'pending',
          total_amount: totalPrice,
          quantity: formData.quantity,
          description: formData.description,
          category: formData.category,
          shape: formData.shape,
          special_fonts: formData.special_fonts,
          special_instructions: formData.special_instructions
        }])
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Create the order item
      const { error: itemError } = await supabaseAdmin
        .from('order_items')
        .insert([{
          order_id: orderData.id,
          quantity: formData.quantity,
          unit_price: BASE_PRICE,
          description: formData.description
        }]);

      if (itemError) {
        console.error('Error creating order item:', itemError);
      }

      onOrderCreated();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  required
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                required
                value={formData.quantity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                placeholder="Describe the cookie design..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                >
                  <option value="">Select a category...</option>
                  <option value="wedding">Wedding</option>
                  <option value="birthday">Birthday</option>
                  <option value="bridal-shower">Bridal Shower</option>
                  <option value="baby-shower">Baby Shower</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shape
                </label>
                <select
                  name="shape"
                  value={formData.shape}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                >
                  <option value="">Select a shape...</option>
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="heart">Heart</option>
                  <option value="star">Star</option>
                  <option value="custom">Custom Shape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Fonts or Text
              </label>
              <textarea
                name="special_fonts"
                value={formData.special_fonts}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                placeholder="Any specific fonts or text for the cookies..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                name="special_instructions"
                value={formData.special_instructions}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage-500 focus:border-sage-500"
                placeholder="Any special instructions or requests..."
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total Price:</span>
                <span className="text-2xl font-bold text-sage-600">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Base price: ${BASE_PRICE.toFixed(2)} per cookie
                {calculateBulkDiscount(formData.quantity) > 0 && (
                  <span className="ml-2">
                    (Bulk discount: {(calculateBulkDiscount(formData.quantity) * 100).toFixed(0)}% off)
                  </span>
                )}
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-sage-600 text-white rounded-md hover:bg-sage-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 