import React, { useState, useEffect } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Footer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-6">
          <h2 className="logo-text text-2xl font-semibold">
            Sugar Mama Cookie Co.
          </h2>
          <p className="text-gray-500 text-sm text-center max-w-md">
            Handcrafted cookies made with love and the finest ingredients.
          </p>
          
          <div className="flex space-x-6">
            <a 
              href="https://www.facebook.com/people/Sugar-Mama-Cookie-Co/61572980297155/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-rose-500 transition-colors"
            >
              <Facebook className="h-6 w-6" />
            </a>
            <a 
              href="https://www.instagram.com/sugar_mamacookie/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-rose-500 transition-colors"
            >
              <Instagram className="h-6 w-6" />
            </a>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Sugar Mama Cookie Co. All rights reserved.
            </p>
            {!isAuthenticated ? (
              <Link
                to="/login"
                className="text-gray-400 hover:text-sage-600 text-sm transition-colors"
              >
                Admin Login
              </Link>
            ) : (
              <Link
                to="/admin"
                className="text-gray-400 hover:text-sage-600 text-sm transition-colors"
              >
                Admin Portal
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}