import { useState, useEffect } from 'react';
import api from '../api/client';

export default function NoteForm({ ticketId, onAdded }) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cannedResponses, setCannedResponses] = useState([]);

  useEffect(() => {
    api.get('/canned-responses')
      .then(({ data }) => setCannedResponses(data))
      .catch(() => {});
  }, []);

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

  function handleCannedSelect(e) {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const response = cannedResponses.find((r) => String(r.id) === selectedId);
    if (response) {
      setContent((prev) => (prev ? prev + '\n' + response.content : response.content));
    }
    e.target.value = '';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {cannedResponses.length > 0 && (
        <select
          onChange={handleCannedSelect}
          defaultValue=""
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-600"
        >
          <option value="">Insert template...</option>
          {cannedResponses.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      )}
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
