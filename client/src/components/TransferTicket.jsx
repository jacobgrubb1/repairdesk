import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function TransferTicket({ ticketId, onTransferred }) {
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [toStoreId, setToStoreId] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/org/stores').then(({ data }) => setStores(data)).catch(() => {});
    }
  }, [open]);

  async function handleTransfer() {
    if (!toStoreId) return;
    setTransferring(true);
    try {
      await api.post(`/org/transfer/${ticketId}`, { toStoreId, reason });
      setOpen(false);
      if (onTransferred) onTransferred();
    } catch (err) {
      toast.error('Transfer failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTransferring(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="border border-orange-300 text-orange-700 px-3 py-1.5 rounded-lg text-sm hover:bg-orange-50">
        Transfer to Store
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Transfer Ticket</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destination Store</label>
            <select value={toStoreId} onChange={e => setToStoreId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select store...</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={2} placeholder="Why is this ticket being transferred?"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleTransfer} disabled={!toStoreId || transferring}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
            {transferring ? 'Transferring...' : 'Transfer'}
          </button>
          <button onClick={() => setOpen(false)}
            className="text-gray-500 px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
