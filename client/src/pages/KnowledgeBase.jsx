import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const LIMIT = 20;

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/checklist/device-types')
      .then(({ data }) => setDeviceTypes(data))
      .catch(() => {});
  }, []);

  const fetchResults = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deviceType) params.set('deviceType', deviceType);
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('limit', LIMIT);

    api.get(`/knowledge-base?${params.toString()}`)
      .then(({ data }) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [search, deviceType, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, deviceType]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search past repairs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={deviceType}
          onChange={(e) => setDeviceType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Device Types</option>
          {deviceTypes.map((dt) => (
            <option key={dt} value={dt}>{dt}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {loading ? 'Searching...' : `${total} result${total !== 1 ? 's' : ''} found`}
      </p>

      {/* Results */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border">
            <button
              onClick={() => toggleExpand(item.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-sm text-blue-600">
                      #{item.ticket_number}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.device_type} {item.device_brand} {item.device_model}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {item.issue_description}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {item.final_cost != null && (
                    <span className="text-sm font-semibold text-green-700">
                      ${parseFloat(item.final_cost).toFixed(2)}
                    </span>
                  )}
                  {item.turnaround_hours != null && (
                    <span className="text-xs text-gray-400">
                      {parseFloat(item.turnaround_hours).toFixed(1)}h
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Expanded details */}
            {expandedId === item.id && (
              <div className="border-t px-4 py-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Device</p>
                    <p className="text-sm">{item.device_type} - {item.device_brand} {item.device_model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Ticket Number</p>
                    <p className="text-sm">#{item.ticket_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Issue Description</p>
                    <p className="text-sm">{item.issue_description || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Diagnosis</p>
                    <p className="text-sm">{item.diagnosis || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Final Cost</p>
                    <p className="text-sm font-semibold">
                      {item.final_cost != null ? `$${parseFloat(item.final_cost).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">Turnaround Time</p>
                    <p className="text-sm">
                      {item.turnaround_hours != null ? `${parseFloat(item.turnaround_hours).toFixed(1)} hours` : '-'}
                    </p>
                  </div>
                  {item.resolution && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Resolution</p>
                      <p className="text-sm">{item.resolution}</p>
                    </div>
                  )}
                  {item.parts_used && item.parts_used.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Parts Used</p>
                      <div className="flex flex-wrap gap-1">
                        {item.parts_used.map((part, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                            {part.name || part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.notes && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <p className="text-gray-500">No completed repairs found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
