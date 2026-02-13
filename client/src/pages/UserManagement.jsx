import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const ROLES = ['admin', 'technician', 'front_desk'];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'technician' });
  const { toast } = useToast();

  function load() {
    api.get('/users').then(({ data }) => setUsers(data));
  }
  useEffect(load, []);

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

  return (
    <div className="max-w-3xl">
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
        {users.map((u) => (
          <div key={u.id} className={`flex items-center justify-between p-4 ${!u.is_active ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-medium">{u.name} {!u.is_active && <span className="text-xs text-red-500 ml-1">(deactivated)</span>}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
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
        ))}
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
