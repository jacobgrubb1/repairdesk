import { useState } from 'react';
import api from '../api/client';

const COST_TYPES = ['part', 'labor', 'other'];

export default function CostBreakdown({ ticketId, costs, onUpdate, ticket }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: '', costType: 'part', amount: '' });

  const total = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    await api.post(`/tickets/${ticketId}/costs`, {
      ...form,
      amount: parseFloat(form.amount),
    });
    setForm({ description: '', costType: 'part', amount: '' });
    setAdding(false);
    onUpdate();
  }

  async function handleDelete(costId) {
    await api.delete(`/tickets/${ticketId}/costs/${costId}`);
    onUpdate();
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h2 className="font-semibold mb-3">Costs</h2>
      <div className="space-y-2 mb-3">
        {costs.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-sm">
            <div>
              <p>{c.description}</p>
              <p className="text-xs text-gray-400">{c.cost_type}</p>
            </div>
            <div className="flex items-center gap-2">
              <span>${parseFloat(c.amount).toFixed(2)}</span>
              <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 text-xs">x</button>
            </div>
          </div>
        ))}
        {costs.length === 0 && <p className="text-sm text-gray-400">No costs added</p>}
      </div>

      <div className="border-t pt-2 flex justify-between font-semibold text-sm">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>

      {ticket?.estimated_cost && (
        <p className="text-xs text-gray-400 mt-1">Estimated: ${parseFloat(ticket.estimated_cost).toFixed(2)}</p>
      )}

      {adding ? (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <select value={form.costType} onChange={(e) => setForm({ ...form, costType: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm">
              {COST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="$" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">Add</button>
            <button type="button" onClick={() => setAdding(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 text-blue-600 text-sm hover:underline">+ Add cost</button>
      )}
    </div>
  );
}
