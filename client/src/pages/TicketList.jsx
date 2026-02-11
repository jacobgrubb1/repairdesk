import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const STATUSES = ['', 'intake', 'diagnosing', 'awaiting_approval', 'in_repair', 'completed', 'picked_up', 'cancelled'];
const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  awaiting_approval: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get(`/tickets?${params}`).then(({ data }) => setTickets(data));
  }, [search, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Link to="/tickets/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          New Ticket
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border divide-y">
        {tickets.map((t) => (
          <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">#{t.ticket_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                  {t.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {t.customer_name} &middot; {t.device_brand} {t.device_model}
              </p>
              <p className="text-sm text-gray-400 truncate">{t.issue_description}</p>
            </div>
            <div className="text-right text-sm text-gray-500 shrink-0 ml-4">
              <p>{t.final_cost ? `$${parseFloat(t.final_cost).toFixed(2)}` : t.estimated_cost ? `~$${parseFloat(t.estimated_cost).toFixed(2)}` : ''}</p>
              <p className="text-xs">{new Date(t.created_at).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <p className="p-8 text-center text-gray-500">No tickets found</p>
        )}
      </div>
    </div>
  );
}
