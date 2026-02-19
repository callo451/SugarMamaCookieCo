import { useState, useEffect } from 'react';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Footer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand */}
          <div>
            <h2 className="logo-text text-2xl font-semibold">Sugar Mama Cookie Co.</h2>
            <p className="mt-3 text-gray-500 text-sm leading-relaxed max-w-xs">
              Handcrafted cookies made with love and the finest ingredients, based in Albury-Wodonga, Australia.
            </p>
            <div className="flex gap-4 mt-5">
              <a
                href="https://www.facebook.com/people/Sugar-Mama-Cookie-Co/61572980297155/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-sage-600 hover:border-sage-300 transition-all"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/sugar_mamacookie/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-sage-600 hover:border-sage-300 transition-all"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/quote-builder', label: 'Get a Quote' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-500 hover:text-sage-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Get in Touch
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <Mail className="h-4 w-4 text-sage-500 flex-shrink-0" />
                hello@sugarmamacookieco.com.au
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <Phone className="h-4 w-4 text-sage-500 flex-shrink-0" />
                +61 412 480 274
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-sage-500 flex-shrink-0" />
                Albury-Wodonga, Australia
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} Sugar Mama Cookie Co. All rights reserved.
          </p>
          {!isAuthenticated ? (
            <Link
              to="/login"
              className="text-gray-400 hover:text-sage-600 text-xs transition-colors"
            >
              Admin Login
            </Link>
          ) : (
            <Link
              to="/admin"
              className="text-gray-400 hover:text-sage-600 text-xs transition-colors"
            >
              Admin Portal
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
