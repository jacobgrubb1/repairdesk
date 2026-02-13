import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OrgDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasOrg, setHasOrg] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [settingUp, setSettingUp] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [addingStore, setAddingStore] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data } = await api.get('/org/dashboard');
      setDashboard(data);
      setHasOrg(true);
      // Load inventory in parallel
      api.get('/org/inventory')
        .then(({ data }) => setInventory(data))
        .catch(() => {});
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setHasOrg(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupOrg(e) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSettingUp(true);
    try {
      await api.post('/org/setup', { name: orgName.trim() });
      setOrgName('');
      toast.success('Organization created');
      await loadDashboard();
    } catch (err) {
      toast.error('Failed to create organization: ' + (err.response?.data?.error || err.message));
    } finally {
      setSettingUp(false);
    }
  }

  async function handleAddStore(e) {
    e.preventDefault();
    if (!storeForm.name.trim()) return;
    setAddingStore(true);
    try {
      await api.post('/org/stores', {
        name: storeForm.name.trim(),
        address: storeForm.address.trim(),
        phone: storeForm.phone.trim(),
        email: storeForm.email.trim(),
      });
      setStoreForm({ name: '', address: '', phone: '', email: '' });
      setShowAddStore(false);
      toast.success('Store added');
      await loadDashboard();
    } catch (err) {
      toast.error('Failed to add store: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingStore(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Organization Dashboard</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // No org yet - show setup
  if (hasOrg === false) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Organization Dashboard</h1>

        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-2">No Organization Found</h2>
          <p className="text-sm text-gray-500 mb-6">
            Set up an organization to manage multiple store locations from one dashboard.
          </p>
          <form onSubmit={handleSetupOrg} className="space-y-3">
            <input
              type="text"
              placeholder="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button
              type="submit"
              disabled={settingUp}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 w-full font-medium"
            >
              {settingUp ? 'Setting up...' : 'Setup Organization'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totals = dashboard?.totals || { tickets: 0, revenue: 0, activeTickets: 0 };
  const stores = dashboard?.stores || [];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organization Dashboard</h1>
        <button
          onClick={() => setShowAddStore(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Store
        </button>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-2xl font-bold">{totals.tickets}</p>
          <p className="text-sm text-gray-500">Total Tickets</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-2xl font-bold">${parseFloat(totals.revenue || 0).toFixed(2)}</p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-2xl font-bold">{totals.activeTickets}</p>
          <p className="text-sm text-gray-500">Active Tickets</p>
        </div>
      </div>

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold mb-4">Add New Store</h2>
          <form onSubmit={handleAddStore} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Store Name</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Address</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingStore}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {addingStore ? 'Adding...' : 'Add Store'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddStore(false)}
                className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Per-Store Cards */}
      <div className="mb-8">
        <h2 className="font-semibold mb-4">Stores</h2>
        {stores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div key={store.id} className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold mb-3">{store.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Tickets</span>
                    <span className="font-medium">{store.ticket_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Active Tickets</span>
                    <span className="font-medium">{store.active_tickets || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue</span>
                    <span className="font-semibold text-green-700">
                      ${parseFloat(store.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                {store.address && (
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t">{store.address}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <p className="text-gray-500 text-sm">No stores added yet. Click "Add Store" to get started.</p>
          </div>
        )}
      </div>

      {/* Cross-Store Inventory */}
      <div>
        <h2 className="font-semibold mb-4">Cross-Store Inventory</h2>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {inventory.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Part Name</th>
                  <th className="text-left p-3">Store</th>
                  <th className="text-right p-3">Quantity</th>
                  <th className="text-right p-3">Unit Cost</th>
                  <th className="text-right p-3">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((part, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">{part.name}</td>
                    <td className="p-3 text-gray-500">{part.store_name}</td>
                    <td className="p-3 text-right">{part.quantity}</td>
                    <td className="p-3 text-right">
                      {part.unit_cost != null ? `$${parseFloat(part.unit_cost).toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {part.unit_cost != null && part.quantity != null
                        ? `$${(parseFloat(part.unit_cost) * parseInt(part.quantity)).toFixed(2)}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-gray-500 text-sm">No inventory data available across stores.</p>
          )}
        </div>
      </div>
    </div>
  );
}
