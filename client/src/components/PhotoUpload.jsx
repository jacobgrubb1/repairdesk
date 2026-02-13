import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function PhotoUpload({ ticketId }) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState('intake');
  const [caption, setCaption] = useState('');
  const [viewPhoto, setViewPhoto] = useState(null);

  useEffect(() => {
    api.get(`/tickets/${ticketId}/photos`).then(({ data }) => setPhotos(data)).catch(() => {});
  }, [ticketId]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await api.post(`/tickets/${ticketId}/photos`, {
          url: reader.result,
          caption,
          photoType,
        });
        setPhotos(prev => [...prev, data]);
        setCaption('');
        e.target.value = '';
      } catch (err) {
        toast.error('Failed to upload photo');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleDelete(photoId) {
    await api.delete(`/tickets/${ticketId}/photos/${photoId}`);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  const grouped = { intake: [], repair: [], completion: [] };
  photos.forEach(p => {
    if (grouped[p.photo_type]) grouped[p.photo_type].push(p);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h2 className="font-semibold mb-3">Photos</h2>

      {/* Upload */}
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={photoType} onChange={e => setPhotoType(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="intake">Intake</option>
            <option value="repair">Repair</option>
            <option value="completion">Completion</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Caption (optional)</label>
          <input value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Describe the photo..."
            className="w-full border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <label className={`bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-blue-700 ${uploading ? 'opacity-50' : ''}`}>
          {uploading ? 'Uploading...' : 'Upload Photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* Gallery */}
      {Object.entries(grouped).map(([type, items]) => items.length > 0 && (
        <div key={type} className="mb-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{type} Photos</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {items.map(photo => (
              <div key={photo.id} className="relative group">
                <img src={photo.url} alt={photo.caption || type}
                  className="w-full h-24 object-cover rounded-lg cursor-pointer border hover:ring-2 ring-blue-400"
                  onClick={() => setViewPhoto(photo)} />
                <button onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 leading-none">x</button>
                {photo.caption && <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {photos.length === 0 && <p className="text-sm text-gray-400">No photos yet</p>}

      {/* Lightbox */}
      {viewPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewPhoto(null)}>
          <div className="max-w-3xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <img src={viewPhoto.url} alt={viewPhoto.caption || ''}
              className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            {viewPhoto.caption && (
              <p className="text-white text-center mt-2">{viewPhoto.caption}</p>
            )}
            <button onClick={() => setViewPhoto(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 w-8 h-8 rounded-full text-lg shadow-lg">x</button>
          </div>
        </div>
      )}
    </div>
  );
}
