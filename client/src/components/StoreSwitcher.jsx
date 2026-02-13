import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StoreSwitcher() {
  const { user } = useAuth();
  const [stores, setStores] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.org_role) {
      api.get('/org/stores').then(({ data }) => setStores(data)).catch(() => {});
    }
  }, [user]);

  if (!user?.org_role || stores.length <= 1) return null;

  const currentStore = stores.find(s => s.id === user.storeId) || stores[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-2 py-1"
      >
        <span className="font-medium truncate max-w-[120px]">{currentStore?.name}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => {
                // Store switching requires re-authentication with a different store context
                // For now, just show the store info
                setOpen(false);
                window.location.href = `/org`;
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                store.id === user.storeId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <div>{store.name}</div>
              <div className="text-xs text-gray-400">{store.active_tickets || 0} active tickets</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
