import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ROLES = ['admin', 'technician', 'front_desk'];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [orgStores, setOrgStores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'technician' });
  const [addingStoreFor, setAddingStoreFor] = useState(null);
  const { toast } = useToast();

  const isOrgAdmin = currentUser?.org_role === 'org_admin';

  function load() {
    if (isOrgAdmin) {
      api.get('/org/users').then(({ data }) => setUsers(data));
      api.get('/org/stores').then(({ data }) => setOrgStores(data)).catch(() => {});
    } else {
      api.get('/users').then(({ data }) => setUsers(data));
    }
  }
  useEffect(load, [isOrgAdmin]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'technician' });
      setShowForm(false);
      toast.success('Staff member created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  }

  async function toggleActive(user) {
    await api.put(`/users/${user.id}`, { is_active: user.is_active ? 0 : 1 });
    load();
  }

  async function changeRole(userId, role) {
    await api.put(`/users/${userId}`, { role });
    load();
  }

  async function grantStore(userId, storeId) {
    try {
      await api.post(`/org/users/${userId}/store-access`, { storeId });
      setAddingStoreFor(null);
      toast.success('Store access granted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant access');
    }
  }

  async function revokeStore(userId, storeId) {
    try {
      await api.delete(`/org/users/${userId}/store-access/${storeId}`);
      toast.success('Store access removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove access');
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-3">
          <h2 className="font-semibold">New Staff Member</h2>
          <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Create Account</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border divide-y">
        {users.map((u) => {
          const accessedStoreIds = (u.storeAccess || []).map(s => s.id);
          const availableStores = orgStores.filter(s => !accessedStoreIds.includes(s.id));

          return (
            <div key={u.id} className={`p-4 ${!u.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {u.name}
                    {!u.is_active && <span className="text-xs text-red-500 ml-1">(deactivated)</span>}
                  </p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  {isOrgAdmin && u.store_name && (
                    <p className="text-xs text-gray-400 mt-0.5">Home store: {u.store_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm">
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                  <button onClick={() => toggleActive(u)}
                    className={`px-3 py-1 rounded-lg text-sm ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {isOrgAdmin && u.storeAccess && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500 mr-1">Stores:</span>
                  {u.storeAccess.map(store => (
                    <span key={store.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      store.id === u.store_id
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {store.name}
                      {store.id !== u.store_id && (
                        <button
                          onClick={() => revokeStore(u.id, store.id)}
                          className="hover:text-red-600 ml-0.5"
                          title="Remove access"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                  {availableStores.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setAddingStoreFor(addingStoreFor === u.id ? null : u.id)}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 hover:bg-green-100"
                        title="Add store access"
                      >
                        +
                      </button>
                      {addingStoreFor === u.id && (
                        <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                          {availableStores.map(store => (
                            <button
                              key={store.id}
                              onClick={() => grantStore(u.id, store.id)}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {store.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500 font-medium">No staff members</p>
            <p className="text-gray-400 text-sm mt-1">Add staff to manage your team</p>
          </div>
        )}
      </div>
    </div>
  );
}
