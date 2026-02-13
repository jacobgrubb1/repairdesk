import { useState, useEffect } from 'react';
import api from '../api/client';

export default function TemplateSelector({ ticketId, onApplied, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data));
  }, []);

  async function apply(templateId) {
    setApplying(true);
    try {
      await api.post(`/templates/${templateId}/apply/${ticketId}`);
      onApplied();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Apply Template</h3>
        <button onClick={onClose} className="text-gray-400 text-xs">x</button>
      </div>
      <div className="space-y-2 max-h-48 overflow-auto">
        {templates.map((t) => (
          <button key={t.id} onClick={() => apply(t.id)} disabled={applying}
            className="w-full text-left p-2 bg-white rounded border hover:bg-blue-50 text-sm disabled:opacity-50">
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-gray-500">
              {t.items.length} items &middot; ${t.items.reduce((s, i) => s + parseFloat(i.amount), 0).toFixed(2)}
            </p>
          </button>
        ))}
        {templates.length === 0 && <p className="text-xs text-gray-400">No templates available</p>}
      </div>
    </div>
  );
}
