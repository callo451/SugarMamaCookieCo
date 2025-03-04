import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const ContactForm = () => {
  const formAnimation = useScrollAnimation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    }, 3000);
  };

  return (
    <section 
      ref={formAnimation.ref}
      className="relative py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50"
      id="contact"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto relative z-10">
          {/* Section Header */}
          <div className={`text-center mb-12 scroll-animation ${formAnimation.isVisible ? 'animate' : ''}`}>
            <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Get in Touch
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Have questions about our custom cookies? We'd love to hear from you!
            </p>
          </div>

          {/* Contact Form */}
          <div className={`scroll-animation ${formAnimation.isVisible ? 'animate' : ''}`} style={{ animationDelay: '200ms' }}>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-6 bg-white p-8 rounded-2xl shadow-xl border border-[#ACC0B9]/20"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#ACC0B9] focus:ring-[#ACC0B9] sm:text-sm"
                    placeholder="Your name"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#ACC0B9] focus:ring-[#ACC0B9] sm:text-sm"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Subject Field */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#ACC0B9] focus:ring-[#ACC0B9] sm:text-sm"
                  placeholder="What's this about?"
                />
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#ACC0B9] focus:ring-[#ACC0B9] sm:text-sm resize-y"
                  placeholder="Tell us what you need..."
                />
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitted}
                  className={`w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-medium text-white shadow-sm transition-all duration-200 ${
                    isSubmitted
                      ? 'bg-green-500 cursor-default'
                      : 'bg-[#ACC0B9] hover:bg-[#9BB0A9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ACC0B9]'
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Sent Successfully!
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* FAQ Section */}
          <div className={`mt-16 scroll-animation ${formAnimation.isVisible ? 'animate' : ''}`} style={{ animationDelay: '300ms' }}>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h4 className="text-lg font-medium text-gray-900">Do you offer custom designs?</h4>
                <p className="mt-2 text-gray-600">
                  Yes! We specialize in creating custom-designed cookies for any occasion. From corporate events to weddings, we can bring your vision to life.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h4 className="text-lg font-medium text-gray-900">What's your delivery area?</h4>
                <p className="mt-2 text-gray-600">
                  We currently deliver throughout the Albury-Wodonga region. For locations outside this area, please contact us to discuss shipping options.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h4 className="text-lg font-medium text-gray-900">How far in advance should I order?</h4>
                <p className="mt-2 text-gray-600">
                  We recommend placing orders at least 2 weeks in advance for custom designs, and 1 week for standard orders. For rush orders, please contact us directly.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={`mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 scroll-animation ${formAnimation.isVisible ? 'animate' : ''}`} style={{ animationDelay: '400ms' }}>
            <div className="text-center sm:text-left bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Business Hours</h3>
              <p className="mt-2 text-gray-600">
                Monday - Friday: 9am - 5pm<br />
                Saturday: 10am - 4pm<br />
                Sunday: Closed
              </p>
            </div>
            <div className="text-center sm:text-left bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Contact Info</h3>
              <p className="mt-2 text-gray-600">
                Email: info@sugarmamacookieco.com<br />
                Phone: (02) 1234 5678<br />
                Location: Albury-Wodonga, Australia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ACC0B9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h2v4h4v2h-4v4h-2v-4h-4v-2h4zm0-30V0h2v4h4v2h-4v4h-2V6h-4V4h4zM6 34v-4h2v4h4v2h-4v4H6v-4H2v-2h4zm0-30V0h2v4h4v2H8v4H6V6H2V4h4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
      </div>
    </section>
  );
};

export default ContactForm;
