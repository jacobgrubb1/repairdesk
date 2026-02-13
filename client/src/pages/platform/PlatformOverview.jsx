import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Store, Users, Ticket, DollarSign } from 'lucide-react';

export default function PlatformOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/platform/metrics')
      .then(({ data }) => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading metrics...</p>;
  if (!metrics) return <p className="text-red-500">Failed to load metrics.</p>;

  const cards = [
    { label: 'Total Stores', value: metrics.totalStores, icon: Store, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Total Tickets', value: metrics.totalTickets, icon: Ticket, color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Revenue', value: `$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-yellow-50 text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-lg border p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
