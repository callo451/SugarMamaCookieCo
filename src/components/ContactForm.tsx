import React, { useEffect } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const ContactForm = () => {
  const formAnimation = useScrollAnimation();

  useEffect(() => {
    // Load Elfsight script
    const script = document.createElement('script');
    script.src = "https://static.elfsight.com/platform/platform.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      document.body.removeChild(script);
    };
  }, []);

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

          {/* Elfsight Contact Form */}
          <div className={`scroll-animation ${formAnimation.isVisible ? 'animate' : ''}`} style={{ animationDelay: '200ms' }}>
            <div 
              className="elfsight-app-f1cceaa1-cffd-4e5b-9a93-492e63654839" 
              data-elfsight-app-lazy
            ></div>
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
                Email: hello@sugarmamacookieco.com.au<br />
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
