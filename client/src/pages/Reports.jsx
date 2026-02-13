import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const TABS = ['overview', 'revenue', 'customers', 'devices', 'turnaround', 'payments'];

export default function Reports() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('overview');
  const [monthly, setMonthly] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [turnaround, setTurnaround] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [techPerf, setTechPerf] = useState(null);

  useEffect(() => {
    api.get(`/reports/monthly?month=${month}&year=${year}`).then(({ data }) => setMonthly(data));
    api.get(`/reports/top-customers?month=${month}&year=${year}`).then(({ data }) => setTopCustomers(data)).catch(() => {});
    api.get(`/reports/device-types?month=${month}&year=${year}`).then(({ data }) => setDeviceTypes(data)).catch(() => {});
    api.get(`/reports/payments?month=${month}&year=${year}`).then(({ data }) => setPaymentBreakdown(data)).catch(() => {});
    if (user.role === 'admin') {
      api.get(`/reports/tech-performance?month=${month}&year=${year}`).then(({ data }) => setTechPerf(data)).catch(() => {});
    }
  }, [month, year]);

  useEffect(() => {
    api.get('/reports/revenue-trend').then(({ data }) => setTrend(data)).catch(() => {});
    api.get('/reports/turnaround').then(({ data }) => setTurnaround(data)).catch(() => {});
  }, []);

  const maxRevenue = Math.max(...trend.map(t => t.revenue), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm w-24" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && monthly && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tickets" value={monthly.total_tickets} />
            <StatCard label="Completed" value={monthly.completed_tickets} />
            <StatCard label="Revenue" value={`$${parseFloat(monthly.total_revenue).toFixed(2)}`} />
            <StatCard label="Parts Cost" value={`$${parseFloat(monthly.total_parts_cost).toFixed(2)}`} />
          </div>
          {monthly.cost_breakdown?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Cost Breakdown</h3>
              <div className="space-y-3">
                {monthly.cost_breakdown.map(cb => (
                  <div key={cb.cost_type} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-500 capitalize">{cb.cost_type}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className={`h-full rounded-full ${cb.cost_type === 'part' ? 'bg-blue-500' : cb.cost_type === 'labor' ? 'bg-green-500' : 'bg-gray-400'}`}
                        style={{ width: `${Math.max(5, (cb.total / Math.max(...monthly.cost_breakdown.map(x => x.total), 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">${parseFloat(cb.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monthly.status_counts?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Tickets by Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {monthly.status_counts.map(s => (
                  <div key={s.status} className="border rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs text-gray-500 capitalize">{s.status.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Trend Tab */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Revenue Trend (12 months)</h3>
            {trend.length > 0 ? (
              <div className="space-y-2">
                {trend.map(row => (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-gray-500 font-mono">{row.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                        ${parseFloat(row.revenue).toFixed(0)} ({row.tickets} tickets)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No data available</p>}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Parts vs Labor Revenue (12 months)</h3>
            {trend.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Month</th>
                    <th className="text-right p-3">Tickets</th>
                    <th className="text-right p-3">Parts</th>
                    <th className="text-right p-3">Labor</th>
                    <th className="text-right p-3">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map(row => (
                    <tr key={row.month} className="border-b">
                      <td className="p-3 font-mono">{row.month}</td>
                      <td className="p-3 text-right">{row.tickets}</td>
                      <td className="p-3 text-right">${parseFloat(row.parts_cost).toFixed(2)}</td>
                      <td className="p-3 text-right">${parseFloat(row.labor_cost).toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">${parseFloat(row.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-gray-400">No data available</p>}
          </div>
        </div>
      )}

      {/* Top Customers Tab */}
      {tab === 'customers' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Top Customers by Spend</h3>
          {topCustomers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-right p-3">Tickets</th>
                  <th className="text-right p-3">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 text-gray-400">{i + 1}</td>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-gray-500">{c.phone || '-'}</td>
                    <td className="p-3 text-right">{c.ticket_count}</td>
                    <td className="p-3 text-right font-semibold">${parseFloat(c.total_spent).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No completed tickets this month</p>}
        </div>
      )}

      {/* Devices Tab */}
      {tab === 'devices' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Revenue by Device Type</h3>
          {deviceTypes.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Device Type</th>
                  <th className="text-left p-3">Brand</th>
                  <th className="text-right p-3">Tickets</th>
                  <th className="text-right p-3">Revenue</th>
                  <th className="text-right p-3">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody>
                {deviceTypes.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3">{d.device_type}</td>
                    <td className="p-3">{d.device_brand}</td>
                    <td className="p-3 text-right">{d.ticket_count}</td>
                    <td className="p-3 text-right font-semibold">${parseFloat(d.revenue).toFixed(2)}</td>
                    <td className="p-3 text-right">{d.avg_hours ? `${parseFloat(d.avg_hours).toFixed(1)}h` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No data this month</p>}
        </div>
      )}

      {/* Turnaround Tab */}
      {tab === 'turnaround' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Average Repair Turnaround Time</h3>
          {turnaround.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Month</th>
                  <th className="text-right p-3">Completed</th>
                  <th className="text-right p-3">Avg Hours</th>
                  <th className="text-right p-3">Fastest</th>
                  <th className="text-right p-3">Slowest</th>
                </tr>
              </thead>
              <tbody>
                {turnaround.map(row => (
                  <tr key={row.month} className="border-b">
                    <td className="p-3 font-mono">{row.month}</td>
                    <td className="p-3 text-right">{row.completed}</td>
                    <td className="p-3 text-right font-semibold">{row.avg_hours ? `${parseFloat(row.avg_hours).toFixed(1)}h` : '-'}</td>
                    <td className="p-3 text-right text-green-600">{row.min_hours ? `${parseFloat(row.min_hours).toFixed(1)}h` : '-'}</td>
                    <td className="p-3 text-right text-red-600">{row.max_hours ? `${parseFloat(row.max_hours).toFixed(1)}h` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Payment Method Breakdown</h3>
            {paymentBreakdown.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {paymentBreakdown.map(p => (
                  <div key={p.method} className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">${parseFloat(p.total).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 capitalize">{p.method}</p>
                    <p className="text-xs text-gray-400">{p.count} payments</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No payments recorded this month</p>}
          </div>

          {/* Tech Performance (admin) */}
          {user.role === 'admin' && techPerf?.technicians?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Technician Performance</h3>
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
                  {techPerf.technicians.map(t => (
                    <tr key={t.id} className="border-b">
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3 text-right">{t.total_tickets}</td>
                      <td className="p-3 text-right">{t.completed_tickets}</td>
                      <td className="p-3 text-right">${parseFloat(t.revenue).toFixed(2)}</td>
                      <td className="p-3 text-right">{t.avg_completion_hours ? `${parseFloat(t.avg_completion_hours).toFixed(1)}h` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
