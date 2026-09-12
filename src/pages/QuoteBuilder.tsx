import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
import '../quote-wizard.css';
import { prepareQuotePhoto, MAX_QUOTE_PHOTOS, type QuotePhoto } from '../lib/quotePhotos';
import { usePortalAuth } from '../auth/PortalAuth';
import { businessToday } from '../lib/production';
import { errorMessage } from '../lib/customer';
import { validQuoteStep, customerQuoteRequest, type QuoteFormData } from '../lib/quoteWizard';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryOption {
  value: string;
  label: string;
  icon: React.ElementType;
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
  { value: 'wedding', label: 'Wedding', icon: Heart },
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'bridal-shower', label: 'Bridal Shower', icon: PartyPopper },
  { value: 'baby-shower', label: 'Baby Shower', icon: Baby },
  { value: 'corporate', label: 'Corporate', icon: Briefcase },
  { value: 'holiday', label: 'Holiday', icon: TreePine },
  { value: 'other', label: 'Other', icon: Sparkles },
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
const DEFAULT_SETTINGS = { base_price: 3.5, discount_12: 0.1, discount_24: 0.2, discount_50: 0.3 };

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
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  duration: 0.4,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function QuoteBuilder({ embedded = false }: { embedded?: boolean }) {
  const { user, loading: authLoading } = usePortalAuth();
  const [requestId] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [savedQuote, setSavedQuote] = useState<{id:string;account:boolean}|null>(null);
  const [uploadToken] = useState(() => crypto.randomUUID());
  const uploadedSlots = useRef(new Set<number>());
  const photoRef = useRef<QuotePhoto[]>([]);
  useEffect(() => {photoRef.current=photos;}, [photos]);
  useEffect(() => () => photoRef.current.forEach(p=>URL.revokeObjectURL(p.preview)), []);
  async function addPhotos(event:React.ChangeEvent<HTMLInputElement>) {
    const files=Array.from(event.target.files||[]);event.target.value='';setPhotoError('');
    if(files.length+photos.length>MAX_QUOTE_PHOTOS){setPhotoError('You can attach up to three inspiration photos.');return;}
    setPreparingPhotos(true);
    const added:QuotePhoto[]=[];
    try {for(const file of files)added.push(await prepareQuotePhoto(file));setPhotos(current=>[...current,...added]);}
    catch(e){added.forEach(p=>URL.revokeObjectURL(p.preview));setPhotoError(errorMessage(e));}
    finally{setPreparingPhotos(false);}
  }
  async function finishQuote(id:string, account:boolean) {
    for(let i=0;i<photos.length;i++){
      if(uploadedSlots.current.has(i))continue;
      const {error}=await supabase.storage.from('quote-inspiration').upload(`${id}/${uploadToken}/${i+1}.jpg`,photos[i].file,{contentType:'image/jpeg',upsert:false});
      if(error && !('statusCode' in error && String(error.statusCode)==='409'))throw Error('Your quote was received, but a photo could not upload. Keep this page open and choose Retry photo upload below.');
      uploadedSlots.current.add(i);
    }
    if(account){navigate(`/account/orders/${id}`);toast.success('Request sent. Faith will confirm pricing in your portal.');}
    else setSubmitted(true);
  }
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [step, setStep] = useState(0);
  const stepPanel = useRef<HTMLElement>(null);
  const previousStep = useRef(0);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepPanel.current?.scrollIntoView({block:'start',behavior:reduceMotion ? 'auto' : 'smooth'});
    stepPanel.current?.focus({preventScroll:true});
  }, [step, reduceMotion]);
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
    collectionDate: '',
  });

  useEffect(() => {
    if (user?.email) setFormData(prev => ({ ...prev, customerEmail: user.email!, customerName: prev.customerName || (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') }));
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  // Pricing
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
  const validStep = (index: number) => validQuoteStep(formData, index, businessToday());
  const canAdvance = () => validStep(step);

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
    if (target > step && !Array.from({ length: target }, (_, i) => i).every(validStep)) return;
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (![0, 1, 2, 3].every(validStep) || isSubmitting || authLoading || preparingPhotos) return;
    setIsSubmitting(true);

    try {
      if(savedQuote){await finishQuote(savedQuote.id,savedQuote.account);return;}
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.rpc('request_customer_quote', {request: {...customerQuoteRequest(formData, requestId), inspiration_upload_token: uploadToken}});
        if (error) throw error;
        setSavedQuote({id:data,account:true});
        await finishQuote(data,true);
        return;
      }
      if (embedded) throw new Error('Your session expired. Please sign in again before sending your quote.');
      const { error } = await supabase.rpc('request_guest_quote', {request: {
        ...customerQuoteRequest(formData, requestId), email: formData.customerEmail.trim(), inspiration_upload_token: uploadToken,
      }});
      if (error) throw error;
      setSavedQuote({id:requestId,account:false});
      // Database queues confirmation and bakery alert only after the quote is saved.
      await finishQuote(requestId,false);
    } catch (error) {
      console.error('Error submitting quote:', error);
      setPhotoError(errorMessage(error));
      toast.error(errorMessage(error));
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
          What’s the occasion?
        </h2>
        <p className="mt-2 text-gray-500">
          Select a category so we can tailor your cookies — or skip ahead.
        </p>
      </div>

      <div className="qw-occasions">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const selected = formData.category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => updateField('category', selected ? '' : cat.value)}
              aria-pressed={selected}
              className={`qw-occasion ${selected ? 'is-selected' : ''}`}
            >
              <span className="qw-choice-mark" aria-hidden="true">{selected ? <Check size={13}/> : null}</span>
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
          Make them yours.
        </h2>
        <p className="mt-2 text-gray-500">
          Tell us what you're dreaming of and how many you need.
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
          Tell us about your design <span className="text-red-400">*</span>
        </label>
        <textarea
          aria-describedby="description-help"
          id="description"
          name="description"
          maxLength={4000}
          rows={3}
          placeholder="e.g. Pastel pink and gold wedding cookies with floral details…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          value={formData.description}
          onChange={handleInputChange}
        />
        <p id="description-help" className="mt-2 text-xs text-gray-500">Please include at least 10 characters so Faith has enough detail to quote.</p>
      </div>

      <div className="qw-attachments">
        <label htmlFor="inspirationPhotos">Inspiration photos <span>(optional)</span></label>
        <p>Have a colour palette, a cookie you love or an invitation to match? Show Faith what you have in mind.</p>
        <input id="inspirationPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={preparingPhotos || isSubmitting || !!savedQuote || photos.length>=MAX_QUOTE_PHOTOS} onChange={addPhotos} aria-describedby="inspiration-help"/>
        <p id="inspiration-help">Up to 3 photos · JPG, PNG or WebP · 10 MB each. Photos are resized before upload and shared privately with the bakery.</p>
        {preparingPhotos && <p role="status">Preparing your photos…</p>}
        {photoError && <p role="alert" className="qw-photo-error">{photoError}</p>}
        {photos.length>0 && <ul className="qw-photo-previews">{photos.map(photo=><li key={photo.id}><img src={photo.preview} alt={`Preview of ${photo.name}`}/><span>{photo.name}</span><button type="button" disabled={isSubmitting || !!savedQuote} onClick={()=>{URL.revokeObjectURL(photo.preview);setPhotos(current=>current.filter(p=>p.id!==photo.id));setPhotoError('');}} aria-label={`Remove ${photo.name}`}>Remove</button></li>)}</ul>}
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
                aria-pressed={selected}
                className={`qw-choice ${selected ? 'is-selected' : ''}`}
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
              aria-pressed={formData.quantity === q}
              className={`qw-choice ${formData.quantity === q ? 'is-selected' : ''}`}
            >
              {q} cookies
            </button>
          ))}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            aria-label="Fewer cookies"
            onClick={() => updateField('quantity', Math.max(1, formData.quantity - 1))}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-sage-400 hover:text-sage-600 active:bg-sage-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="text"
            aria-label="Number of cookies"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.quantity === 0 ? '' : formData.quantity}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') { updateField('quantity', 0); return; }
              if (/^\d+$/.test(v)) updateField('quantity', Math.min(10000, parseInt(v, 10)));
            }}
            className="w-16 sm:w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center text-lg font-semibold text-gray-900 focus:border-sage-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          />
          <button
            type="button"
            aria-label="More cookies"
            onClick={() => updateField('quantity', Math.min(10000, formData.quantity + 1))}
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
                {(discount * 100).toFixed(0)}% quantity discount
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
        <label htmlFor="collectionDate" className="mb-2 block text-sm font-medium text-gray-700">Preferred collection date (optional)</label>
        <input id="collectionDate" name="collectionDate" type="date" min={businessToday()} value={formData.collectionDate} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3" />
        <p className="mt-2 text-xs text-gray-500">Please allow at least two weeks for custom cookies. Faith will confirm availability.</p>
      </div>
      <div>
        <label htmlFor="specialFonts" className="mb-2 block text-sm font-medium text-gray-700">
          Text on the cookies
        </label>
        <textarea
          id="specialFonts"
          name="specialFonts"
          maxLength={1000}
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
          maxLength={4000}
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
          Where can Faith reach you?
        </h2>
        <p className="mt-2 text-gray-500">
          {user ? 'Check your contact details. Your request will be saved to your account.' : 'Tell us who you are. After sending, you can create an account to track your quote.'}
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
          maxLength={150}
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
          readOnly={!!user}
          autoComplete="email"
          maxLength={254}
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
          maxLength={40}
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
  if (submitted) return <section className="quote-wizard qw-redesign qw-success mx-auto max-w-2xl px-5 py-14">
    <p className="bakery-kicker">YOUR NEXT OCCASION IS ON ITS WAY</p>
    <h1 className="font-display text-4xl mb-5">Your quote request is in.</h1>
    <p className="mb-6">Thanks, {formData.customerName}. Faith will review your design and confirm availability and pricing. Your booking isn’t confirmed yet.</p>
    <div className="rounded-lg border border-[#d6d8cc] bg-white p-6 mb-6">
      <h2 className="font-display text-2xl mb-3">Keep an eye on your cookies.</h2>
      <p className="mb-5">Create a free account to track this quote, message Faith and download your documents. Use <strong>{formData.customerEmail.trim()}</strong> and confirm your email to connect your quote securely.</p>
      <button className="bakery-button" onClick={() => navigate('/account/login', {state:{mode:'signup',email:formData.customerEmail.trim()}})}>Create an account to track this quote</button>
      <button className="block mt-4 text-sm underline" onClick={() => navigate('/account/login', {state:{mode:'login',email:formData.customerEmail.trim()}})}>Already have an account? Sign in</button>
    </div>
    <button className="text-sm underline" onClick={() => navigate('/')}>Continue without an account · Back to the bakery</button>
  </section>;
  return (
    <div className={`quote-wizard qw-redesign ${embedded ? 'is-embedded' : ''}`}>
      <div className="qw-wrap">
        <header className="qw-intro">
          <p className="qw-kicker">CUSTOM COOKIES · MADE IN ALBURY–WODONGA</p>
          <h1>A little cookie.<br/>Your kind of occasion.</h1>
          <p>Choose the details. Get an estimate. Faith will help bring it all together.</p>
        </header>
        <nav className="qw-steps" aria-label="Quote steps">
          {STEP_LABELS.map((label, i) => <button key={label} type="button" aria-current={i === step ? 'step' : undefined}
            disabled={isSubmitting || !!savedQuote || preparingPhotos || (i > step && !Array.from({length:i}, (_, n) => n).every(validStep))}
            onClick={() => goToStep(i)} className={i === step ? 'is-current' : i < step ? 'is-complete' : ''}>
            <span className="qw-step-number">{i < step ? <Check size={15} aria-hidden="true"/> : `0${i + 1}`}</span>
            <span>{label}</span>
          </button>)}
        </nav>
        <div className="qw-layout">
          <div className="qw-main">
            <section ref={stepPanel} tabIndex={-1} className="qw-form-card" aria-label={`${STEP_LABELS[step]} step`}>
              <p className="qw-step-caption" aria-live="polite">STEP {step + 1} OF 4 · {STEP_LABELS[step].toUpperCase()}</p>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div key={step} custom={direction} variants={pageVariants} initial={reduceMotion ? false : 'enter'} animate="center" exit="exit" transition={reduceMotion ? {duration:0} : pageTransition}>
                  <fieldset disabled={isSubmitting || !!savedQuote} className="qw-step-fields">{stepContent[step]}</fieldset>
                </motion.div>
              </AnimatePresence>
            </section>
            {savedQuote && photoError && <p role="alert" className="qw-photo-error">{photoError}</p>}
            <div className="qw-actions">
              <button type="button" className="qw-back" onClick={goBack} disabled={step === 0 || isSubmitting || !!savedQuote}><ArrowLeft size={16}/>Back</button>
              {step < 3 ? <button type="button" className="qw-primary" onClick={goNext} disabled={!canAdvance() || preparingPhotos}>Continue<ArrowRight size={16}/></button>
              : <button type="button" className="qw-primary" onClick={handleSubmit} disabled={![0,1,2,3].every(validStep) || isSubmitting || authLoading || preparingPhotos}>
                {isSubmitting ? <><Loader2 className="animate-spin" size={16}/>Sending…</> : <>{savedQuote ? 'Retry photo upload' : 'Send quote request'}<Send size={16}/></>}
              </button>}
            </div>
            <p className="qw-reassurance">No payment needed. Your booking is confirmed separately with Faith.</p>
          </div>
          <aside className="qw-summary" aria-label="Your cookie plan">
            {step === 0 && <figure className="qw-photo"><img src="/cookies/floral-gift.jpg" alt="Pink floral cookies made by Sugar Mama"/><figcaption>A little inspiration from Faith’s kitchen.</figcaption></figure>}
            <div className="qw-summary-content">
              <p className="qw-kicker">YOUR COOKIE PLAN</p>
              <h2>{formData.category ? CATEGORIES.find(c => c.value === formData.category)?.label : 'Something worth celebrating.'}</h2>
              <dl>{photos.length>0 && <div><dt>Inspiration</dt><dd>{photos.length} {photos.length===1?'photo':'photos'}</dd></div>}<div><dt>Cookies</dt><dd>{formData.quantity || '—'}</dd></div><div><dt>Shape</dt><dd>{SHAPES.find(s => s.value === formData.shape)?.label || 'To be decided'}</dd></div>
              {formData.collectionDate && <div><dt>Preferred collection</dt><dd>{new Date(`${formData.collectionDate}T12:00:00`).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</dd></div>}</dl>
              {step >= 1 && formData.quantity > 0 && <div className="qw-estimate"><span>Estimated total <small>AUD</small></span><strong>${totalPrice.toFixed(2)}</strong><p>{formData.quantity} × ${calculateUnitPrice(formData.quantity).toFixed(2)} per cookie{discount > 0 ? ` · ${(discount * 100).toFixed(0)}% quantity discount` : ''}</p></div>}
              <p className="qw-summary-note">Every design is a little different. Faith will confirm the final price and availability before you book.</p>
            </div>
            <div className="qw-lead-time"><strong>Made with a little time and care.</strong><p>Please allow at least two weeks for custom cookies.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}
