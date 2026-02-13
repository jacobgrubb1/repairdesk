import { useState, useEffect } from 'react';
import api from '../api/client';

const COST_TYPES = ['part', 'labor', 'other'];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null); // template id or 'new'
  const [form, setForm] = useState({ name: '', deviceType: '', deviceBrand: '', items: [] });

  function load() {
    api.get('/templates').then(({ data }) => setTemplates(data));
  }
  useEffect(load, []);

  function startNew() {
    setForm({ name: '', deviceType: '', deviceBrand: '', items: [] });
    setEditing('new');
  }

  function startEdit(t) {
    setForm({
      name: t.name,
      deviceType: t.device_type || '',
      deviceBrand: t.device_brand || '',
      items: t.items.map(i => ({
        description: i.description,
        costType: i.cost_type,
        amount: i.amount,
        hours: i.hours || '',
        hourlyRate: i.hourly_rate || '',
      })),
    });
    setEditing(t.id);
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { description: '', costType: 'part', amount: '', hours: '', hourlyRate: '' }] });
  }

  function updateItem(idx, field, value) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    // Auto-calc amount for labor
    if (items[idx].costType === 'labor' && (field === 'hours' || field === 'hourlyRate')) {
      const h = parseFloat(items[idx].hours) || 0;
      const r = parseFloat(items[idx].hourlyRate) || 0;
      items[idx].amount = h * r;
    }
    setForm({ ...form, items });
  }

  function removeItem(idx) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    if (!form.name) return;
    const payload = {
      ...form,
      items: form.items.map(i => ({
        ...i,
        amount: parseFloat(i.amount) || 0,
        hours: i.hours ? parseFloat(i.hours) : null,
        hourlyRate: i.hourlyRate ? parseFloat(i.hourlyRate) : null,
      })),
    };
    if (editing === 'new') {
      await api.post('/templates', payload);
    } else {
      await api.put(`/templates/${editing}`, payload);
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    await api.delete(`/templates/${id}`);
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Repair Templates</h1>
        <button onClick={startNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Template</button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-3">
          <h2 className="font-semibold">{editing === 'new' ? 'New Template' : 'Edit Template'}</h2>
          <input placeholder="Template name (e.g. iPhone Screen Replacement)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input placeholder="Device type" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Brand" value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          </div>

          <h3 className="font-medium text-sm mt-3">Items</h3>
          {form.items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
              <input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                className="flex-1 border rounded px-2 py-1.5 text-sm" />
              <select value={item.costType} onChange={(e) => updateItem(idx, 'costType', e.target.value)}
                className="border rounded px-2 py-1.5 text-sm w-20">
                {COST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {item.costType === 'labor' ? (
                <>
                  <input type="number" step="0.25" placeholder="Hrs" value={item.hours} onChange={(e) => updateItem(idx, 'hours', e.target.value)}
                    className="w-16 border rounded px-2 py-1.5 text-sm" />
                  <input type="number" step="0.01" placeholder="$/hr" value={item.hourlyRate} onChange={(e) => updateItem(idx, 'hourlyRate', e.target.value)}
                    className="w-16 border rounded px-2 py-1.5 text-sm" />
                </>
              ) : (
                <input type="number" step="0.01" placeholder="$" value={item.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                  className="w-20 border rounded px-2 py-1.5 text-sm" />
              )}
              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 px-1">x</button>
            </div>
          ))}
          <button onClick={addItem} className="text-blue-600 text-sm hover:underline">+ Add item</button>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Save Template</button>
            <button onClick={() => setEditing(null)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                {(t.device_type || t.device_brand) && (
                  <p className="text-sm text-gray-500">{t.device_type} {t.device_brand}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-red-500 text-sm hover:underline">Delete</button>
              </div>
            </div>
            <div className="space-y-1">
              {t.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span>{item.description} <span className="text-xs text-gray-400">({item.cost_type})</span></span>
                  <span>
                    {item.cost_type === 'labor' && item.hours && item.hourly_rate
                      ? `${item.hours}hrs @ $${parseFloat(item.hourly_rate).toFixed(2)}/hr`
                      : `$${parseFloat(item.amount).toFixed(2)}`}
                  </span>
                </div>
              ))}
              {t.items.length === 0 && <p className="text-sm text-gray-400">No items</p>}
            </div>
          </div>
        ))}
        {templates.length === 0 && !editing && (
          <p className="text-gray-500 text-center py-8">No templates yet. Create one to speed up common repairs.</p>
        )}
      </div>
    </div>
  );
}
