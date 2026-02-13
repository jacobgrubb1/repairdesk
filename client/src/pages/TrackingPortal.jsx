import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const STATUSES = ['intake', 'diagnosing', 'awaiting_approval', 'in_repair', 'completed', 'picked_up'];

const STATUS_LABELS = {
  intake: 'Intake',
  diagnosing: 'Diagnosing',
  awaiting_approval: 'Awaiting Approval',
  in_repair: 'In Repair',
  completed: 'Completed',
  picked_up: 'Picked Up',
};

const STATUS_COLORS = {
  intake: { bg: 'bg-gray-400', ring: 'ring-gray-300', text: 'text-gray-600', light: 'bg-gray-100' },
  diagnosing: { bg: 'bg-yellow-400', ring: 'ring-yellow-300', text: 'text-yellow-600', light: 'bg-yellow-100' },
  awaiting_approval: { bg: 'bg-orange-400', ring: 'ring-orange-300', text: 'text-orange-600', light: 'bg-orange-100' },
  in_repair: { bg: 'bg-blue-400', ring: 'ring-blue-300', text: 'text-blue-600', light: 'bg-blue-100' },
  completed: { bg: 'bg-green-400', ring: 'ring-green-300', text: 'text-green-600', light: 'bg-green-100' },
  picked_up: { bg: 'bg-purple-400', ring: 'ring-purple-300', text: 'text-purple-600', light: 'bg-purple-100' },
};

