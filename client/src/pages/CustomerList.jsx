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
          <p className="p-8 text-center text-gray-500">No customers found</p>
        )}
      </div>
    </div>
  );
}
