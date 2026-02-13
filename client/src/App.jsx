import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import PlatformLayout from './components/PlatformLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketCreate from './pages/TicketCreate';
import TicketDetail from './pages/TicketDetail';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import StoreSettings from './pages/StoreSettings';
import QueueBoard from './pages/QueueBoard';
import Inventory from './pages/Inventory';
import KnowledgeBase from './pages/KnowledgeBase';
import OrgDashboard from './pages/OrgDashboard';
import PlatformLogin from './pages/PlatformLogin';
import PlatformOverview from './pages/platform/PlatformOverview';
import PlatformStores from './pages/platform/PlatformStores';
import PlatformUsers from './pages/platform/PlatformUsers';
import TrackingPortal from './pages/TrackingPortal';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PlatformProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/platform/login" />;
  if (user.platformRole !== 'platform_admin' && user.platform_role !== 'platform_admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const isPlatformAdmin = user?.platformRole === 'platform_admin' || user?.platform_role === 'platform_admin';

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/track/:token" element={<TrackingPortal />} />
        <Route path="/platform/login" element={isPlatformAdmin ? <Navigate to="/platform" /> : <PlatformLogin />} />
        <Route
          element={
            <PlatformProtectedRoute>
              <PlatformLayout />
            </PlatformProtectedRoute>
          }
        >
          <Route path="/platform" element={<PlatformOverview />} />
          <Route path="/platform/stores" element={<PlatformStores />} />
          <Route path="/platform/users" element={<PlatformUsers />} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/queue" element={<QueueBoard />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/new" element={<TicketCreate />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/org" element={<OrgDashboard />} />
          <Route path="/staff" element={<UserManagement />} />
          <Route path="/store-settings" element={<StoreSettings />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
