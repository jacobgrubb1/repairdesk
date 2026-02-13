import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [techPerf, setTechPerf] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    api.get(`/reports/monthly?month=${month}&year=${year}`).then(({ data }) => setReport(data));
    api.get('/tickets').then(({ data }) => {
      setRecentTickets(data.slice(0, 5));
      // For technicians: filter to show their assigned tickets
      if (user.role === 'technician') {
        setMyTickets(data.filter(t => t.assigned_to === user.id && !['completed', 'picked_up', 'cancelled'].includes(t.status)));
      }
    });
    if (user.role === 'admin') {
      api.get(`/reports/tech-performance?month=${month}&year=${year}`).then(({ data }) => setTechPerf(data)).catch(() => {});
      api.get('/parts/low-stock').then(({ data }) => setLowStock(data)).catch(() => {});
    }
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

      {/* Quick stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tech Quick Stats Bar (non-admin) */}
      {user.role !== 'admin' && myTickets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <h2 className="font-semibold text-blue-800 mb-3">My Queue ({myTickets.length} active)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTickets.map(t => (
              <Link key={t.id} to={`/tickets/${t.id}`}
                className="bg-white rounded-lg border p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">#{t.ticket_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm">{t.customer_name}</p>
                <p className="text-xs text-gray-500">{t.device_brand} {t.device_model}</p>
                <p className="text-xs text-gray-400 truncate mt-1">{t.issue_description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent tickets */}
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
              <div className="p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-400 text-sm">No tickets yet</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Tech Performance (admin only) */}
      {user.role === 'admin' && techPerf?.technicians?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border mb-8">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Technician Performance</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">Technician</th>
                <th className="text-right p-3">Tickets</th>
                <th className="text-right p-3">Completed</th>
                <th className="text-right p-3">Revenue</th>
                <th className="text-right p-3">Avg Hours</th>
              </tr>
            </thead>
            <tbody>
              {techPerf.technicians.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 text-right">{t.total_tickets}</td>
                  <td className="p-3 text-right">{t.completed_tickets}</td>
                  <td className="p-3 text-right">${parseFloat(t.revenue).toFixed(2)}</td>
                  <td className="p-3 text-right">{t.avg_completion_hours ? parseFloat(t.avg_completion_hours).toFixed(1) + 'h' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Low Stock Alerts (admin only) */}
      {user.role === 'admin' && lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-red-800">Low Stock Alerts ({lowStock.length})</h2>
            <Link to="/inventory" className="text-red-600 text-sm hover:underline">View Inventory</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.slice(0, 6).map(p => (
              <div key={p.id} className="bg-white rounded-lg border border-red-100 p-3">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{p.sku || 'No SKU'}</p>
                <p className="text-sm mt-1">
                  <span className="text-red-600 font-bold">{p.quantity}</span>
                  <span className="text-gray-400"> / min {p.min_quantity}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3">
        <Link to="/queue" className="bg-white border rounded-lg px-4 py-3 hover:shadow-md transition-shadow text-sm">
          <span className="font-semibold">Queue Board</span>
          <p className="text-xs text-gray-500">Drag & drop view</p>
        </Link>
        <Link to="/reports" className="bg-white border rounded-lg px-4 py-3 hover:shadow-md transition-shadow text-sm">
          <span className="font-semibold">Reports</span>
          <p className="text-xs text-gray-500">Detailed analytics</p>
        </Link>
        <Link to="/tickets/new" className="bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition-colors text-sm">
          <span className="font-semibold">New Ticket</span>
          <p className="text-xs text-blue-200">Create repair ticket</p>
        </Link>
      </div>
    </div>
  );
}
