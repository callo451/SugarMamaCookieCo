import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface QuoteFormData {
  quantity: number;
  description: string;
  category: string;
  shape: string;
  specialFonts: string;
  specialInstructions: string;
  customerName: string;
  customerEmail: string;
}

export default function QuoteBuilder() {
  const [formData, setFormData] = useState<QuoteFormData>({
    quantity: 1,
    description: '',
    category: '',
    shape: '',
    specialFonts: '',
    specialInstructions: '',
    customerName: '',
    customerEmail: ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
      setTotalPrice(calculatePrice(formData.quantity));
      setIsCalculating(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.quantity]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);

    try {
      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          total_amount: totalPrice,
          status: 'pending',
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          quantity: formData.quantity,
          description: formData.description,
          category: formData.category,
          shape: formData.shape,
          special_fonts: formData.specialFonts,
          special_instructions: formData.specialInstructions
        }])
        .select('*, display_order_id')
        .single();

      if (orderError) throw orderError;

      // Create the order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert([{
          order_id: orderData.id,
          quantity: formData.quantity,
          unit_price: BASE_PRICE,
          description: formData.description
        }]);

      if (itemError) throw itemError;

      // Prepare payload for admin new order alert
      const adminAlertPayload = {
        orderData: {
          order_id: orderData.id, // The UUID for internal reference
          order_number: orderData.display_order_id, // The new human-readable order number
          customer_name: orderData.customer_name, // From DB
          customer_email: orderData.customer_email, // From DB
          created_at: orderData.created_at, // From DB
          total_amount: orderData.total_amount, // From DB
          delivery_option: "N/A - Quote Builder", // Placeholder
          notes: orderData.special_instructions || "No special instructions provided.", // From DB
          items: [
            {
              product_name: orderData.description, // Main description from the order
              quantity: orderData.quantity,       // Main quantity from the order
              unit_price: orderData.total_amount / orderData.quantity // Calculate unit price if possible
            }
          ]
        }
      };

      // Send admin new order alert
      try {
        console.log('Attempting to send admin new order alert for quote/order ID:', orderData.id);
        const { data: alertData, error: alertError } = await supabase.functions.invoke(
          'send-admin-new-order-alert',
          { body: adminAlertPayload }
        );

        if (alertError) {
          console.error('Error sending admin new order alert from QuoteBuilder:', alertError);
        } else {
          console.log('Admin new order alert from QuoteBuilder sent successfully:', alertData);
        }
      } catch (e) {
        console.error('Exception when trying to send admin new order alert from QuoteBuilder:', e);
      }

      // Prepare payload for customer order confirmation email
      const customerNotificationPayload = {
        orderData: {
          order_id: orderData.id, // UUID
          order_number: orderData.display_order_id, // Human-readable QUXXX number
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          created_at: orderData.created_at,
          total_amount: orderData.total_amount,
          // delivery_option: orderData.delivery_option, // QuoteBuilder doesn't have this
          // notes: orderData.special_instructions, 
          items: [
            {
              product_name: orderData.description, 
              quantity: orderData.quantity,       
              unit_price: orderData.total_amount / orderData.quantity, // Or BASE_PRICE if more appropriate
              total_price: orderData.total_amount
            }
          ]
        }
      };

      // Send customer order confirmation email
      try {
        console.log('Attempting to send customer order confirmation from QuoteBuilder for order ID:', orderData.id);
        const { data: customerEmailData, error: customerEmailError } = await supabase.functions.invoke(
          'send-order-notification',
          { body: customerNotificationPayload }
        );

        if (customerEmailError) {
          console.error('Error sending customer order confirmation email from QuoteBuilder:', customerEmailError);
        } else {
          console.log('Customer order confirmation email from QuoteBuilder sent successfully:', customerEmailData);
        }
      } catch (e) {
        console.error('Exception when trying to send customer order confirmation email from QuoteBuilder:', e);
      }

      toast.success('Quote submitted successfully! We will contact you soon.');
      navigate('/');
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Error submitting quote. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFocus = (fieldName: string) => {
    setFocusedField(fieldName);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-sage-50">
      <motion.div
        className="max-w-3xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1
          className="text-4xl font-bold text-gray-900 mb-2 text-center"
          variants={itemVariants}
        >
          Cookie Quote Builder
        </motion.h1>
        <motion.p
          className="text-center text-gray-600 mb-8"
          variants={itemVariants}
        >
          Design your perfect cookie order
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-sage-100"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <label htmlFor="customerName" className="block text-lg font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              value={formData.customerName}
              onChange={handleInputChange}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="customerEmail" className="block text-lg font-medium text-gray-700 mb-2">
              Your Email
            </label>
            <input
              type="email"
              id="customerEmail"
              name="customerEmail"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              value={formData.customerEmail}
              onChange={handleInputChange}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="category" className="block text-lg font-medium text-gray-700 mb-2">
              Event Category <span className="text-sm text-gray-500">(optional)</span>
            </label>
            <div className="relative">
              <select
                id="category"
                name="category"
                className="appearance-none w-full rounded-lg border-2 border-gray-300 shadow-sm 
                         focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 
                         hover:border-sage-400 py-3 px-4 pr-10 bg-white
                         cursor-pointer"
                value={formData.category}
                onChange={handleInputChange}
                onFocus={() => handleFocus('category')}
                onBlur={handleBlur}
              >
                <option value="" disabled>
                  Select a category...
                </option>
                <option value="wedding">💒 Wedding</option>
                <option value="birthday">🎂 Birthday</option>
                <option value="bridal-shower">👰 Bridal Shower</option>
                <option value="baby-shower">👶 Baby Shower</option>
                <option value="corporate">💼 Corporate Event</option>
                <option value="holiday">🎄 Holiday</option>
                <option value="other">✨ Other</option>
              </select>
              <div
                className={`absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none
                            transition-transform duration-200 ${focusedField === 'category' ? 'transform rotate-180' : ''}`}
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
              <div
                className={`absolute inset-0 rounded-lg pointer-events-none
                            transition-opacity duration-200 ${focusedField === 'category' ? 'ring-2 ring-sage-500 ring-opacity-50' : 'ring-0'}`}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="description" className="block text-lg font-medium text-gray-700 mb-2">
              Cookie Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              placeholder="Describe your dream cookies... (e.g., flavor, color scheme, theme)"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="shape" className="block text-lg font-medium text-gray-700 mb-2">
              Cookie Shape <span className="text-sm text-gray-500">(optional)</span>
            </label>
            <div className="relative">
              <select
                id="shape"
                name="shape"
                className="appearance-none w-full rounded-lg border-2 border-gray-300 shadow-sm 
                         focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 
                         hover:border-sage-400 py-3 px-4 pr-10 bg-white
                         cursor-pointer"
                value={formData.shape}
                onChange={handleInputChange}
                onFocus={() => handleFocus('shape')}
                onBlur={handleBlur}
              >
                <option value="" disabled>
                  Select a shape...
                </option>
                <option value="circle">⭕ Circle</option>
                <option value="square">⬛ Square</option>
                <option value="heart">❤️ Heart</option>
                <option value="star">⭐ Star</option>
                <option value="custom">🎨 Custom Shape</option>
              </select>
              <div
                className={`absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none
                            transition-transform duration-200 ${focusedField === 'shape' ? 'transform rotate-180' : ''}`}
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
              <div
                className={`absolute inset-0 rounded-lg pointer-events-none
                            transition-opacity duration-200 ${focusedField === 'shape' ? 'ring-2 ring-sage-500 ring-opacity-50' : 'ring-0'}`}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="specialFonts" className="block text-lg font-medium text-gray-700 mb-2">
              Special Fonts or Text <span className="text-sm text-gray-500">(optional)</span>
            </label>
            <textarea
              id="specialFonts"
              name="specialFonts"
              rows={2}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              placeholder="Any specific fonts or text you'd like on the cookies? (e.g., names, dates, messages)"
              value={formData.specialFonts}
              onChange={handleInputChange}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <label htmlFor="quantity" className="block text-lg font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              value={formData.quantity}
              onChange={handleInputChange}
              required
            />
            <AnimatePresence>
              {formData.quantity >= 12 && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute -right-4 -top-4 bg-sage-500 text-white px-3 py-1 rounded-full text-sm transform rotate-12"
                >
                  {(calculateBulkDiscount(formData.quantity) * 100).toFixed(0)}% off!
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="specialInstructions" className="block text-lg font-medium text-gray-700 mb-2">
              Additional Special Instructions <span className="text-sm text-gray-500">(optional)</span>
            </label>
            <textarea
              id="specialInstructions"
              name="specialInstructions"
              rows={3}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 transition-all duration-200 hover:border-sage-400"
              placeholder="Any allergies, dietary restrictions, or other special requests? Need specific packaging or delivery instructions?"
              value={formData.specialInstructions}
              onChange={handleInputChange}
            />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-sage-50 to-sage-100 p-6 rounded-xl shadow-inner"
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Price:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={totalPrice}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-3xl font-bold text-sage-700"
                >
                  {isCalculating ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `$${totalPrice.toFixed(2)}`
                  )}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Base price: ${BASE_PRICE.toFixed(2)} per cookie
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-sage-600 hover:bg-sage-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 transition-all duration-200"
            >
              Get Quote
            </button>
          </motion.div>
        </motion.form>
      </motion.div>
    </div>
  );
}
