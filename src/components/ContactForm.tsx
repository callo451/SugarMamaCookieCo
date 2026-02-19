import { useState } from 'react';
import { ChevronDown, Clock, Mail, Phone, MapPin, Send, Loader2, CheckCircle2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const faqs = [
  {
    question: 'Do you offer custom designs?',
    answer:
      "Yes! We specialize in creating custom-designed cookies for any occasion. From corporate events to weddings, we can bring your vision to life.",
  },
  {
    question: "What's your delivery area?",
    answer:
      'We currently deliver throughout the Albury-Wodonga region. For locations outside this area, please contact us to discuss shipping options.',
  },
  {
    question: 'How far in advance should I order?',
    answer:
      'We recommend placing orders at least 2 weeks in advance for custom designs, and 1 week for standard orders. For rush orders, please contact us directly.',
  },
];

const ContactForm = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-message', {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
        },
      });

      if (error) throw error;

      setFormState('sent');
      setFormData({ name: '', email: '', message: '' });
    } catch (err: any) {
      console.error('Contact form error:', err);
      setErrorMessage(err?.message || 'Something went wrong. Please try again.');
      setFormState('error');
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-white" id="contact">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Get in Touch
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Have questions about our custom cookies? We'd love to hear from you!
          </p>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {formState === 'sent' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-sage-100 bg-sage-50/50 p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle2 className="mx-auto h-12 w-12 text-sage-500" />
                </motion.div>
                <h3 className="mt-4 font-display text-xl font-semibold text-gray-900">
                  Message sent!
                </h3>
                <p className="mt-2 text-gray-500">
                  Thanks for reaching out. We'll get back to you as soon as possible.
                </p>
                <button
                  type="button"
                  onClick={() => setFormState('idle')}
                  className="mt-6 text-sm font-medium text-sage-600 hover:text-sage-700 transition-colors"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-6 sm:p-8"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      name="name"
                      required
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/20 resize-none"
                  />
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {formState === 'error' && errorMessage && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-500"
                    >
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={formState === 'sending'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sage-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-sage-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {formState === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Messenger CTA */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/50 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span>or reach out directly</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-semibold text-gray-900">
                  Chat with us on Facebook Messenger
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get a quicker response by messaging us directly — we're usually online during business hours.
                </p>
              </div>
              <a
                href="https://m.me/61572980297155"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0695FF 0%, #A334FA 50%, #FF6968 100%)',
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Open Messenger
              </a>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="font-display text-2xl font-semibold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/50">
            {faqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left group"
                >
                  <span className="text-base font-medium text-gray-900 group-hover:text-sage-700 transition-colors">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 ml-4"
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-sage-500" />
              <h3 className="text-base font-semibold text-gray-900">Business Hours</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Monday - Friday: 9am - 5pm</p>
              <p>Saturday: 10am - 4pm</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
          <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-sage-500" />
              <h3 className="text-base font-semibold text-gray-900">Contact Info</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sage-400" />
                hello@sugarmamacookieco.com.au
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sage-400" />
                +61 412 480 274
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sage-400" />
                Albury-Wodonga, Australia
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactForm;
