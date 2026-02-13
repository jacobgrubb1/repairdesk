export default function WorkOrder({ ticket, costs }) {
  const partsCosts = costs.filter((c) => c.cost_type === 'part');
  const laborCosts = costs.filter((c) => c.cost_type === 'labor');
  const otherCosts = costs.filter((c) => c.cost_type === 'other');
  const total = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  return (
    <div className="work-order bg-white max-w-3xl mx-auto p-8 border print:border-none print:p-0">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{ticket.store_name}</h1>
          {ticket.store_address && <p className="text-sm">{ticket.store_address}</p>}
          <p className="text-sm">
            {ticket.store_phone && <span>{ticket.store_phone}</span>}
            {ticket.store_phone && ticket.store_email && <span> | </span>}
            {ticket.store_email && <span>{ticket.store_email}</span>}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">WORK ORDER</h2>
          <p className="text-2xl font-bold text-blue-700">#{ticket.ticket_number}</p>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer & Device Info - side by side */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-3">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Customer Information</h3>
          <p className="font-semibold text-lg">{ticket.customer_name}</p>
          {ticket.customer_phone && <p className="text-sm">Phone: {ticket.customer_phone}</p>}
          {ticket.customer_email && <p className="text-sm">Email: {ticket.customer_email}</p>}
        </div>
        <div className="border rounded-lg p-3">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Device Information</h3>
          <p className="font-semibold">{ticket.device_type} {ticket.device_brand} {ticket.device_model}</p>
          <p className="text-sm">Status: <span className="font-medium">{ticket.status.replace(/_/g, ' ')}</span></p>
          <p className="text-sm">Assigned to: <span className="font-medium">{ticket.assigned_to_name || 'Unassigned'}</span></p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs font-bold uppercase text-gray-500">Date In</p>
          <p className="font-semibold">{new Date(ticket.created_at).toLocaleDateString()}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs font-bold uppercase text-gray-500">Approved</p>
          <p className="font-semibold">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs font-bold uppercase text-gray-500">Estimated Cost</p>
          <p className="font-semibold">${ticket.estimated_cost ? parseFloat(ticket.estimated_cost).toFixed(2) : total.toFixed(2)}</p>
        </div>
      </div>

      {/* Issue Description */}
      <div className="border rounded-lg p-3 mb-4">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Issue Description</h3>
        <p className="text-sm whitespace-pre-wrap">{ticket.issue_description}</p>
      </div>

      {/* Diagnosis */}
      {ticket.diagnosis && (
        <div className="border rounded-lg p-3 mb-4">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Diagnosis</h3>
          <p className="text-sm whitespace-pre-wrap">{ticket.diagnosis}</p>
        </div>
      )}

      {/* Repair Tasks / Costs Breakdown */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Repair Tasks</h3>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left py-2 px-3">Description</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Details</th>
              <th className="text-right py-2 px-3">Amount</th>
              <th className="text-center py-2 px-3 w-20">Done</th>
            </tr>
          </thead>
          <tbody>
            {partsCosts.length > 0 && (
              <>
                <tr className="bg-blue-50"><td colSpan={5} className="py-1 px-3 font-semibold text-xs uppercase text-blue-700">Parts</td></tr>
                {partsCosts.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 px-3">{c.description}</td>
                    <td className="py-2 px-3 text-gray-500">Part</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">${parseFloat(c.amount).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center"><span className="inline-block w-4 h-4 border-2 border-gray-400 rounded"></span></td>
                  </tr>
                ))}
              </>
            )}
            {laborCosts.length > 0 && (
              <>
                <tr className="bg-green-50"><td colSpan={5} className="py-1 px-3 font-semibold text-xs uppercase text-green-700">Labor</td></tr>
                {laborCosts.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 px-3">{c.description}</td>
                    <td className="py-2 px-3 text-gray-500">Labor</td>
                    <td className="py-2 px-3 text-right text-xs">
                      {c.hours && c.hourly_rate ? `${c.hours}hrs @ $${parseFloat(c.hourly_rate).toFixed(2)}/hr` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right">${parseFloat(c.amount).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center"><span className="inline-block w-4 h-4 border-2 border-gray-400 rounded"></span></td>
                  </tr>
                ))}
              </>
            )}
            {otherCosts.length > 0 && (
              <>
                <tr className="bg-gray-50"><td colSpan={5} className="py-1 px-3 font-semibold text-xs uppercase text-gray-600">Other</td></tr>
                {otherCosts.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 px-3">{c.description}</td>
                    <td className="py-2 px-3 text-gray-500">Other</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">${parseFloat(c.amount).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center"><span className="inline-block w-4 h-4 border-2 border-gray-400 rounded"></span></td>
                  </tr>
                ))}
              </>
            )}
            {costs.length === 0 && (
              <tr><td colSpan={5} className="py-3 px-3 text-gray-400 text-center">No items listed</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={3} className="py-2 px-3 text-right">Total</td>
              <td className="py-2 px-3 text-right">${total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Technician Notes Section */}
      <div className="border rounded-lg p-3 mb-6">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Technician Notes</h3>
        <div className="min-h-[80px] border-b border-dashed border-gray-300 mb-2"></div>
        <div className="min-h-[80px] border-b border-dashed border-gray-300"></div>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <p className="text-xs text-gray-500 mb-8">Technician Signature</p>
          <div className="border-b border-black"></div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-8">Date Completed</p>
          <div className="border-b border-black"></div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        <p>Work Order #{ticket.ticket_number} | Printed {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
