import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function PartSelector({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/parts/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="border rounded-lg bg-white shadow-lg p-3 absolute z-10 w-80">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Link Inventory Part</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">x</button>
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search parts by name or SKU..."
        className="w-full border rounded px-2 py-1.5 text-sm mb-2"
      />
      {loading && <p className="text-xs text-gray-400">Searching...</p>}
      <div className="max-h-48 overflow-y-auto">
        {results.map(part => (
          <button
            key={part.id}
            onClick={() => onSelect(part)}
            disabled={part.quantity <= 0}
            className={`w-full text-left px-2 py-2 rounded text-sm border-b last:border-0 ${part.quantity <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50'}`}
          >
            <div className="flex justify-between">
              <span className="font-medium">{part.name}</span>
              <span className="text-green-600 font-medium">${parseFloat(part.sell_price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{part.sku || 'No SKU'}</span>
              <span className={part.quantity <= 0 ? 'text-red-600 font-bold' : part.quantity <= 2 ? 'text-red-500 font-medium' : ''}>
                {part.quantity <= 0 ? 'Out of stock' : `Stock: ${part.quantity}`}
              </span>
            </div>
          </button>
        ))}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-xs text-gray-400 py-2 text-center">No parts found</p>
        )}
      </div>
    </div>
  );
}
