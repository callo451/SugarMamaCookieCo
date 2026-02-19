import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.is_admin === true) {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
        }
      } catch (error) {
        console.error('Error in checkAuth:', error);
        setAuthState('unauthorized');
      }
    };

    checkAuth();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sage-50/50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-sage-600 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
