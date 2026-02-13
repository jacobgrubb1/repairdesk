import { useState, useEffect } from 'react';
import api from '../api/client';

export default function PriceSuggestion({ deviceType, issueDescription, onUseEstimate }) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deviceType || !issueDescription || issueDescription.length < 5) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('deviceType', deviceType);
        params.set('keywords', issueDescription);
        const { data } = await api.get(`/suggestions/price?${params}`);
        if (data.sample_size > 0) {
          setEstimate(data);
        } else {
          setEstimate(null);
        }
      } catch {
        setEstimate(null);
      }
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [deviceType, issueDescription]);

  if (!estimate && !loading) return null;

  return (
    <div className="bg-green-50 rounded-lg border border-green-200 p-3 mt-2">
      <h3 className="text-sm font-medium text-green-800 mb-1">Price Estimate (based on past repairs)</h3>
      {loading ? (
        <p className="text-xs text-green-600">Calculating estimate...</p>
      ) : estimate ? (
        <div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Average:</span>{' '}
              <span className="font-bold text-green-700">${estimate.avg_cost?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Range:</span>{' '}
              <span className="font-medium">${estimate.min_cost?.toFixed(2)} - ${estimate.max_cost?.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 self-center">
              ({estimate.sample_size} similar repair{estimate.sample_size !== 1 ? 's' : ''})
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUseEstimate(estimate.avg_cost?.toFixed(2))}
            className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
          >
            Use this estimate
          </button>
        </div>
      ) : null}
    </div>
  );
}
