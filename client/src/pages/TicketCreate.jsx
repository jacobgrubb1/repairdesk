import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import PriceSuggestion from '../components/PriceSuggestion';

export default function TicketCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    deviceType: '',
    deviceBrand: '',
    deviceModel: '',
    issueDescription: '',
    estimatedCost: '',
    accessories: '',
    notifyCustomer: false,
  });
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/customers').then(({ data }) => setCustomers(data));
    api.get('/checklist/device-types').then(({ data }) => setDeviceTypes(data)).catch(() => {});
  }, []);

  async function handleCreateCustomer() {
    if (!newCustomer.name) return;
    try {
      const { data } = await api.post('/customers', newCustomer);
      setCustomers((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, customerId: data.id }));
      setCreatingCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create customer');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.customerId) return setError('Please select a customer');
    if (!form.issueDescription) return setError('Please describe the issue');

    setSubmitting(true);
    try {
      const { data } = await api.post('/tickets', {
        ...form,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
      });
      navigate(`/tickets/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Ticket</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer selection */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold mb-3">Customer</h2>
          {!creatingCustomer ? (
            <div className="space-y-3">
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
              <button type="button" onClick={() => setCreatingCustomer(true)} className="text-blue-600 text-sm hover:underline">
                + New customer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input placeholder="Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="button" onClick={handleCreateCustomer} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Save customer</button>
                <button type="button" onClick={() => setCreatingCustomer(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Device info */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold mb-3">Device</h2>
          <div className="grid grid-cols-3 gap-3">
            <select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select type...</option>
              {deviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Brand" value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Model" value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Accessories */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold mb-3">Accessories Received</h2>
          <input
            placeholder="Charger, case, SIM card, etc."
            value={form.accessories}
            onChange={(e) => setForm({ ...form, accessories: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Issue */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold mb-3">Issue</h2>
          <textarea
            placeholder="Describe the issue..."
            value={form.issueDescription}
            onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Estimated cost ($)"
            value={form.estimatedCost}
            onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
            className="mt-3 border rounded-lg px-3 py-2 text-sm w-48"
          />
          <PriceSuggestion
            deviceType={form.deviceType}
            issueDescription={form.issueDescription}
            onUseEstimate={(val) => setForm({ ...form, estimatedCost: val })}
          />
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.notifyCustomer}
              onChange={(e) => setForm({ ...form, notifyCustomer: e.target.checked })} />
            Notify customer of status updates
          </label>
        </div>

        <button type="submit" disabled={submitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2">
          {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
}
