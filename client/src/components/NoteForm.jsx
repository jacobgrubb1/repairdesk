import { useState } from 'react';
import api from '../api/client';

export default function NoteForm({ ticketId, onAdded }) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tickets/${ticketId}/notes`, { content, isInternal });
      onAdded(data);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
          Internal note (hidden from receipt)
        </label>
        <button type="submit" disabled={submitting || !content.trim()}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">
          Add Note
        </button>
      </div>
    </form>
  );
}
