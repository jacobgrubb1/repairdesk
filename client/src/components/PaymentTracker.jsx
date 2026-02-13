import { useState, useEffect } from 'react';
import api from '../api/client';

const METHODS = ['cash', 'card', 'check', 'other'];

export default function PaymentTracker({ ticketId, totalCost }) {
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'cash', note: '' });

  useEffect(() => {
    loadPayments();
  }, [ticketId]);

  function loadPayments() {
    api.get(`/tickets/${ticketId}/payments`).then(({ data }) => {
      setPayments(data.payments);
      setTotalPaid(data.totalPaid);
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount) return;
    await api.post(`/tickets/${ticketId}/payments`, {
      amount: parseFloat(form.amount),
      method: form.method,
      note: form.note,
    });
    setForm({ amount: '', method: 'cash', note: '' });
    setAdding(false);
    loadPayments();
  }

  async function handleDelete(id) {
    await api.delete(`/tickets/${ticketId}/payments/${id}`);
    loadPayments();
  }

  const balance = (parseFloat(totalCost) || 0) - totalPaid;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h2 className="font-semibold mb-3">Payments</h2>

      {payments.length > 0 && (
        <div className="space-y-2 mb-3">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="capitalize">{p.method} — ${parseFloat(p.amount).toFixed(2)}</p>
                {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()} {p.created_by_name && `by ${p.created_by_name}`}</p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs">x</button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total Cost</span>
          <span>${(parseFloat(totalCost) || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Paid</span>
          <span className="text-green-600">${totalPaid.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          <span>{balance > 0 ? 'Balance Due' : 'Fully Paid'}</span>
          <span>{balance > 0 ? `$${balance.toFixed(2)}` : balance < 0 ? `Overpaid $${Math.abs(balance).toFixed(2)}` : '$0.00'}</span>
        </div>
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input type="number" step="0.01" min="0" placeholder="Amount ($)" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
            <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm">
              {METHODS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
            </select>
          </div>
          <input placeholder="Note (optional)" value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">Record Payment</button>
            <button type="button" onClick={() => setAdding(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
          {balance > 0 && (
            <button type="button" onClick={() => setForm({ ...form, amount: balance.toFixed(2) })}
              className="text-blue-600 text-xs hover:underline">
              Pay remaining balance (${balance.toFixed(2)})
            </button>
          )}
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="text-blue-600 text-sm hover:underline mt-3">
          + Record payment
        </button>
      )}
    </div>
  );
}
