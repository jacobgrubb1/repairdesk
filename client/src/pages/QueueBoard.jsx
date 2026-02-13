import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const COLUMNS = [
  { status: 'intake', label: 'Intake', color: 'border-gray-400', bg: 'bg-gray-50' },
  { status: 'diagnosing', label: 'Diagnosing', color: 'border-yellow-400', bg: 'bg-yellow-50' },
  { status: 'awaiting_approval', label: 'Awaiting Approval', color: 'border-orange-400', bg: 'bg-orange-50' },
  { status: 'in_repair', label: 'In Repair', color: 'border-blue-400', bg: 'bg-blue-50' },
  { status: 'completed', label: 'Completed', color: 'border-green-400', bg: 'bg-green-50' },
];

export default function QueueBoard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    loadTickets();
  }, []);

  function loadTickets() {
    api.get('/tickets').then(({ data }) => setTickets(data));
  }

  function getColumnTickets(status) {
    return tickets.filter(t => t.status === status);
  }

  function handleDragStart(e, ticket) {
    setDragging(ticket);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, status) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(status);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.status === newStatus) {
      setDragging(null);
      return;
    }

    // Optimistic update
    setTickets(prev => prev.map(t => t.id === dragging.id ? { ...t, status: newStatus } : t));
    setDragging(null);

    try {
      await api.put(`/tickets/${dragging.id}`, { status: newStatus });
    } catch {
      loadTickets(); // Revert on failure
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Queue Board</h1>
        <div className="flex gap-2">
          <Link to="/tickets/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            New Ticket
          </Link>
          <button onClick={loadTickets} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {COLUMNS.map(col => {
          const colTickets = getColumnTickets(col.status);
          return (
            <div key={col.status}
              className={`flex-shrink-0 w-72 rounded-xl border-t-4 ${col.color} bg-white shadow-sm`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className={`p-3 border-b ${col.bg} rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border font-medium">{colTickets.length}</span>
                </div>
              </div>
              <div className={`p-2 space-y-2 min-h-[200px] transition-colors ${dragOver === col.status ? 'bg-blue-50' : ''}`}>
                {colTickets.map(ticket => (
                  <div key={ticket.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket)}
                    className={`bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      dragging?.id === ticket.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Link to={`/tickets/${ticket.id}`} className="font-semibold text-sm text-blue-600 hover:underline">
                        #{ticket.ticket_number}
                      </Link>
                      <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.customer_name}</p>
                    <p className="text-xs text-gray-500 truncate">{ticket.device_brand} {ticket.device_model}</p>
                    <p className="text-xs text-gray-400 truncate mt-1">{ticket.issue_description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-gray-400">{ticket.assigned_to_name || 'Unassigned'}</span>
                      <div className="flex items-center gap-1">
                        {ticket.final_cost > 0 && (() => {
                          const paid = parseFloat(ticket.total_paid) || 0;
                          const cost = parseFloat(ticket.final_cost);
                          if (paid >= cost) return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>;
                          if (paid > 0) return <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Partial</span>;
                          return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Unpaid</span>;
                        })()}
                        {ticket.final_cost > 0 && (
                          <span className="text-xs font-medium">${parseFloat(ticket.final_cost).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {colTickets.length === 0 && (
                  <p className="text-center text-xs text-gray-300 py-8">No tickets</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
