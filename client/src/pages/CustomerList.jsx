import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/customers${params}`).then(({ data }) => setCustomers(data));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      <input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
      />

      <div className="bg-white rounded-xl shadow-sm border divide-y">
        {customers.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.email || ''} {c.phone ? `| ${c.phone}` : ''}</p>
            </div>
            <span className="text-gray-400 text-sm">{new Date(c.created_at).toLocaleDateString()}</span>
          </Link>
        ))}
        {customers.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 font-medium">No customers yet</p>
            <p className="text-gray-400 text-sm mt-1">Customers will appear here when you create tickets</p>
          </div>
        )}
      </div>
    </div>
  );
}
