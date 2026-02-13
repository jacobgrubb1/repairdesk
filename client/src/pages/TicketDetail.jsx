import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import NoteForm from '../components/NoteForm';
import CostBreakdown from '../components/CostBreakdown';
import Receipt from '../components/Receipt';
import WorkOrder from '../components/WorkOrder';
import TagManager from '../components/TagManager';
import PaymentTracker from '../components/PaymentTracker';
import IntakeChecklist from '../components/IntakeChecklist';
import SignaturePad from '../components/SignaturePad';
import WarrantyManager from '../components/WarrantyManager';
import PhotoUpload from '../components/PhotoUpload';
import DiagnosisSuggestions from '../components/DiagnosisSuggestions';
import FeedbackDisplay from '../components/FeedbackDisplay';
import TrackingLink from '../components/TrackingLink';
import TransferTicket from '../components/TransferTicket';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailingInvoice, setEmailingInvoice] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [printMode, setPrintMode] = useState(null); // null | 'receipt' | 'workorder'
  const [techs, setTechs] = useState([]);
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [similarRepairs, setSimilarRepairs] = useState([]);

  function load() {
    api.get(`/tickets/${id}`).then(({ data }) => setTicket(data));
    api.get(`/tickets/${id}/notes`).then(({ data }) => setNotes(data));
    api.get(`/tickets/${id}/costs`).then(({ data }) => setCosts(data));
  }

  useEffect(() => {
    load();
    if (user.role === 'admin') {
      api.get('/users').then(({ data }) => setTechs(data.filter(u => u.is_active))).catch(() => {});
    }
    api.get(`/tickets/${id}/similar`).then(({ data }) => setSimilarRepairs(data)).catch(() => {});
  }, [id]);

  const CONFIRM_STATUSES = ['cancelled', 'picked_up', 'completed'];

  function handleStatusClick(status) {
    if (status === ticket.status) return;
    if (CONFIRM_STATUSES.includes(status)) {
      setConfirmStatus(status);
    } else {
      updateStatus(status);
    }
  }

  async function updateStatus(status) {
    const { data } = await api.put(`/tickets/${id}`, { status });
    setTicket(data);
    setConfirmStatus(null);
  }

  async function updateField(field, value) {
    const { data } = await api.put(`/tickets/${id}`, { [field]: value });
    setTicket(data);
  }

  async function handleApprove() {
    await updateStatus('in_repair');
  }

  async function handleReject() {
    if (rejectNote.trim()) {
      await api.post(`/tickets/${id}/notes`, { content: rejectNote, isInternal: false });
      setNotes(prev => [...prev, { id: Date.now(), content: rejectNote, user_name: user.name, created_at: new Date().toISOString() }]);
    }
    await updateStatus('diagnosing');
    setShowReject(false);
    setRejectNote('');
  }

  async function handleAssign(userId) {
    const { data } = await api.put(`/tickets/${id}`, { assignedTo: userId || null });
    setTicket(data);
  }

  async function handleSignature(field, dataUrl) {
    const { data } = await api.put(`/tickets/${id}`, { [field]: dataUrl });
    setTicket(data);
  }

  if (!ticket) return <LoadingSpinner size="lg" className="py-12" />;

  // Print modes
  if (printMode === 'receipt') {
    return (
      <div>
        <div className="print:hidden mb-4 flex gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Print</button>
          <button onClick={() => setPrintMode(null)} className="border px-4 py-2 rounded-lg text-sm">Back</button>
        </div>
        <Receipt ticket={ticket} costs={costs} />
      </div>
    );
  }

  if (printMode === 'workorder') {
    return (
      <div>
        <div className="print:hidden mb-4 flex gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Print</button>
          <button onClick={() => setPrintMode(null)} className="border px-4 py-2 rounded-lg text-sm">Back</button>
        </div>
        <WorkOrder ticket={ticket} costs={costs} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Approval Banner */}
      {ticket.status === 'awaiting_approval' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-orange-800">Approval Needed</h3>
              <p className="text-sm text-orange-700 mt-1">
                Estimated cost: <span className="font-bold">${ticket.estimated_cost ? parseFloat(ticket.estimated_cost).toFixed(2) : '0.00'}</span>
                {ticket.final_cost > 0 && <span> | Current costs: <span className="font-bold">${parseFloat(ticket.final_cost).toFixed(2)}</span></span>}
              </p>
            </div>
            {user.role === 'admin' && (
              <div className="flex gap-2">
                <button onClick={handleApprove} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Approve</button>
                <button onClick={() => setShowReject(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Reject</button>
              </div>
            )}
          </div>
          {showReject && (
            <div className="mt-3 space-y-2">
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason for rejection..." rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={handleReject} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm">Confirm Reject</button>
                <button onClick={() => setShowReject(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/tickets" className="text-sm text-blue-600 hover:underline">&larr; Back to tickets</Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold">Ticket #{ticket.ticket_number}</h1>
          </div>
          <p className="text-gray-500">
            {ticket.customer_name} &middot; {ticket.device_brand} {ticket.device_model}
          </p>
          <div className="mt-2">
            <TagManager ticketId={id} />
          </div>
        </div>
        <div className="flex gap-2">
          {user.org_role === 'org_admin' && (
            <TransferTicket ticketId={id} onTransferred={load} />
          )}
          <button onClick={() => setPrintMode('workorder')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Print Work Order
          </button>
          <button onClick={() => setPrintMode('receipt')} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
            Print Receipt
          </button>
        </div>
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
                  onClick={() => handleStatusClick(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    ticket.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Status confirmation modal */}
          {confirmStatus && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
                <h3 className="font-semibold text-lg mb-2">Confirm Status Change</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to change this ticket to <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[confirmStatus]}`}>{confirmStatus.replace(/_/g, ' ')}</span>?
                  {confirmStatus === 'cancelled' && ' This will mark the ticket as cancelled.'}
                  {confirmStatus === 'picked_up' && ' This indicates the customer has picked up their device.'}
                  {confirmStatus === 'completed' && ' This will mark the repair as complete.'}
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmStatus(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={() => updateStatus(confirmStatus)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Confirm</button>
                </div>
              </div>
            </div>
          )}

          {/* Issue & Diagnosis */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-2">Issue</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.issue_description}</p>
            <h2 className="font-semibold mt-4 mb-2">Diagnosis</h2>
            <textarea
              id="diagnosisField"
              defaultValue={ticket.diagnosis || ''}
              onBlur={(e) => updateField('diagnosis', e.target.value)}
              placeholder="Enter diagnosis..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {ticket.status === 'diagnosing' && (
              <DiagnosisSuggestions
                deviceType={ticket.device_type}
                issueDescription={ticket.issue_description}
                onSelectDiagnosis={(diag) => {
                  const el = document.getElementById('diagnosisField');
                  if (el) { el.value = diag; }
                  updateField('diagnosis', diag);
                }}
              />
            )}
          </div>

          {/* Photos */}
          <PhotoUpload ticketId={id} />

          {/* Intake Checklist */}
          <IntakeChecklist ticketId={id} deviceType={ticket.device_type} />

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

          {/* Signatures */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Signatures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad
                label="Intake Signature"
                existingSignature={ticket.intake_signature}
                onSave={(dataUrl) => handleSignature('intakeSignature', dataUrl)}
              />
              <SignaturePad
                label="Pickup Signature"
                existingSignature={ticket.pickup_signature}
                onSave={(dataUrl) => handleSignature('pickupSignature', dataUrl)}
              />
            </div>
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

            {/* Accessories */}
            <div>
              <span className="text-gray-500">Accessories:</span>
              <input
                defaultValue={ticket.accessories || ''}
                onBlur={e => updateField('accessories', e.target.value)}
                placeholder="Charger, case, etc."
                className="w-full border rounded px-2 py-1 text-sm mt-1"
              />
            </div>

            {/* Assign tech */}
            {user.role === 'admin' ? (
              <div>
                <span className="text-gray-500">Assigned to: </span>
                <select value={ticket.assigned_to || ''} onChange={(e) => handleAssign(e.target.value)}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="">Unassigned</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ) : (
              <p><span className="text-gray-500">Assigned to:</span> {ticket.assigned_to_name || 'Unassigned'}</p>
            )}

            {ticket.completed_at && <p><span className="text-gray-500">Completed:</span> {new Date(ticket.completed_at).toLocaleString()}</p>}

            {/* Notify customer toggle */}
            <label className="flex items-center gap-2 mt-2 pt-2 border-t">
              <input type="checkbox" checked={!!ticket.notify_customer}
                onChange={(e) => updateField('notifyCustomer', e.target.checked ? 1 : 0)} />
              <span className="text-gray-600">Notify customer</span>
            </label>
          </div>

          {/* Costs */}
          <CostBreakdown ticketId={id} costs={costs} onUpdate={load} ticket={ticket} />

          {/* Payments */}
          <PaymentTracker ticketId={id} totalCost={ticket.final_cost} />

          {/* Warranty */}
          <WarrantyManager ticketId={id} ticketStatus={ticket.status} />

          {/* Tracking Link */}
          <TrackingLink trackingToken={ticket.tracking_token} />

          {/* Invoice */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="font-semibold mb-3 text-sm">Invoice</h2>
            <div className="space-y-2">
              <button
                onClick={() => window.open(`/api/tickets/${id}/invoice`, '_blank')}
                className="w-full border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Download Invoice PDF
              </button>
              <button
                disabled={emailingInvoice}
                onClick={async () => {
                  setEmailingInvoice(true);
                  try {
                    await api.post(`/tickets/${id}/invoice/email`);
                    toast.success('Invoice emailed to customer');
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to email invoice');
                  } finally {
                    setEmailingInvoice(false);
                  }
                }}
                className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {emailingInvoice && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {emailingInvoice ? 'Sending...' : 'Email Invoice to Customer'}
              </button>
            </div>
          </div>

          {/* Similar Repairs */}
          {similarRepairs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="font-semibold mb-3 text-sm">Similar Repairs</h2>
              <div className="space-y-2">
                {similarRepairs.map(r => (
                  <Link key={r.id} to={`/tickets/${r.id}`} className="block p-2 rounded-lg hover:bg-gray-50 border text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">#{r.ticket_number}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${STATUS_COLORS[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-500">{r.device_brand} {r.device_model}</p>
                    {r.diagnosis && <p className="text-xs text-gray-600 mt-1 truncate">{r.diagnosis}</p>}
                    {r.final_cost > 0 && <p className="text-xs text-green-600 mt-1">${parseFloat(r.final_cost).toFixed(2)}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Customer Feedback */}
          <FeedbackDisplay ticketId={id} />
        </div>
      </div>
    </div>
  );
}
