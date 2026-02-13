import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Receipt({ ticket, costs }) {
  const [store, setStore] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [warranty, setWarranty] = useState(null);

  useEffect(() => {
    api.get('/store').then(({ data }) => setStore(data)).catch(() => {});
    api.get(`/tickets/${ticket.id}/payments`).then(({ data }) => {
      setPayments(data.payments);
      setTotalPaid(data.totalPaid);
    }).catch(() => {});
    api.get(`/tickets/${ticket.id}/warranty`).then(({ data }) => setWarranty(data)).catch(() => {});
  }, [ticket.id]);

  const total = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const partsCost = costs.filter((c) => c.cost_type === 'part').reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const laborCost = costs.filter((c) => c.cost_type === 'labor').reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const otherCost = costs.filter((c) => c.cost_type === 'other').reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const taxRate = store?.tax_rate || 0;
  const taxAmount = total * (taxRate / 100);
  const grandTotal = total + taxAmount;
  const balance = grandTotal - totalPaid;

  return (
    <div className="receipt bg-white max-w-2xl mx-auto p-8 border print:border-none print:p-0">
      {/* Store header */}
      <div className="text-center border-b pb-4 mb-4">
        {store?.logo_url && <img src={store.logo_url} alt="Logo" className="h-12 mx-auto mb-2" />}
        <h1 className="text-xl font-bold">{ticket.store_name}</h1>
        {ticket.store_address && <p className="text-sm text-gray-600">{ticket.store_address}</p>}
        <p className="text-sm text-gray-600">
          {ticket.store_phone && <span>{ticket.store_phone}</span>}
          {ticket.store_phone && ticket.store_email && <span> | </span>}
          {ticket.store_email && <span>{ticket.store_email}</span>}
        </p>
      </div>

      {/* Receipt title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold">REPAIR RECEIPT</h2>
        <p className="text-sm text-gray-500">Ticket #{ticket.ticket_number}</p>
      </div>

      {/* Customer & Device */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="font-semibold">Customer</p>
          <p>{ticket.customer_name}</p>
          {ticket.customer_email && <p>{ticket.customer_email}</p>}
          {ticket.customer_phone && <p>{ticket.customer_phone}</p>}
        </div>
        <div>
          <p className="font-semibold">Device</p>
          <p>{ticket.device_type} {ticket.device_brand} {ticket.device_model}</p>
          <p className="text-gray-500">Status: {ticket.status.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm border-b pb-4">
        <p><span className="text-gray-500">Date In:</span> {new Date(ticket.created_at).toLocaleDateString()}</p>
        {ticket.completed_at && <p><span className="text-gray-500">Date Out:</span> {new Date(ticket.completed_at).toLocaleDateString()}</p>}
      </div>

      {/* Issue */}
      <div className="mb-4 text-sm">
        <p className="font-semibold">Issue Description</p>
        <p className="text-gray-700">{ticket.issue_description}</p>
        {ticket.diagnosis && (
          <>
            <p className="font-semibold mt-2">Diagnosis</p>
            <p className="text-gray-700">{ticket.diagnosis}</p>
          </>
        )}
      </div>

      {/* Itemized costs */}
      <div className="mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Description</th>
              <th className="text-left py-2">Type</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.description}</td>
                <td className="py-2 text-gray-500">{c.cost_type}</td>
                <td className="py-2 text-right">${parseFloat(c.amount).toFixed(2)}</td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-gray-400">No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t pt-3 text-sm space-y-1">
        {partsCost > 0 && (
          <div className="flex justify-between"><span className="text-gray-500">Parts</span><span>${partsCost.toFixed(2)}</span></div>
        )}
        {laborCost > 0 && (
          <div className="flex justify-between"><span className="text-gray-500">Labor</span><span>${laborCost.toFixed(2)}</span></div>
        )}
        {otherCost > 0 && (
          <div className="flex justify-between"><span className="text-gray-500">Other</span><span>${otherCost.toFixed(2)}</span></div>
        )}
        <div className="flex justify-between border-t pt-1">
          <span className="text-gray-500">Subtotal</span>
          <span>${total.toFixed(2)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tax ({taxRate}%)</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
          <span>Total</span>
          <span>${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment summary */}
      {payments.length > 0 && (
        <div className="border-t mt-3 pt-3 text-sm space-y-1">
          <p className="font-semibold mb-1">Payments</p>
          {payments.map(p => (
            <div key={p.id} className="flex justify-between">
              <span className="text-gray-500 capitalize">{p.method} — {new Date(p.created_at).toLocaleDateString()}</span>
              <span>${parseFloat(p.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className={`flex justify-between font-bold pt-1 ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{balance <= 0 ? 'PAID IN FULL' : 'BALANCE DUE'}</span>
            <span>{balance <= 0 ? '' : `$${balance.toFixed(2)}`}</span>
          </div>
        </div>
      )}

      {/* Warranty */}
      {warranty && (
        <div className="border-t mt-3 pt-3 text-sm">
          <p className="font-semibold">Warranty: {warranty.warranty_days} days</p>
          <p className="text-xs text-gray-500">Starts: {new Date(warranty.start_date).toLocaleDateString()}</p>
          {(warranty.warranty_terms || store?.warranty_terms) && (
            <p className="text-xs text-gray-400 mt-1 italic">{warranty.warranty_terms || store.warranty_terms}</p>
          )}
        </div>
      )}

      {/* Signatures */}
      {(ticket.intake_signature || ticket.pickup_signature) && (
        <div className="border-t mt-3 pt-3 grid grid-cols-2 gap-4">
          {ticket.intake_signature && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Customer Signature (Intake)</p>
              <img src={ticket.intake_signature} alt="Intake signature" className="h-12 border rounded" />
            </div>
          )}
          {ticket.pickup_signature && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Customer Signature (Pickup)</p>
              <img src={ticket.pickup_signature} alt="Pickup signature" className="h-12 border rounded" />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-8 border-t pt-4">
        <p>{store?.receipt_footer || `Thank you for choosing ${ticket.store_name}!`}</p>
        <p>Printed on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
