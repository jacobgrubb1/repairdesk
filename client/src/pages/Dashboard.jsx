import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function Dashboard() {
  const [report, setReport] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    api.get(`/reports/monthly?month=${month}&year=${year}`).then(({ data }) => setReport(data));
    api.get('/tickets?limit=5').then(({ data }) => setRecentTickets(data.slice(0, 5)));
  }, [month, year]);

  const cards = report
    ? [
        { label: 'Total Tickets', value: report.total_tickets },
        { label: 'Completed', value: report.completed_tickets },
        { label: 'Revenue', value: `$${parseFloat(report.total_revenue).toFixed(2)}` },
        { label: 'Parts Cost', value: `$${parseFloat(report.total_parts_cost).toFixed(2)}` },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {report?.status_counts?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border mb-8">
          <h2 className="font-semibold mb-3">By Status</h2>
          <div className="flex flex-wrap gap-2">
            {report.status_counts.map((s) => (
              <span key={s.status} className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[s.status] || ''}`}>
                {s.status.replace(/_/g, ' ')}: {s.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Tickets</h2>
          <Link to="/tickets" className="text-blue-600 text-sm hover:underline">View all</Link>
        </div>
        <div className="divide-y">
          {recentTickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <span className="font-medium">#{t.ticket_number}</span>
                <span className="ml-2 text-gray-600">{t.customer_name}</span>
                <span className="ml-2 text-sm text-gray-400">{t.device_brand} {t.device_model}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>
                {t.status.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
          {recentTickets.length === 0 && (
            <p className="p-4 text-gray-500 text-sm">No tickets yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
