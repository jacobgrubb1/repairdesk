import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  awaiting_approval: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    api.get(`/customers/${id}`).then(({ data }) => {
      setCustomer(data);
      setForm({ name: data.name, email: data.email || '', phone: data.phone || '' });
    });
    api.get(`/tickets?customerId=${id}`).then(({ data }) => setTickets(data));
  }, [id]);

  async function handleSave() {
    const { data } = await api.put(`/customers/${id}`, form);
    setCustomer(data);
    setEditing(false);
  }

  if (!customer) return <p>Loading...</p>;

  return (
    <div className="max-w-3xl">
      <Link to="/customers" className="text-sm text-blue-600 hover:underline">&larr; Back to customers</Link>

      <div className="bg-white rounded-xl shadow-sm border p-6 mt-3 mb-6">
        {editing ? (
          <div className="space-y-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Save</button>
              <button onClick={() => setEditing(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <p className="text-gray-500">{customer.email || 'No email'} {customer.phone ? `| ${customer.phone}` : ''}</p>
              <p className="text-sm text-gray-400 mt-1">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setEditing(true)} className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">Edit</button>
          </div>
        )}
      </div>

      <h2 className="font-semibold text-lg mb-3">Ticket History ({tickets.length})</h2>
      <div className="bg-white rounded-xl shadow-sm border divide-y">
        {tickets.map((t) => (
          <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">#{t.ticket_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                  {t.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500">{t.device_brand} {t.device_model} - {t.issue_description}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              {t.final_cost ? `$${parseFloat(t.final_cost).toFixed(2)}` : ''}
              <p className="text-xs">{new Date(t.created_at).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && <p className="p-4 text-gray-500 text-sm">No tickets for this customer</p>}
      </div>
    </div>
  );
}
