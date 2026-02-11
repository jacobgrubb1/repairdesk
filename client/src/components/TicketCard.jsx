import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  awaiting_approval: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TicketCard({ ticket }) {
  return (
    <Link to={`/tickets/${ticket.id}`} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">#{ticket.ticket_number}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
          {ticket.status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-600">{ticket.customer_name}</p>
      <p className="text-sm text-gray-400">{ticket.device_brand} {ticket.device_model}</p>
    </Link>
  );
}
