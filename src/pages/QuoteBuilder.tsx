import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  PartyPopper,
  Heart,
  Baby,
  Briefcase,
  TreePine,
  Sparkles,
  Cake,
  Circle,
  Square,
  Star,
  Hexagon,
  Paintbrush,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface QuoteFormData {
  quantity: number;
  description: string;
  category: string;
  shape: string;
  specialFonts: string;
  specialInstructions: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface CategoryOption {
  value: string;
  label: string;
  icon: React.ElementType;
  colour: string;
}

interface ShapeOption {
  value: string;
  label: string;
  icon: React.ElementType;
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const CATEGORIES: CategoryOption[] = [
  { value: 'wedding', label: 'Wedding', icon: Heart, colour: 'bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-400' },
  { value: 'birthday', label: 'Birthday', icon: Cake, colour: 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400' },
  { value: 'bridal-shower', label: 'Bridal Shower', icon: PartyPopper, colour: 'bg-pink-50 text-pink-600 border-pink-200 hover:border-pink-400' },
  { value: 'baby-shower', label: 'Baby Shower', icon: Baby, colour: 'bg-sky-50 text-sky-600 border-sky-200 hover:border-sky-400' },
  { value: 'corporate', label: 'Corporate', icon: Briefcase, colour: 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400' },
  { value: 'holiday', label: 'Holiday', icon: TreePine, colour: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-400' },
  { value: 'other', label: 'Other', icon: Sparkles, colour: 'bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-400' },
];

const SHAPES: ShapeOption[] = [
  { value: 'circle', label: 'Circle', icon: Circle },
  { value: 'square', label: 'Square', icon: Square },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'hexagon', label: 'Hexagon', icon: Hexagon },
  { value: 'custom', label: 'Custom', icon: Paintbrush },
];

const STEP_LABELS = ['Event', 'Design', 'Details', 'Contact'];

const QUANTITY_PRESETS = [6, 12, 24, 50];

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.22, 1, 0.36, 1],
  duration: 0.4,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function QuoteBuilder() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<QuoteFormData>({
    quantity: 12,
    description: '',
    category: '',
    shape: '',
    specialFonts: '',
    specialInstructions: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  // Pricing
  const DEFAULT_SETTINGS = { base_price: 3.5, discount_12: 0.1, discount_24: 0.2, discount_50: 0.3 };
  const [pricingSettings, setPricingSettings] = useState<typeof DEFAULT_SETTINGS | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) setPricingSettings(data);
    })();
  }, []);

  const getBasePrice = useCallback(
    () => pricingSettings?.base_price ?? DEFAULT_SETTINGS.base_price,
    [pricingSettings],
  );

  const calculateBulkDiscount = useCallback(
    (qty: number): number => {
      const s = pricingSettings ?? DEFAULT_SETTINGS;
      if (qty >= 50) return s.discount_50;
      if (qty >= 24) return s.discount_24;
      if (qty >= 12) return s.discount_12;
      return 0;
    },
    [pricingSettings],
  );

  const calculateUnitPrice = useCallback(
    (qty: number) => Number((getBasePrice() * (1 - calculateBulkDiscount(qty))).toFixed(2)),
    [getBasePrice, calculateBulkDiscount],
  );

  const calculatePrice = useCallback(
    (qty: number) => Number((qty * calculateUnitPrice(qty)).toFixed(2)),
    [calculateUnitPrice],
  );

  const totalPrice = calculatePrice(formData.quantity);
  const discount = calculateBulkDiscount(formData.quantity);

  /* ---- Field helpers ---- */
  const updateField = <K extends keyof QuoteFormData>(key: K, value: QuoteFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    updateField(name as keyof QuoteFormData, value);
  };

  /* ---- Navigation ---- */
  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return true; // category is optional
      case 1:
        return formData.quantity > 0 && formData.description.trim().length > 0;
      case 2:
        return true; // optional fields
      case 3:
        return (
          formData.customerName.trim().length > 0 &&
          formData.customerEmail.trim().length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
        );
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const goToStep = (target: number) => {
    if (target > step && !canAdvance()) return;
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (!canAdvance()) return;
    setIsSubmitting(true);

    try {
      const latestTotalPrice = calculatePrice(formData.quantity);

      const { error: orderError } = await supabase.from('orders').insert([
        {
          total_amount: latestTotalPrice,
          status: 'pending',
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          quantity: formData.quantity,
          description: formData.description,
          category: formData.category,
          shape: formData.shape,
          special_fonts: formData.specialFonts,
          special_instructions: formData.specialInstructions,
        },
      ]);

      if (orderError) throw orderError;

      const now = new Date().toISOString();
      const unitPrice = calculateUnitPrice(formData.quantity);

      // Admin alert (non-blocking)
      supabase.functions
        .invoke('send-admin-new-order-alert', {
          body: {
            orderData: {
              order_number: 'Pending',
              customer_name: formData.customerName,
              customer_email: formData.customerEmail,
              customer_phone: formData.customerPhone,
              created_at: now,
              total_amount: latestTotalPrice,
              delivery_option: 'N/A - Quote Builder',
              notes: formData.specialInstructions || 'No special instructions provided.',
              items: [{ product_name: formData.description, quantity: formData.quantity, unit_price: unitPrice }],
            },
          },
        })
        .catch((e) => console.error('Admin alert error:', e));

      // Customer confirmation (non-blocking)
      supabase.functions
        .invoke('send-order-notification', {
          body: {
            orderData: {
              order_number: 'Pending',
              customer_name: formData.customerName,
              customer_email: formData.customerEmail,
              customer_phone: formData.customerPhone,
              created_at: now,
              total_amount: latestTotalPrice,
              items: [
                {
                  product_name: formData.description,
                  quantity: formData.quantity,
                  unit_price: unitPrice,
                  total_price: latestTotalPrice,
                },
              ],
            },
          },
        })
        .catch((e) => console.error('Customer email error:', e));

      toast.success('Quote submitted successfully! We\'ll be in touch soon.');
      navigate('/');
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step content                                                     */
  /* ---------------------------------------------------------------- */

  const stepContent = [
    /* ---- Step 0: Event ---- */
    <div key="event" className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">
          What's the occasion?
        </h2>
        <p className="mt-2 text-gray-500">
          Select a category so we can tailor your cookies — or skip ahead.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const selected = formData.category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => updateField('category', selected ? '' : cat.value)}
              className={`relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border-2 px-2 py-3 sm:px-4 sm:py-5 transition-all duration-200 ${
                selected
                  ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/20'
                  : `${cat.colour} border`
              }`}
            >
              {selected && (
                <motion.div
                  layoutId="category-check"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sage-500"
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.div>
              )}
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>,

    /* ---- Step 1: Design ---- */
    <div key="design" className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">
          Design your cookies
        </h2>
        <p className="mt-2 text-gray-500">
          Tell us what you're dreaming of and how many you need.
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
          Describe your dream cookies <span className="text-red-400">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="e.g. Pastel pink and gold wedding cookies with floral details…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.description}
          onChange={handleInputChange}
        />
      </div>

      {/* Shape */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Cookie shape</p>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {SHAPES.map((s) => {
            const Icon = s.icon;
            const selected = formData.shape === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => updateField('shape', selected ? '' : s.value)}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-200 ${
                  selected
                    ? 'border-sage-500 bg-sage-500 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-sage-300 hover:bg-sage-50 active:bg-sage-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">
          How many cookies? <span className="text-red-400">*</span>
        </p>

        {/* Preset chips */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {QUANTITY_PRESETS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => updateField('quantity', q)}
              className={`rounded-full border px-2 py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                formData.quantity === q
                  ? 'border-sage-500 bg-sage-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-sage-300'
              }`}
            >
              {q} cookies
            </button>
          ))}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => updateField('quantity', Math.max(1, formData.quantity - 1))}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-sage-400 hover:text-sage-600 active:bg-sage-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.quantity === 0 ? '' : formData.quantity}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') { updateField('quantity', 0); return; }
              if (/^\d+$/.test(v)) updateField('quantity', parseInt(v, 10));
            }}
            className="w-16 sm:w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center text-lg font-semibold text-gray-900 focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          />
          <button
            type="button"
            onClick={() => updateField('quantity', formData.quantity + 1)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-sage-400 hover:text-sage-600 active:bg-sage-50"
          >
            <Plus className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {discount > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="rounded-full bg-sage-100 px-2.5 py-1 text-xs sm:text-sm font-semibold text-sage-700 whitespace-nowrap"
              >
                {(discount * 100).toFixed(0)}% off!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>,

    /* ---- Step 2: Details ---- */
    <div key="details" className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">
          The finer details
        </h2>
        <p className="mt-2 text-gray-500">
          Add any text, fonts, or special requirements — all optional.
        </p>
      </div>

      <div>
        <label htmlFor="specialFonts" className="mb-2 block text-sm font-medium text-gray-700">
          Text on the cookies
        </label>
        <textarea
          id="specialFonts"
          name="specialFonts"
          rows={2}
          placeholder="Names, dates, messages, preferred fonts…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.specialFonts}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label htmlFor="specialInstructions" className="mb-2 block text-sm font-medium text-gray-700">
          Special instructions
        </label>
        <textarea
          id="specialInstructions"
          name="specialInstructions"
          rows={3}
          placeholder="Allergies, dietary needs, packaging, delivery preferences…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.specialInstructions}
          onChange={handleInputChange}
        />
      </div>
    </div>,

    /* ---- Step 3: Contact ---- */
    <div key="contact" className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">
          Almost there!
        </h2>
        <p className="mt-2 text-gray-500">
          Tell us who you are and we'll send your quote.
        </p>
      </div>

      <div>
        <label htmlFor="customerName" className="mb-2 block text-sm font-medium text-gray-700">
          Your name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="customerName"
          name="customerName"
          placeholder="Jane Smith"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.customerName}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label htmlFor="customerEmail" className="mb-2 block text-sm font-medium text-gray-700">
          Email address <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          id="customerEmail"
          name="customerEmail"
          placeholder="jane@example.com"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.customerEmail}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label htmlFor="customerPhone" className="mb-2 block text-sm font-medium text-gray-700">
          Phone number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          id="customerPhone"
          name="customerPhone"
          placeholder="0400 123 456"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.customerPhone}
          onChange={handleInputChange}
        />
      </div>
    </div>,
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sage-50 pt-20 pb-12 sm:pt-24 sm:pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* ---- Progress bar ---- */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(i)}
                className="flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    i < step
                      ? 'bg-sage-500 text-white'
                      : i === step
                        ? 'bg-sage-500 text-white ring-4 ring-sage-500/20'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium ${
                    i <= step ? 'text-sage-700' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Track */}
          <div className="mt-3 sm:mt-4 h-1 rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-sage-500"
              initial={false}
              animate={{ width: `${(step / (STEP_LABELS.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* ---- Step content ---- */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Price summary (visible from step 1 onwards) ---- */}
        <AnimatePresence>
          {step >= 1 && formData.quantity > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 flex flex-col gap-1 rounded-2xl border border-sage-100 bg-sage-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
            >
              <p className="text-xs sm:text-sm text-gray-500">
                {formData.quantity} cookies &times; ${calculateUnitPrice(formData.quantity).toFixed(2)} each
                {discount > 0 && (
                  <span className="ml-1.5 sm:ml-2 text-sage-600 font-medium">({(discount * 100).toFixed(0)}% off)</span>
                )}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={totalPrice}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-xl sm:text-2xl font-bold text-sage-700"
                >
                  ${totalPrice.toFixed(2)}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Navigation buttons ---- */}
        <div className="mt-5 sm:mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-medium transition-all duration-200 ${
              step === 0
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold transition-all duration-200 ${
                canAdvance()
                  ? 'bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance() || isSubmitting}
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold transition-all duration-200 ${
                canAdvance() && !isSubmitting
                  ? 'bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit Quote
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
