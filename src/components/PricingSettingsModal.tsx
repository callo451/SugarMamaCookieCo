import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

interface PricingSettings {
  id?: string;
  base_price: number;
  discount_12: number;
  discount_24: number;
  discount_50: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void; // callback after successful save
}

export default function PricingSettingsModal({ isOpen, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PricingSettings>({
    base_price: 3.5,
    discount_12: 10, // percent
    discount_24: 20,
    discount_50: 30,
  });
  const [loading, setLoading] = useState(false);

  // fetch current settings once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<PricingSettings>('pricing_settings')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) {
        // convert decimals to percentage for display
        setForm({
          ...data,
          discount_12: data.discount_12 * 100,
          discount_24: data.discount_24 * 100,
          discount_50: data.discount_50 * 100,
        });
      }
      setLoading(false);
    })();
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSave = async () => {
    setLoading(true);
    // convert percent back to decimal before saving
    const payload = {
      ...form,
      discount_12: form.discount_12 / 100,
      discount_24: form.discount_24 / 100,
      discount_50: form.discount_50 / 100,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('pricing_settings')
      .upsert(payload, { onConflict: 'id' });
    setLoading(false);
    if (error) {
      alert('Failed to save pricing settings: ' + error.message);
    } else {
      onSaved?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
        >
          <h2 className="text-2xl font-bold mb-4">Pricing Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ($)</label>
              <input
                type="number"
                step="0.01"
                name="base_price"
                value={form.base_price}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount ≥ 12 (%)</label>
              <input
                type="number"
                step="0.01"
                name="discount_12"
                value={form.discount_12}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount ≥ 24 (%)</label>
              <input
                type="number"
                step="0.01"
                name="discount_24"
                value={form.discount_24}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount ≥ 50 (%)</label>
              <input
                type="number"
                step="0.01"
                name="discount_50"
                value={form.discount_50}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 rounded bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
