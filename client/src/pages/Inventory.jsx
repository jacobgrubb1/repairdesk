import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const emptyPart = {
  name: '',
  sku: '',
  category: '',
  costPrice: '',
  sellPrice: '',
  quantity: '',
  minQuantity: '',
  supplierId: '',
};

const emptySupplier = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
};

function PartFormFields({ form, setForm, onSubmit, submitLabel, onCancel, suppliers }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input placeholder="Part Name" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="SKU" value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Category" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <select value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Select Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input type="number" step="0.01" placeholder="Cost Price" required value={form.costPrice}
          onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="number" step="0.01" placeholder="Sell Price" required value={form.sellPrice}
          onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="number" placeholder="Quantity" required value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="number" placeholder="Min Quantity" required value={form.minQuantity}
          onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm" />
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

function PartsTab({ suppliers }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyPart });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ ...emptyPart });

  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('');

  const [historyId, setHistoryId] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const loadParts = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (lowStockOnly) params.set('lowStock', 'true');
    const qs = params.toString();
    api.get(`/parts${qs ? `?${qs}` : ''}`).then(({ data }) => setParts(data));
  }, [search, categoryFilter, lowStockOnly]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  useEffect(() => {
    api.get('/parts/categories').then(({ data }) => setCategories(data));
  }, []);

  function margin(cost, sell) {
    const c = parseFloat(cost);
    const s = parseFloat(sell);
    if (!s || !c || s === 0) return '—';
    return (((s - c) / s) * 100).toFixed(1) + '%';
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await api.post('/parts', {
        ...addForm,
        costPrice: parseFloat(addForm.costPrice),
        sellPrice: parseFloat(addForm.sellPrice),
        quantity: parseInt(addForm.quantity, 10),
        minQuantity: parseInt(addForm.minQuantity, 10),
        supplierId: addForm.supplierId ? parseInt(addForm.supplierId, 10) : null,
      });
      setAddForm({ ...emptyPart });
      setShowAddForm(false);
      toast.success('Part added');
      loadParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add part');
    }
  }

  function startEdit(part) {
    if (editingId === part.id) {
      setEditingId(null);
      return;
    }
    setEditingId(part.id);
    setEditForm({
      name: part.name || '',
      sku: part.sku || '',
      category: part.category || '',
      costPrice: part.costPrice ?? part.cost_price ?? '',
      sellPrice: part.sellPrice ?? part.sell_price ?? '',
      quantity: part.quantity ?? '',
      minQuantity: part.minQuantity ?? part.min_quantity ?? '',
      supplierId: part.supplierId ?? part.supplier_id ?? '',
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      await api.put(`/parts/${editingId}`, {
        ...editForm,
        costPrice: parseFloat(editForm.costPrice),
        sellPrice: parseFloat(editForm.sellPrice),
        quantity: parseInt(editForm.quantity, 10),
        minQuantity: parseInt(editForm.minQuantity, 10),
        supplierId: editForm.supplierId ? parseInt(editForm.supplierId, 10) : null,
      });
      setEditingId(null);
      toast.success('Part updated');
      loadParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update part');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this part permanently?')) return;
    try {
      await api.delete(`/parts/${id}`);
      toast.success('Part deleted');
      loadParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete part');
    }
  }

  async function handleRestock(id) {
    if (!restockQty || parseInt(restockQty, 10) <= 0) return;
    try {
      await api.post(`/parts/${id}/restock`, {
        quantity: parseInt(restockQty, 10),
        note: restockNote,
      });
      setRestockId(null);
      setRestockQty('');
      setRestockNote('');
      toast.success('Part restocked');
      loadParts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restock');
    }
  }

  async function toggleHistory(partId) {
    if (historyId === partId) {
      setHistoryId(null);
      setHistoryData([]);
      return;
    }
    try {
      const { data } = await api.get(`/parts/${partId}`);
      setHistoryId(partId);
      setHistoryData(data.transactions || []);
    } catch {
      toast.error('Failed to load history');
    }
  }

  function isLowStock(part) {
    const qty = part.quantity ?? 0;
    const min = part.minQuantity ?? part.min_quantity ?? 0;
    return qty <= min;
  }

  function supplierName(id) {
    const s = suppliers.find((sup) => sup.id === id);
    return s ? s.name : '—';
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          {showAddForm ? 'Cancel' : '+ Add Part'}
        </button>
      </div>

      {showAddForm && (
        <PartFormFields
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleAdd}
          submitLabel="Add Part"
          onCancel={() => setShowAddForm(false)}
          suppliers={suppliers}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded"
          />
          Low Stock Only
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Supplier</th>
              <th className="px-4 py-3 font-semibold text-right">Cost</th>
              <th className="px-4 py-3 font-semibold text-right">Sell</th>
              <th className="px-4 py-3 font-semibold text-right">Margin</th>
              <th className="px-4 py-3 font-semibold text-right">Qty</th>
              <th className="px-4 py-3 font-semibold text-right">Min</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, idx) => {
              const low = isLowStock(part);
              const cost = part.costPrice ?? part.cost_price ?? 0;
              const sell = part.sellPrice ?? part.sell_price ?? 0;
              const qty = part.quantity ?? 0;
              const minQty = part.minQuantity ?? part.min_quantity ?? 0;
              const sid = part.supplierId ?? part.supplier_id;

              return (
                <React.Fragment key={part.id}>
                  <tr
                    className={`border-b cursor-pointer hover:bg-gray-50 ${
                      low ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                    onClick={() => startEdit(part)}
                  >
                    <td className={`px-4 py-3 font-medium ${low ? 'text-red-700' : ''}`}>{part.name}</td>
                    <td className="px-4 py-3 text-gray-500">{part.sku || '—'}</td>
                    <td className="px-4 py-3">{part.category || '—'}</td>
                    <td className="px-4 py-3">{supplierName(sid)}</td>
                    <td className="px-4 py-3 text-right">${parseFloat(cost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${parseFloat(sell).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{margin(cost, sell)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${low ? 'text-red-600' : ''}`}>{qty}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{minQty}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRestockId(restockId === part.id ? null : part.id);
                            setRestockQty('');
                            setRestockNote('');
                          }}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => toggleHistory(part.id)}
                          className="text-indigo-600 text-sm hover:underline"
                        >
                          History
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(part.id)}
                            className="text-red-500 text-sm hover:underline">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {restockId === part.id && (
                    <tr className="border-b bg-blue-50">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Restock {part.name}:</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={restockQty}
                            onChange={(e) => setRestockQty(e.target.value)}
                            className="border rounded-lg px-3 py-1 text-sm w-24"
                          />
                          <input
                            placeholder="Note (optional)"
                            value={restockNote}
                            onChange={(e) => setRestockNote(e.target.value)}
                            className="border rounded-lg px-3 py-1 text-sm flex-1"
                          />
                          <button onClick={() => handleRestock(part.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700">
                            Confirm
                          </button>
                          <button onClick={() => setRestockId(null)}
                            className="text-gray-500 text-sm hover:underline">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {editingId === part.id && (
                    <tr className="border-b bg-yellow-50">
                      <td colSpan={10} className="px-4 py-3">
                        <form onSubmit={handleUpdate} className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <input placeholder="Part Name" required value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="SKU" value={editForm.sku}
                              onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="Category" value={editForm.category}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <select value={editForm.supplierId}
                              onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm">
                              <option value="">Select Supplier</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <input type="number" step="0.01" placeholder="Cost Price" required value={editForm.costPrice}
                              onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <input type="number" step="0.01" placeholder="Sell Price" required value={editForm.sellPrice}
                              onChange={(e) => setEditForm({ ...editForm, sellPrice: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <input type="number" placeholder="Quantity" required value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
                            <input type="number" placeholder="Min Quantity" required value={editForm.minQuantity}
                              onChange={(e) => setEditForm({ ...editForm, minQuantity: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm" />
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

                  {historyId === part.id && (
                    <tr className="border-b bg-indigo-50">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="text-sm font-medium mb-2">Usage History — {part.name}</div>
                        {historyData.length === 0 ? (
                          <p className="text-sm text-gray-500">No history yet</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="pb-1 pr-3">Type</th>
                                <th className="pb-1 pr-3">Qty Change</th>
                                <th className="pb-1 pr-3">Ticket</th>
                                <th className="pb-1 pr-3">User</th>
                                <th className="pb-1 pr-3">Date</th>
                                <th className="pb-1">Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyData.map((tx, i) => (
                                <tr key={tx.id || i} className="border-b border-indigo-100 last:border-0">
                                  <td className="py-1.5 pr-3">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                      tx.type === 'restock' ? 'bg-green-100 text-green-700' :
                                      tx.type === 'used' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className={`py-1.5 pr-3 font-medium ${
                                    (tx.quantity_change || tx.quantityChange || 0) > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {(tx.quantity_change || tx.quantityChange || 0) > 0 ? '+' : ''}{tx.quantity_change || tx.quantityChange || 0}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {tx.ticket_id ? (
                                      <a href={`/tickets/${tx.ticket_id}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                        #{tx.ticket_number || tx.ticket_id.slice(0, 8)}
                                      </a>
                                    ) : '—'}
                                  </td>
                                  <td className="py-1.5 pr-3 text-gray-600">{tx.user_name || tx.userName || '—'}</td>
                                  <td className="py-1.5 pr-3 text-gray-500">
                                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="py-1.5 text-gray-500">{tx.note || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {parts.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-500 font-medium">No parts in inventory</p>
            <p className="text-gray-400 text-sm mt-1">Add your first part to start tracking inventory</p>
          </div>
        )}
      </div>
    </>
  );
}

function SuppliersTab() {
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
    <>
      <div className="flex items-center justify-end mb-4">
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
    </>
  );
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('parts');
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    api.get('/suppliers').then(({ data }) => setSuppliers(data));
  }, []);

  const tabs = [
    { id: 'parts', label: 'Parts' },
    { id: 'suppliers', label: 'Suppliers' },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Inventory</h1>

      <div className="flex gap-1 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'parts' && <PartsTab suppliers={suppliers} />}
      {activeTab === 'suppliers' && <SuppliersTab />}
    </div>
  );
}
