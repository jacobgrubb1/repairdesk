import { useState } from 'react';
import api from '../api/client';
import TemplateSelector from './TemplateSelector';
import PartSelector from './PartSelector';

const COST_TYPES = ['part', 'labor', 'other'];

export default function CostBreakdown({ ticketId, costs, onUpdate, ticket }) {
  const [adding, setAdding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [costError, setCostError] = useState('');
  const [form, setForm] = useState({ description: '', costType: 'part', amount: '', hours: '', hourlyRate: '', partId: null, quantity: '1', unitPrice: '' });

  const total = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  async function handleAdd(e) {
    e.preventDefault();
    setCostError('');
    if (!form.description) return;
    try {
    if (form.costType === 'labor') {
      if (!form.hours || !form.hourlyRate) return;
      await api.post(`/tickets/${ticketId}/costs`, {
        description: form.description,
        costType: 'labor',
        hours: parseFloat(form.hours),
        hourlyRate: parseFloat(form.hourlyRate),
        amount: parseFloat(form.hours) * parseFloat(form.hourlyRate),
      });
    } else {
      if (!form.amount) return;
      await api.post(`/tickets/${ticketId}/costs`, {
        description: form.description,
        costType: form.costType,
        amount: parseFloat(form.amount),
        partId: form.partId || undefined,
        quantity: form.partId ? parseInt(form.quantity) || 1 : 1,
      });
    }
    setForm({ description: '', costType: 'part', amount: '', hours: '', hourlyRate: '', partId: null, quantity: '1', unitPrice: '' });
    setAdding(false);
    onUpdate();
    } catch (err) {
      setCostError(err.response?.data?.error || 'Failed to add cost');
    }
  }

  async function handleDelete(costId) {
    await api.delete(`/tickets/${ticketId}/costs/${costId}`);
    onUpdate();
  }

  function formatCost(c) {
    if (c.cost_type === 'labor' && c.hours && c.hourly_rate) {
      return `${c.hours}hrs @ $${parseFloat(c.hourly_rate).toFixed(2)}/hr = $${parseFloat(c.amount).toFixed(2)}`;
    }
    if (c.part_id && c.quantity > 1) {
      const unitPrice = (parseFloat(c.amount) / c.quantity).toFixed(2);
      return `${c.quantity} x $${unitPrice} = $${parseFloat(c.amount).toFixed(2)}`;
    }
    return `$${parseFloat(c.amount).toFixed(2)}`;
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
              <span className="text-right text-xs">{formatCost(c)}</span>
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

      {costError && <p className="text-red-500 text-xs mt-2">{costError}</p>}

      {adding ? (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          <select value={form.costType} onChange={(e) => setForm({ ...form, costType: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm">
            {COST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {form.costType === 'labor' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="number" step="0.25" min="0" placeholder="Hours" value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" step="0.01" min="0" placeholder="$/hr" value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              {form.hours && form.hourlyRate && (
                <p className="text-xs text-gray-500">
                  = ${(parseFloat(form.hours || 0) * parseFloat(form.hourlyRate || 0)).toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <input type="number" step="0.01" placeholder="Amount ($)" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              {form.costType === 'part' && (
                <div className="relative mt-1">
                  {form.partId ? (
                    <div className="space-y-1">
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        Linked to inventory part
                        <button type="button" onClick={() => setForm({ ...form, partId: null, quantity: '1', unitPrice: '' })} className="text-red-400">x</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Qty:</label>
                        <input type="number" min="1" value={form.quantity}
                          onChange={(e) => {
                            const qty = e.target.value;
                            const total = form.unitPrice ? (parseFloat(form.unitPrice) * (parseInt(qty) || 1)).toFixed(2) : form.amount;
                            setForm({ ...form, quantity: qty, amount: total });
                          }}
                          className="w-16 border rounded px-2 py-1 text-sm" />
                        <span className="text-xs text-gray-400">x ${form.unitPrice} = ${form.amount}</span>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowPartSelector(true)}
                      className="text-xs text-blue-600 hover:underline">Link inventory part</button>
                  )}
                  {showPartSelector && (
                    <PartSelector
                      onSelect={(part) => {
                        const price = parseFloat(part.sell_price);
                        setForm({ ...form, description: part.name, amount: price.toFixed(2), partId: part.id, quantity: '1', unitPrice: price.toFixed(2) });
                        setShowPartSelector(false);
                      }}
                      onClose={() => setShowPartSelector(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">Add</button>
            <button type="button" onClick={() => setAdding(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex gap-3">
          <button onClick={() => setAdding(true)} className="text-blue-600 text-sm hover:underline">+ Add cost</button>
          <button onClick={() => setShowTemplates(true)} className="text-purple-600 text-sm hover:underline">Apply template</button>
        </div>
      )}

      {showTemplates && (
        <TemplateSelector
          ticketId={ticketId}
          onApplied={() => { setShowTemplates(false); onUpdate(); }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
