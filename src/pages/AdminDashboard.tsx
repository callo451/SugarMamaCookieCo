import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to orders page when dashboard loads
    navigate('/admin/orders');
  }, [navigate]);

  return null; // No need to render anything as we're redirecting
}