const PHOTO_TYPE_LABELS = {
  intake: 'Intake Photos',
  repair: 'Repair Photos',
  completion: 'Completion Photos',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ---------- Sub-components ----------

function StarRating({ rating, onRate, interactive = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`text-2xl transition-colors ${
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          }`}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate(star)}
        >
          <svg
            className={`w-8 h-8 ${
              star <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'
            }`}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function PhotoModal({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="max-h-[80vh] w-auto mx-auto object-contain"
        />
        {photo.caption && (
          <div className="p-3 text-center text-sm text-gray-600 bg-gray-50">
            {photo.caption}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function TrackingPortal() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const [ticket, setTicket] = useState(null);
  const [costs, setCosts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Approval / rejection
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Feedback form
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Photo modal
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Action messages
  const [actionMsg, setActionMsg] = useState(null);

  // Payment
  const [payingNow, setPayingNow] = useState(false);

  // Payment status from URL params (Stripe redirect)
  const paymentStatus = searchParams.get('payment');

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get(`/public/track/${token}`);
      setTicket(data.ticket);
      setCosts(data.costs || []);
      setPhotos(data.photos || []);
      setFeedback(data.feedback || null);
      setStripeConfigured(!!data.ticket.stripe_publishable_key);
      setError(null);

      // Fetch payments
      try {
        const payRes = await api.get(`/public/track/${token}/payments`);
        setPayments(payRes.data.payments || []);
        setTotalPaid(payRes.data.totalPaid || 0);
      } catch {
        // Not critical if payments fail to load
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Ticket not found. Please check your tracking link.');
      } else {
        setError('Unable to load tracking information. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ---------- Handlers ----------

  async function handleApprove() {
    setApproving(true);
    setActionMsg(null);
    try {
      await api.post(`/public/track/${token}/approve`);
      setActionMsg({ type: 'success', text: 'Repair approved successfully!' });
      fetchData();
    } catch {
      setActionMsg({ type: 'error', text: 'Failed to approve. Please try again.' });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    setActionMsg(null);
    try {
      await api.post(`/public/track/${token}/reject`, { reason: rejectReason.trim() });
      setActionMsg({ type: 'success', text: 'Repair declined. We will contact you shortly.' });
      setShowRejectForm(false);
      setRejectReason('');
      fetchData();
    } catch {
      setActionMsg({ type: 'error', text: 'Failed to submit. Please try again.' });
    } finally {
      setRejecting(false);
    }
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (feedbackRating === 0) return;
    setSubmittingFeedback(true);
    setActionMsg(null);
    try {
      await api.post(`/public/track/${token}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      });
      setActionMsg({ type: 'success', text: 'Thank you for your feedback!' });
      fetchData();
    } catch {
      setActionMsg({ type: 'error', text: 'Failed to submit feedback. Please try again.' });
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handlePayNow() {
    setPayingNow(true);
    setActionMsg(null);
    try {
      const { data } = await api.post(`/public/track/${token}/checkout`);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.error || 'Failed to start payment. Please try again.' });
      setPayingNow(false);
    }
  }

  // ---------- Derived ----------

  const currentStatusIndex = ticket ? STATUSES.indexOf(ticket.status) : -1;
  const costsTotal = costs.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const balanceDue = costsTotal - totalPaid;

  const groupedPhotos = photos.reduce((groups, photo) => {
    const type = photo.photo_type || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(photo);
    return groups;
  }, {});

  const showApproval = ticket?.status === 'awaiting_approval';
  const showFeedbackForm =
    ticket && ['completed', 'picked_up'].includes(ticket.status) && !feedback;
  const showFeedbackReadOnly =
    ticket && ['completed', 'picked_up'].includes(ticket.status) && feedback;

  // ---------- Loading / Error states ----------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Tracking Unavailable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo Modal */}
      <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            {ticket.store_logo && (
              <img
                src={ticket.store_logo}
                alt={ticket.store_name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white object-cover border-2 border-white/30"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{ticket.store_name || 'Repair Shop'}</h1>
              <p className="text-blue-100 text-sm sm:text-base">Repair Tracking</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-blue-100">
            <span className="bg-white/15 px-3 py-1 rounded-full inline-block w-fit">
              Ticket #{ticket.ticket_number}
            </span>
            <span className="hidden sm:inline">|</span>
            <span>{ticket.customer_name}</span>
            <span className="hidden sm:inline">|</span>
            <span>Opened {formatDate(ticket.created_at)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Payment Status Banners */}
        {paymentStatus === 'success' && (
          <div className="rounded-lg p-4 text-sm font-medium bg-green-50 text-green-800 border border-green-200 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Payment successful! Thank you. Your payment will appear shortly.
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="rounded-lg p-4 text-sm font-medium bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment was cancelled. You can try again anytime.
          </div>
        )}

        {/* Action Messages */}
        {actionMsg && (
          <div
            className={`rounded-lg p-4 text-sm font-medium ${
              actionMsg.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionMsg.text}
          </div>
        )}

        {/* Status Progress Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
            Repair Status
          </h2>

          {/* Desktop progress bar */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-indigo-500 transition-all duration-500"
                style={{
                  width:
                    currentStatusIndex >= 0
                      ? `${(currentStatusIndex / (STATUSES.length - 1)) * 100}%`
                      : '0%',
                }}
              />

              {STATUSES.map((status, idx) => {
                const isCompleted = idx < currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;
                const colors = STATUS_COLORS[status];

                return (
                  <div key={status} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCurrent
                          ? `${colors.bg} border-transparent ring-4 ${colors.ring}`
                          : isCompleted
                          ? 'bg-indigo-500 border-transparent'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center leading-tight ${
                        isCurrent ? colors.text : isCompleted ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile progress bar (vertical) */}
          <div className="sm:hidden space-y-0">
            {STATUSES.map((status, idx) => {
              const isCompleted = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const colors = STATUS_COLORS[status];
              const isLast = idx === STATUSES.length - 1;

              return (
                <div key={status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${
                        isCurrent
                          ? `${colors.bg} border-transparent ring-4 ${colors.ring}`
                          : isCompleted
                          ? 'bg-indigo-500 border-transparent'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-6 ${
                          isCompleted ? 'bg-indigo-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm pt-1 font-medium ${
                      isCurrent ? colors.text : isCompleted ? 'text-indigo-600' : 'text-gray-400'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </div>
              );
            })}
          </div>

          {ticket.updated_at && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Last updated: {formatDate(ticket.updated_at)}
            </p>
          )}
        </div>

        {/* Device Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Device Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Type</p>
              <p className="text-gray-800 font-medium">{ticket.device_type || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Brand</p>
              <p className="text-gray-800 font-medium">{ticket.device_brand || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Model</p>
              <p className="text-gray-800 font-medium">{ticket.device_model || '-'}</p>
            </div>
          </div>
        </div>

        {/* Issue Description */}
        {ticket.issue_description && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Reported Issue
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.issue_description}
            </p>
          </div>
        )}

        {/* Cost Breakdown */}
        {costs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Cost Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-1 text-gray-500 font-medium">Description</th>
                    <th className="text-left py-2 px-1 text-gray-500 font-medium">Type</th>
                    <th className="text-right py-2 px-1 text-gray-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 px-1 text-gray-700">{cost.description}</td>
                      <td className="py-2 px-1">
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                          {cost.cost_type}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right text-gray-700 font-medium">
                        {formatCurrency(cost.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={2} className="py-3 px-1 font-semibold text-gray-800">Total</td>
                    <td className="py-3 px-1 text-right font-bold text-gray-900 text-base">
                      {formatCurrency(costsTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {ticket.estimated_cost && !ticket.final_cost && (
              <p className="mt-3 text-xs text-gray-400">
                Estimated cost: {formatCurrency(ticket.estimated_cost)}
              </p>
            )}
            {ticket.final_cost && (
              <p className="mt-3 text-xs text-gray-400">
                Final cost: {formatCurrency(ticket.final_cost)}
              </p>
            )}
          </div>
        )}

        {/* Payment Summary + Pay Now */}
        {costsTotal > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Payment Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost</span>
                <span className="font-medium text-gray-800">{formatCurrency(costsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid So Far</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-800">Balance Due</span>
                <span className={`font-bold text-base ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(0, balanceDue))}
                </span>
              </div>
            </div>

            {balanceDue > 0 && stripeConfigured && (
              <button
                onClick={handlePayNow}
                disabled={payingNow}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {payingNow ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pay Now — {formatCurrency(balanceDue)}
                  </>
                )}
              </button>
            )}

            {balanceDue <= 0 && (
              <div className="mt-4 text-center py-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-700 font-medium text-sm">Fully Paid</p>
              </div>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment History</h3>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600">{new Date(p.created_at).toLocaleDateString()}</span>
                        <span className="ml-2 inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                          {p.method}
                        </span>
                      </div>
                      <span className="font-medium text-gray-800">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos Gallery */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Photos
            </h2>
            {Object.entries(groupedPhotos).map(([type, typePhotos]) => (
              <div key={type} className="mb-5 last:mb-0">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {PHOTO_TYPE_LABELS[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Photos`}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {typePhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer border border-gray-200 hover:border-indigo-300 transition-colors"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Repair photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs truncate">{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approval Section */}
        {showApproval && (
          <div className="bg-orange-50 rounded-2xl shadow-sm border border-orange-200 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-3">
              Approval Required
            </h2>
            <p className="text-gray-700 mb-3">
              Your device has been diagnosed. Please review the estimated costs and approve or decline the repair.
            </p>

            {ticket.estimated_cost && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <p className="text-sm text-gray-500 mb-1">Estimated Repair Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(ticket.estimated_cost)}
                </p>
              </div>
            )}

            {costs.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
                <p className="text-sm text-gray-500 mb-2">Cost Details</p>
                <div className="space-y-1">
                  {costs.map((cost, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{cost.description}</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(cost.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100 mt-2">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-900">{formatCurrency(costsTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {!showRejectForm ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {approving ? 'Approving...' : 'Approve Repair'}
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Decline Repair
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Please let us know why you are declining:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter your reason..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={rejecting || !rejectReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                  >
                    {rejecting ? 'Submitting...' : 'Confirm Decline'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Section - Read Only */}
        {showFeedbackReadOnly && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Your Feedback
            </h2>
            <StarRating rating={feedback.rating} />
            {feedback.comment && (
              <p className="mt-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {feedback.comment}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Submitted {formatDate(feedback.created_at)}
            </p>
          </div>
        )}

        {/* Feedback Section - Form */}
        {showFeedbackForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Leave Feedback
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              How was your repair experience? Your feedback helps us improve.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <StarRating rating={feedbackRating} onRate={setFeedbackRating} interactive />
                {feedbackRating === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Click a star to rate</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={3}
                  placeholder="Tell us about your experience..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={feedbackRating === 0 || submittingFeedback}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}

        {/* Completed Info */}
        {ticket.completed_at && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4 sm:p-6 text-center">
            <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-semibold">Repair Completed</p>
            <p className="text-green-600 text-sm mt-1">{formatDate(ticket.completed_at)}</p>
            {ticket.final_cost && (
              <p className="text-green-700 font-bold text-lg mt-2">
                Final Cost: {formatCurrency(ticket.final_cost)}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {ticket.store_name || 'Repair Shop'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-500">
            {ticket.store_phone && (
              <a href={`tel:${ticket.store_phone}`} className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {ticket.store_phone}
              </a>
            )}
            {ticket.store_email && (
              <a href={`mailto:${ticket.store_email}`} className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {ticket.store_email}
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            This page auto-refreshes every 30 seconds.
          </p>
        </div>
      </footer>
    </div>
  );
}
