import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import StoreSwitcher from './StoreSwitcher';
import GlobalSearch from './GlobalSearch';
import ErrorBoundary from './ErrorBoundary';
import {
  LayoutDashboard,
  Columns3,
  Ticket,
  PlusCircle,
  Users,
  Package,
  BookOpen,
  BarChart3,
  UserCog,
  Settings,
  Building2,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { path: '/queue', label: 'Queue Board', icon: Columns3, roles: null },
  { path: '/tickets', label: 'Tickets', icon: Ticket, roles: null },
  { path: '/tickets/new', label: 'New Ticket', icon: PlusCircle, roles: null },
  { path: '/customers', label: 'Customers', icon: Users, roles: null },
  { path: '/inventory', label: 'Inventory', icon: Package, roles: null },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, roles: null },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: null },
  { path: '/staff', label: 'Staff', icon: UserCog, roles: ['admin'] },
  { path: '/store-settings', label: 'Store Settings', icon: Settings, roles: ['admin'] },
  { path: '/org', label: 'Organization', icon: Building2, roles: ['admin'], orgOnly: true },
];

function SidebarContent({ user, location, logout, onNavClick }) {
  return (
    <>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">RepairDesk</h1>
            <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
        {user?.org_role && <div className="mt-2"><StoreSwitcher /></div>}
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (item.roles && !item.roles.includes(user?.role)) return false;
            if (item.orgOnly && !user?.org_role) return false;
            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col print:hidden">
        <SidebarContent user={user} location={location} logout={logout} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-50 animate-slide-in-left">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent
              user={user}
              location={location}
              logout={logout}
              onNavClick={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b bg-white px-4 md:px-6 py-3 print:hidden flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <GlobalSearch />
          </div>
        </div>
        <div className="p-4 md:p-6">
          <ErrorBoundary>
            <div className="animate-page-in">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
