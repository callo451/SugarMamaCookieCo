import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Cookie, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const setAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('auth.users')
        .update({
          raw_user_meta_data: { is_admin: true }
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting admin status:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      // Sign in
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!user) throw new Error('No user returned after login');

      // Check if user is admin
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc('check_is_admin');
      
      if (adminCheckError) throw adminCheckError;

      if (!isAdmin) {
        // Try to set admin status using the updated function
        const { data: setAdminResult, error: setAdminError } = await supabase.rpc(
          'set_admin_status',
          { user_id: user.id }
        );
        
        if (setAdminError) throw setAdminError;
        
        if (!setAdminResult) {
          throw new Error('Failed to set admin status');
        }
      }

      // Navigate to admin page
      navigate('/admin');
    } catch (error: any) {
      console.error('Error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sage-50/50 to-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block relative">
            <div className="absolute -inset-4 bg-white/50 rounded-full blur-2xl animate-glow" />
            <Cookie className="h-12 w-12 text-sage-600 mx-auto mb-4" />
          </div>
          <h1 className="logo-text text-3xl font-semibold mb-2">
            Sugar Mama Cookie Co.
          </h1>
          <h2 className="text-xl font-medium text-gray-600">
            Admin Portal
          </h2>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-sage-500 focus:border-sage-500
                           placeholder:text-gray-400 text-gray-900 text-sm
                           transition-colors bg-white/50 backdrop-blur-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-sage-500 focus:border-sage-500
                           placeholder:text-gray-400 text-gray-900 text-sm
                           transition-colors bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg
                       shadow-sm text-sm font-medium text-white bg-sage-600 hover:bg-sage-700
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Debug Information */}
        {debugInfo.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Debug Information</h3>
            <div className="space-y-2">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}