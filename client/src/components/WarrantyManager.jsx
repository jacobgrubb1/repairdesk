import { useState, useEffect } from 'react';
import api from '../api/client';

export default function WarrantyManager({ ticketId, ticketStatus }) {
  const [warranty, setWarranty] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.get(`/tickets/${ticketId}/warranty`).then(({ data }) => {
      setWarranty(data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [ticketId]);

  async function createWarranty() {
    setCreating(true);
    try {
      const { data } = await api.post(`/tickets/${ticketId}/warranty`, { warrantyDays: days });
      setWarranty(data);
    } catch (err) {
      console.error('Failed to create warranty', err);
    } finally {
      setCreating(false);
    }
  }

  async function updateDays(newDays) {
    if (!warranty) return;
    const { data } = await api.put(`/warranties/${warranty.id}`, { warrantyDays: newDays });
    setWarranty(data);
  }

  if (!loaded) return null;

  const isCompleted = ['completed', 'picked_up'].includes(ticketStatus);

  if (warranty) {
    const startDate = new Date(warranty.start_date);
    const expiresDate = new Date(startDate);
    expiresDate.setDate(expiresDate.getDate() + warranty.warranty_days);
    const now = new Date();
    const isActive = now <= expiresDate;
    const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));

    return (
      <div className={`rounded-lg border p-3 ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Warranty</h3>
          {isActive ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Active — {daysLeft} days left
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Expired</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <p>Duration: {warranty.warranty_days} days</p>
          <p>Start: {startDate.toLocaleDateString()}</p>
          <p>Expires: {expiresDate.toLocaleDateString()}</p>
        </div>
        {warranty.warranty_terms && (
          <p className="text-xs text-gray-400 mt-2 italic">{warranty.warranty_terms}</p>
        )}
      </div>
    );
  }

  if (!isCompleted) return null;

  return (
    <div className="border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-2">Add Warranty</h3>
      <div className="flex items-center gap-2">
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
          <option value={365}>1 year</option>
        </select>
        <button onClick={createWarranty} disabled={creating}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
          {creating ? 'Adding...' : 'Add Warranty'}
        </button>
      </div>
    </div>
  );
}
