import { useState } from 'react';

export default function TrackingLink({ trackingToken }) {
  const [copied, setCopied] = useState(false);

  if (!trackingToken) return null;

  const url = `${window.location.origin}/track/${trackingToken}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h2 className="font-semibold mb-2">Customer Tracking Link</h2>
      <p className="text-xs text-gray-500 mb-2">Share this link with the customer so they can track their repair status.</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs bg-gray-50 text-gray-600"
          onFocus={e => e.target.select()}
        />
        <button onClick={handleCopy}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
