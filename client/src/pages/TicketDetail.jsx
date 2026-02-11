import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import NoteForm from '../components/NoteForm';
import CostBreakdown from '../components/CostBreakdown';
import Receipt from '../components/Receipt';

const STATUS_ORDER = ['intake', 'diagnosing', 'awaiting_approval', 'in_repair', 'completed', 'picked_up', 'cancelled'];
const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  awaiting_approval: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);

  function load() {
    api.get(`/tickets/${id}`).then(({ data }) => setTicket(data));
    api.get(`/tickets/${id}/notes`).then(({ data }) => setNotes(data));
    api.get(`/tickets/${id}/costs`).then(({ data }) => setCosts(data));
  }

  useEffect(load, [id]);

  async function updateStatus(status) {
    const { data } = await api.put(`/tickets/${id}`, { status });
    setTicket(data);
  }

  async function updateField(field, value) {
    const { data } = await api.put(`/tickets/${id}`, { [field]: value });
    setTicket(data);
  }

  if (!ticket) return <p>Loading...</p>;

  if (showReceipt) {
    return (
      <div>
        <div className="print:hidden mb-4 flex gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Print</button>
          <button onClick={() => setShowReceipt(false)} className="border px-4 py-2 rounded-lg text-sm">Back</button>
        </div>
        <Receipt ticket={ticket} costs={costs} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/tickets" className="text-sm text-blue-600 hover:underline">&larr; Back to tickets</Link>
          <h1 className="text-2xl font-bold mt-1">Ticket #{ticket.ticket_number}</h1>
          <p className="text-gray-500">
            {ticket.customer_name} &middot; {ticket.device_brand} {ticket.device_model}
          </p>
        </div>
        <button onClick={() => setShowReceipt(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
          Print Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    ticket.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Issue & Diagnosis */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-2">Issue</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.issue_description}</p>
            <h2 className="font-semibold mt-4 mb-2">Diagnosis</h2>
            <textarea
              defaultValue={ticket.diagnosis || ''}
              onBlur={(e) => updateField('diagnosis', e.target.value)}
              placeholder="Enter diagnosis..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Notes timeline */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Notes</h2>
            <div className="space-y-3 mb-4">
              {notes.map((note) => (
                <div key={note.id} className={`p-3 rounded-lg text-sm ${note.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium">{note.user_name}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  {note.is_internal && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded mb-1 inline-block">Internal</span>}
                  <p className="whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet</p>}
            </div>
            <NoteForm ticketId={id} onAdded={(note) => setNotes((prev) => [...prev, note])} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-white rounded-xl shadow-sm border p-4 text-sm space-y-2">
            <h2 className="font-semibold mb-2">Details</h2>
            <p><span className="text-gray-500">Customer:</span> <Link to={`/customers/${ticket.customer_id}`} className="text-blue-600 hover:underline">{ticket.customer_name}</Link></p>
            <p><span className="text-gray-500">Phone:</span> {ticket.customer_phone || '-'}</p>
            <p><span className="text-gray-500">Device:</span> {ticket.device_type} {ticket.device_brand} {ticket.device_model}</p>
            <p><span className="text-gray-500">Created:</span> {new Date(ticket.created_at).toLocaleString()}</p>
            <p><span className="text-gray-500">Assigned to:</span> {ticket.assigned_to_name || 'Unassigned'}</p>
            {ticket.completed_at && <p><span className="text-gray-500">Completed:</span> {new Date(ticket.completed_at).toLocaleString()}</p>}
          </div>

          {/* Costs */}
          <CostBreakdown ticketId={id} costs={costs} onUpdate={load} ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
