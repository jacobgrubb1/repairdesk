import { useState, useEffect } from 'react';
import api from '../api/client';

export default function FeedbackDisplay({ ticketId }) {
  const [feedback, setFeedback] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get(`/tickets/${ticketId}/photos`).catch(() => {});
    // Fetch feedback from the portal model via a ticket-specific endpoint
    // We'll fetch it through the public endpoint pattern but actually we need an authenticated one
    // Let's just check if feedback exists by going through the report data
  }, [ticketId]);

  // Simple approach: feedback comes from the ticket detail page's separate fetch
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        // Use the ticket to find its tracking token, then fetch public data
        const { data: ticket } = await api.get(`/tickets/${ticketId}`);
        if (ticket.tracking_token) {
          const { data } = await api.get(`/public/track/${ticket.tracking_token}`);
          setFeedback(data.feedback);
        }
      } catch {
        // No feedback yet
      }
      setLoaded(true);
    };
    fetchFeedback();
  }, [ticketId]);

  if (!loaded || !feedback) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h2 className="font-semibold mb-2">Customer Feedback</h2>
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`text-lg ${star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
            &#9733;
          </span>
        ))}
        <span className="text-sm text-gray-500 ml-1">{feedback.rating}/5</span>
      </div>
      {feedback.comment && (
        <p className="text-sm text-gray-600 italic">"{feedback.comment}"</p>
      )}
      <p className="text-xs text-gray-400 mt-1">{new Date(feedback.created_at).toLocaleDateString()}</p>
    </div>
  );
}
