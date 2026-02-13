import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const COST_TYPES = ['part', 'labor', 'other'];

function GeneralTab({ store, setStore, saving, handleSave }) {
  const { toast } = useToast();

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Store Info */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">Store Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Store Name</label>
            <input value={store.name || ''} onChange={e => setStore({ ...store, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <input value={store.address || ''} onChange={e => setStore({ ...store, address: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input value={store.phone || ''} onChange={e => setStore({ ...store, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input value={store.email || ''} onChange={e => setStore({ ...store, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Store Logo</label>
            {store.logo_url && (
              <div className="mb-3 flex items-center gap-3">
                <img src={store.logo_url} alt="Store logo" className="h-16 border rounded-lg object-contain bg-gray-50 p-1" />
                <button type="button" onClick={() => setStore({ ...store, logo_url: '' })}
                  className="text-red-500 text-sm hover:underline">Remove</button>
              </div>
            )}
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('Image must be under 2MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setStore({ ...store, logo_url: reader.result });
                    reader.readAsDataURL(file);
                  }} />
                  <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG - Max 2MB</p>
                </label>
              </div>
              <div className="text-xs text-gray-400 pt-4">or</div>
              <div className="flex-1">
                <input value={store.logo_url?.startsWith('data:') ? '' : (store.logo_url || '')}
                  onChange={e => setStore({ ...store, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Paste an image URL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">Financial Settings</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tax Rate (%)</label>
          <input type="number" step="0.01" min="0" max="100"
            value={store.tax_rate || 0}
            onChange={e => setStore({ ...store, tax_rate: parseFloat(e.target.value) || 0 })}
            className="w-48 border rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Applied to receipts. Set 0 for no tax.</p>
        </div>
      </div>

      {/* Payment Integration */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">Payment Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Connect Stripe to accept online payments from customers via the tracking portal.
          Get your API keys from the{' '}
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline">Stripe Dashboard</a>.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Publishable Key</label>
            <input value={store.stripe_publishable_key || ''}
              onChange={e => setStore({ ...store, stripe_publishable_key: e.target.value })}
              placeholder="pk_test_..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            <p className="text-xs text-gray-400 mt-1">Starts with pk_test_ or pk_live_</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Secret Key</label>
            <input type="password" value={store.stripe_secret_key || ''}
              onChange={e => setStore({ ...store, stripe_secret_key: e.target.value })}
              placeholder="sk_test_..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            <p className="text-xs text-gray-400 mt-1">Starts with sk_test_ or sk_live_. Never share this key.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Webhook Secret</label>
            <input type="password" value={store.stripe_webhook_secret || ''}
              onChange={e => setStore({ ...store, stripe_webhook_secret: e.target.value })}
              placeholder="whsec_..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            <p className="text-xs text-gray-400 mt-1">
              Found in Stripe Dashboard &rarr; Developers &rarr; Webhooks. Required for automatic payment recording.
            </p>
          </div>
        </div>
      </div>

      {/* Warranty */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">Warranty Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Default Warranty Period (days)</label>
            <input type="number" min="0"
              value={store.warranty_days || 30}
              onChange={e => setStore({ ...store, warranty_days: parseInt(e.target.value) || 0 })}
              className="w-48 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Warranty Terms</label>
            <textarea value={store.warranty_terms || ''} onChange={e => setStore({ ...store, warranty_terms: e.target.value })}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">Receipt Customization</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Receipt Footer Message</label>
          <textarea value={store.receipt_footer || ''} onChange={e => setStore({ ...store, receipt_footer: e.target.value })}
            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Thank you for your business!" />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2">
        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Create reusable repair templates to speed up common jobs.</p>
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

function CannedResponsesTab() {
  const [responses, setResponses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });

  function load() {
    api.get('/canned-responses').then(({ data }) => setResponses(data));
  }
  useEffect(load, []);

  function startNew() {
    setForm({ title: '', content: '', category: '' });
    setEditing('new');
  }

  function startEdit(r) {
    setForm({ title: r.title, content: r.content, category: r.category || '' });
    setEditing(r.id);
  }

  async function handleSave() {
    if (!form.title || !form.content) return;
    if (editing === 'new') {
      await api.post('/canned-responses', form);
    } else {
      await api.put(`/canned-responses/${editing}`, form);
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    await api.delete(`/canned-responses/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Quick reply templates for ticket notes.</p>
        <button onClick={startNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Response</button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-3">
          <h2 className="font-semibold">{editing === 'new' ? 'New Canned Response' : 'Edit Canned Response'}</h2>
          <input placeholder="Title (e.g. Repair Complete)" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Category (optional)" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Message content..." value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Save</button>
            <button onClick={() => setEditing(null)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {responses.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{r.title}</h3>
                {r.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.category}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(r)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-red-500 text-sm hover:underline">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.content}</p>
          </div>
        ))}
        {responses.length === 0 && !editing && (
          <p className="text-gray-500 text-center py-8">No canned responses yet. Create one to speed up ticket communication.</p>
        )}
      </div>
    </div>
  );
}

export default function StoreSettings() {
  const [store, setStore] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();

  useEffect(() => {
    api.get('/store').then(({ data }) => setStore(data));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/store', {
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        taxRate: store.tax_rate,
        warrantyDays: store.warranty_days,
        warrantyTerms: store.warranty_terms,
        receiptFooter: store.receipt_footer,
        logoUrl: store.logo_url,
        stripeSecretKey: store.stripe_secret_key,
        stripePublishableKey: store.stripe_publishable_key,
        stripeWebhookSecret: store.stripe_webhook_secret,
      });
      setStore(data);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  if (!store) return <LoadingSpinner size="lg" className="py-12" />;

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'templates', label: 'Templates' },
    { id: 'canned', label: 'Canned Responses' },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Store Settings</h1>

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

      {activeTab === 'general' && <GeneralTab store={store} setStore={setStore} saving={saving} handleSave={handleSave} />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'canned' && <CannedResponsesTab />}
    </div>
  );
}
