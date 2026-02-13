import { useState, useEffect } from 'react';
import api from '../api/client';

export default function IntakeChecklist({ ticketId, deviceType }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/tickets/${ticketId}/checklist`).then(({ data }) => {
      if (data.length > 0) {
        setItems(data);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [ticketId]);

  async function initChecklist() {
    const params = deviceType ? `?deviceType=${encodeURIComponent(deviceType)}` : '';
    const { data: defaults } = await api.get(`/checklist/defaults${params}`);
    const newItems = defaults.map(label => ({ label, checked: false, note: '' }));
    setItems(newItems);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.post(`/tickets/${ticketId}/checklist`, { items });
      setItems(data);
    } catch (err) {
      console.error('Failed to save checklist', err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(index) {
    const updated = [...items];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    setItems(updated);

    // If already saved (has id), update individually
    if (updated[index].id) {
      await api.put(`/checklist/${updated[index].id}`, { checked: updated[index].checked });
    }
  }

  async function updateNote(index, note) {
    const updated = [...items];
    updated[index] = { ...updated[index], note };
    setItems(updated);

    if (updated[index].id) {
      await api.put(`/checklist/${updated[index].id}`, { note });
    }
  }

  function addCustomItem() {
    setItems([...items, { label: '', checked: false, note: '', isNew: true }]);
  }

  function updateLabel(index, label) {
    const updated = [...items];
    updated[index] = { ...updated[index], label };
    setItems(updated);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  if (!loaded) return null;

  // No checklist yet - show init button
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h2 className="font-semibold mb-2">Intake Checklist</h2>
        <p className="text-sm text-gray-500 mb-3">
          Document pre-existing device conditions for liability protection.
          {deviceType && <span className="font-medium"> Checklist for: {deviceType}</span>}
        </p>
        <button onClick={initChecklist} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Start {deviceType || 'Device'} Checklist
        </button>
      </div>
    );
  }

  const hasSaved = items.some(i => i.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Intake Checklist</h2>
        {!hasSaved && (
          <button onClick={handleSave} disabled={saving}
            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Checklist'}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id || i} className="flex items-start gap-2 group">
            <input type="checkbox" checked={!!item.checked}
              onChange={() => toggleItem(i)}
              className="mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {item.isNew ? (
                <input value={item.label} onChange={e => updateLabel(i, e.target.value)}
                  placeholder="Custom check item..."
                  className="w-full border-b border-dashed px-1 py-0.5 text-sm focus:outline-none" />
              ) : (
                <p className={`text-sm ${item.checked ? 'text-gray-400 line-through' : ''}`}>{item.label}</p>
              )}
              <input value={item.note || ''} onChange={e => updateNote(i, e.target.value)}
                placeholder="Note..."
                className="w-full text-xs text-gray-500 border-none bg-transparent focus:outline-none focus:bg-gray-50 px-1 py-0.5 rounded" />
            </div>
            {!hasSaved && (
              <button onClick={() => removeItem(i)} className="text-red-400 text-xs opacity-0 group-hover:opacity-100">x</button>
            )}
          </div>
        ))}
      </div>
      {!hasSaved && (
        <button onClick={addCustomItem} className="text-blue-600 text-xs mt-2 hover:underline">+ Add custom item</button>
      )}
    </div>
  );
}
