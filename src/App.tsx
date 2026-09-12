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
import Activity from './pages/admin/Activity';
import Production from './pages/admin/Production';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Customers from './pages/admin/Customers';
import AdminSettings from './pages/admin/Settings';
import OrderDetail from './pages/admin/OrderDetail';
import './bakery.css';
import './customer.css';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerHome from './pages/customer/CustomerHome';
import CustomerOrderDetail from './pages/customer/CustomerOrderDetail';
import RequestQuote from './pages/customer/RequestQuote';
import CustomerInbox from './pages/admin/CustomerInbox';
import { Toaster } from 'react-hot-toast';

function PublicLayout() {
  return (
    <div className="bakery-site">
      <Navbar />
      <div>
        <main id="public-main" className="flex-grow">
          <Outlet />
        </main>
      </div>
      <Footer />
      <MessengerButton />
    </div>
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
            <Route path="activity" element={<Activity />} />
            <Route path="messages" element={<CustomerInbox />} />
            <Route path="production" element={<Production />} />
            <Route path="calendar" element={<Production calendar />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/set-password" element={<Login />} />
          <Route path="/auth/set-password" element={<Login />} />
          <Route path="/account/login" element={<CustomerLogin />} />
          <Route path="/account/callback" element={<CustomerLogin />} />
          <Route path="/account/set-password" element={<CustomerLogin />} />
          <Route path="/account" element={<CustomerLayout />}>
            <Route index element={<CustomerHome />} />
            <Route path="quote" element={<RequestQuote />} />
            <Route path="orders/:id" element={<CustomerOrderDetail />} />
          </Route>
          {/* Public routes with Navbar/Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/quote-builder" element={<QuoteBuilder />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />

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
