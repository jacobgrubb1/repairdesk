import { useState, useEffect } from 'react';
import api from '../api/client';

export default function DiagnosisSuggestions({ deviceType, issueDescription, onSelectDiagnosis }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!deviceType && !issueDescription) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (deviceType) params.set('deviceType', deviceType);
        if (issueDescription) params.set('keywords', issueDescription);
        const { data } = await api.get(`/suggestions?${params}`);
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [deviceType, issueDescription]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-indigo-800">AI Suggestions (from past repairs)</h3>
        <button onClick={() => setCollapsed(!collapsed)} className="text-xs text-indigo-600 hover:underline">
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      {!collapsed && (
        <>
          {loading && <p className="text-xs text-indigo-500">Analyzing past repairs...</p>}
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelectDiagnosis(s.diagnosis)}
                className="w-full text-left bg-white rounded-lg p-2.5 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <p className="text-sm font-medium text-gray-800">{s.diagnosis}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>Avg cost: <span className="font-medium text-green-600">${s.avg_cost?.toFixed(2) || '0'}</span></span>
                  <span>Avg time: <span className="font-medium">{s.avg_hours?.toFixed(1) || '?'}h</span></span>
                  <span>{s.match_count} similar repair{s.match_count !== 1 ? 's' : ''}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
