import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const emptySupplier = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
};

function SupplierFormFields({ form, setForm, onSubmit, submitLabel, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Company Name" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Contact Name" value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Phone" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Address" value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-500 text-sm hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptySupplier });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ ...emptySupplier });

  const loadSuppliers = useCallback(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/suppliers${params}`).then(({ data }) => setSuppliers(data));
  }, [search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await api.post('/suppliers', addForm);
      setAddForm({ ...emptySupplier });
      setShowAddForm(false);
      toast.success('Supplier added');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add supplier');
    }
  }

  function startEdit(supplier) {
    if (editingId === supplier.id) {
      setEditingId(null);
      return;
    }
    setEditingId(supplier.id);
    setEditForm({
      name: supplier.name || '',
      contactName: supplier.contactName ?? supplier.contact_name ?? '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      await api.put(`/suppliers/${editingId}`, editForm);
      setEditingId(null);
      toast.success('Supplier updated');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update supplier');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this supplier permanently?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete supplier');
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          {showAddForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {showAddForm && (
        <SupplierFormFields
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleAdd}
          submitLabel="Add Supplier"
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <input
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
      />

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Address</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, idx) => (
              <React.Fragment key={supplier.id}>
                <tr
                  className={`border-b cursor-pointer hover:bg-gray-100 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                  onClick={() => startEdit(supplier)}
                >
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3">{supplier.contactName ?? supplier.contact_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{supplier.email || '—'}</td>
                  <td className="px-4 py-3">{supplier.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{supplier.address || '—'}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(supplier.id)}
                      className="text-red-500 text-sm hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>

                {editingId === supplier.id && (
                  <tr className="border-b bg-yellow-50">
                    <td colSpan={6} className="px-4 py-3">
                      <form onSubmit={handleUpdate} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input placeholder="Company Name" required value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="Contact Name" value={editForm.contactName}
                            onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm" />
                          <input type="email" placeholder="Email" value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="Phone" value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="Address" value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit"
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                            Save Changes
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}
                            className="text-gray-500 text-sm hover:underline">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h12M8 17V7.5m0 9.5H4.5M8 7.5l4-4 4 4M8 7.5V3" />
            </svg>
            <p className="text-gray-500 font-medium">No suppliers yet</p>
            <p className="text-gray-400 text-sm mt-1">Add suppliers to manage your parts sourcing</p>
          </div>
        )}
      </div>
    </div>
  );
}
