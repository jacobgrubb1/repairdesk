import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  awaiting_approval: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  picked_up: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Ctrl+K / Cmd+K shortcut to focus input
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
        setOpen(true);
      } catch {
        setResults(null);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleResultClick(type, item) {
    setOpen(false);
    setQuery('');
    setResults(null);
    if (type === 'ticket') navigate(`/tickets/${item.id}`);
    else if (type === 'customer') navigate(`/customers/${item.id}`);
    else if (type === 'part') navigate('/inventory');
  }

  const tickets = results?.tickets || [];
  const customers = results?.customers || [];
  const parts = results?.parts || [];
  const hasResults = tickets.length > 0 || customers.length > 0 || parts.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results && query.trim().length >= 2) setOpen(true); }}
          placeholder="Search tickets, customers, parts..."
          className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
          Ctrl+K
        </span>
      </div>

      {/* Dropdown */}
      {open && results && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg z-50 max-h-96 overflow-y-auto">
          {!hasResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No results found
            </div>
          )}

          {/* Tickets Section */}
          {tickets.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                Tickets ({tickets.length})
              </div>
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleResultClick('ticket', ticket)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-900">#{ticket.ticket_number}</span>
                    <span className="text-gray-500 ml-2">{ticket.customer_name}</span>
                    <span className="text-gray-400 ml-2">{ticket.device_brand} {ticket.device_model}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                    {ticket.status?.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Customers Section */}
          {customers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                Customers ({customers.length})
              </div>
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleResultClick('customer', customer)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{customer.name}</span>
                  {customer.email && <span className="text-gray-500 ml-2">{customer.email}</span>}
                  {customer.phone && <span className="text-gray-400 ml-2">{customer.phone}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Parts Section */}
          {parts.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                Parts ({parts.length})
              </div>
              {parts.map((part) => (
                <button
                  key={part.id}
                  onClick={() => handleResultClick('part', part)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-900">{part.name}</span>
                    {part.sku && <span className="text-gray-400 ml-2">SKU: {part.sku}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">Qty: {part.quantity}</span>
                    {part.sell_price != null && (
                      <span className="text-gray-700 ml-3 font-medium">${parseFloat(part.sell_price).toFixed(2)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
