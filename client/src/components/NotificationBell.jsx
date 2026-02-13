import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  function load() {
    api.get('/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleClick(n) {
    if (!n.is_read) {
      await api.put(`/notifications/${n.id}/read`);
    }
    setOpen(false);
    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
    load();
  }

  async function markAllRead() {
    await api.put('/notifications/read-all');
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-300 hover:text-white">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-auto">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 text-center">No notifications</p>
          ) : (
            notifications.slice(0, 15).map((n) => (
              <button key={n.id} onClick={() => handleClick(n)}
                className={`w-full text-left p-3 border-b hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                <p className="text-sm text-gray-900">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.ticket_number ? `Ticket #${n.ticket_number} · ` : ''}
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
