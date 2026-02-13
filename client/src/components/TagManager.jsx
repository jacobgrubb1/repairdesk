import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6b7280', '#06b6d4'];

export default function TagManager({ ticketId }) {
  const { user } = useAuth();
  const [ticketTags, setTicketTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    api.get(`/tags/tickets/${ticketId}`).then(({ data }) => setTicketTags(data)).catch(() => {});
    api.get('/tags').then(({ data }) => setAllTags(data)).catch(() => {});
  }, [ticketId]);

  async function addTag(tagId) {
    const { data } = await api.post(`/tags/tickets/${ticketId}/${tagId}`);
    setTicketTags(data);
    setShowPicker(false);
  }

  async function removeTag(tagId) {
    const { data } = await api.delete(`/tags/tickets/${ticketId}/${tagId}`);
    setTicketTags(data);
  }

  async function createAndAdd() {
    if (!newTag.name.trim()) return;
    const { data: tag } = await api.post('/tags', { name: newTag.name, color: newTag.color });
    setAllTags(prev => [...prev, tag]);
    await addTag(tag.id);
    setNewTag({ name: '', color: '#3b82f6' });
    setCreatingTag(false);
  }

  const availableTags = allTags.filter(t => !ticketTags.some(tt => tt.id === t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ticketTags.map(tag => (
        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: tag.color }}>
          {tag.name}
          <button onClick={() => removeTag(tag.id)} className="hover:opacity-75 ml-0.5">x</button>
        </span>
      ))}
      <div className="relative">
        <button onClick={() => setShowPicker(!showPicker)}
          className="text-gray-400 hover:text-blue-600 text-xs border border-dashed rounded-full px-2 py-0.5">
          + tag
        </button>
        {showPicker && (
          <div className="absolute top-8 left-0 z-10 bg-white border rounded-lg shadow-lg p-3 w-56">
            {availableTags.length > 0 && (
              <div className="space-y-1 mb-2">
                {availableTags.map(tag => (
                  <button key={tag.id} onClick={() => addTag(tag.id)}
                    className="flex items-center gap-2 w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            {user.role === 'admin' && (
              <>
                {creatingTag ? (
                  <div className="border-t pt-2 space-y-2">
                    <input value={newTag.name} onChange={e => setNewTag({ ...newTag, name: e.target.value })}
                      placeholder="Tag name" className="w-full border rounded px-2 py-1 text-sm" />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setNewTag({ ...newTag, color: c })}
                          className={`w-5 h-5 rounded-full ${newTag.color === c ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={createAndAdd} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Create</button>
                      <button onClick={() => setCreatingTag(false)} className="text-gray-500 text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setCreatingTag(true)} className="text-blue-600 text-xs hover:underline border-t pt-2 w-full text-left">
                    + Create new tag
                  </button>
                )}
              </>
            )}
            {availableTags.length === 0 && !creatingTag && user.role !== 'admin' && (
              <p className="text-xs text-gray-400">No tags available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
