import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
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
import TrackingPortal from './pages/TrackingPortal';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/track/:token" element={<TrackingPortal />} />
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
