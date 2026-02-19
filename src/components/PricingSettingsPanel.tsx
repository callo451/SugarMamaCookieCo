import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface PricingSettings {
  id?: string;
  base_price: number;
  discount_12: number;
  discount_24: number;
  discount_50: number;
}

export default function PricingSettingsPanel() {
  const [form, setForm] = useState<PricingSettings>({
    base_price: 3.5,
    discount_12: 10,
    discount_24: 20,
    discount_50: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) {
        setForm({
          ...data,
          discount_12: data.discount_12 * 100,
          discount_24: data.discount_24 * 100,
          discount_50: data.discount_50 * 100,
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
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
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Pricing settings saved');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <p className="mb-6 text-sm text-gray-500">
        Set the base price per cookie and bulk discount tiers. These are used in the public Quote Builder.
      </p>

      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Base Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="base_price"
            value={form.base_price}
            onChange={handleChange}
            className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">12+ cookies (%)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              name="discount_12"
              value={form.discount_12}
              onChange={handleChange}
              className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">24+ cookies (%)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              name="discount_24"
              value={form.discount_24}
              onChange={handleChange}
              className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">50+ cookies (%)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              name="discount_50"
              value={form.discount_50}
              onChange={handleChange}
              className="w-full rounded-lg border-gray-200 text-sm focus:border-sage-500 focus:ring-sage-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save Pricing'}
      </button>
    </div>
  );
}
