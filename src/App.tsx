import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MessengerButton from './components/MessengerButton';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import QuoteBuilder from './pages/QuoteBuilder';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Users from './pages/Users';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Customers from './pages/admin/Customers';
import AdminSettings from './pages/admin/Settings';
import OrderDetail from './pages/admin/OrderDetail';
import { Toaster } from 'react-hot-toast';

function PublicLayout() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
      <Footer />
      <MessengerButton />
    </>
  );
}

function App() {
  return (
    <>
      <div className="min-h-screen bg-white flex flex-col">
        <Routes>
          {/* Admin routes with AdminLayout (no Navbar/Footer) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Public routes with Navbar/Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/quote-builder" element={<QuoteBuilder />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
          </Route>
        </Routes>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default App;
