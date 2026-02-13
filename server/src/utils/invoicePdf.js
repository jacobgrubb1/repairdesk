const PDFDocument = require('pdfkit');

function generateInvoice(ticket, costs, payments, store) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(store.name || 'RepairDesk', 50, 50);
      doc.fontSize(10).font('Helvetica')
        .text(store.address || '', 50, 75)
        .text([store.phone, store.email].filter(Boolean).join(' | '), 50, 88);

      // Invoice title
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica')
        .text(`Ticket #${ticket.ticket_number}`, 400, 80, { align: 'right' })
        .text(`Date: ${new Date(ticket.created_at).toLocaleDateString()}`, 400, 93, { align: 'right' });

      // Divider
      doc.moveTo(50, 115).lineTo(545, 115).stroke('#e5e7eb');

      // Customer info
      let y = 130;
      doc.fontSize(11).font('Helvetica-Bold').text('Bill To:', 50, y);
      y += 16;
      doc.fontSize(10).font('Helvetica')
        .text(ticket.customer_name || '', 50, y);
      y += 13;
      if (ticket.customer_email) { doc.text(ticket.customer_email, 50, y); y += 13; }
      if (ticket.customer_phone) { doc.text(ticket.customer_phone, 50, y); y += 13; }

      // Device info
      doc.fontSize(11).font('Helvetica-Bold').text('Device:', 300, 130);
      doc.fontSize(10).font('Helvetica')
        .text([ticket.device_type, ticket.device_brand, ticket.device_model].filter(Boolean).join(' '), 300, 146)
        .text(`Issue: ${ticket.issue_description || ''}`, 300, 159, { width: 245 });

      // Costs table
      y = Math.max(y, 190) + 20;
      doc.moveTo(50, y).lineTo(545, y).stroke('#e5e7eb');
      y += 8;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, y, { width: 250 });
      doc.text('Type', 310, y, { width: 80 });
      doc.text('Amount', 420, y, { width: 125, align: 'right' });
      y += 18;
      doc.moveTo(50, y).lineTo(545, y).stroke('#e5e7eb');
      y += 8;

      // Table rows
      doc.font('Helvetica').fontSize(10);
      let subtotal = 0;
      for (const cost of costs) {
        doc.text(cost.description, 50, y, { width: 250 });
        doc.text(cost.cost_type, 310, y, { width: 80 });
        const amount = parseFloat(cost.amount) || 0;
        subtotal += amount;
        doc.text(`$${amount.toFixed(2)}`, 420, y, { width: 125, align: 'right' });
        y += 18;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Totals
      y += 5;
      doc.moveTo(350, y).lineTo(545, y).stroke('#e5e7eb');
      y += 10;

      const taxRate = parseFloat(store.tax_rate) || 0;
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax;

      doc.font('Helvetica').text('Subtotal:', 350, y, { width: 80 });
      doc.text(`$${subtotal.toFixed(2)}`, 420, y, { width: 125, align: 'right' });
      y += 16;

      if (taxRate > 0) {
        doc.text(`Tax (${taxRate}%):`, 350, y, { width: 80 });
        doc.text(`$${tax.toFixed(2)}`, 420, y, { width: 125, align: 'right' });
        y += 16;
      }

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 350, y, { width: 80 });
      doc.text(`$${total.toFixed(2)}`, 420, y, { width: 125, align: 'right' });
      y += 20;

      // Payments
      if (payments && payments.length > 0) {
        y += 5;
        doc.fontSize(10).font('Helvetica-Bold').text('Payments Received:', 350, y);
        y += 16;
        doc.font('Helvetica');
        let totalPaid = 0;
        for (const p of payments) {
          const amt = parseFloat(p.amount) || 0;
          totalPaid += amt;
          doc.text(`${p.method} — $${amt.toFixed(2)}`, 360, y);
          y += 14;
        }
        y += 4;
        const balance = total - totalPaid;
        doc.font('Helvetica-Bold');
        doc.text(`Balance Due: $${Math.max(0, balance).toFixed(2)}`, 350, y);
        y += 20;
      }

      // Warranty and footer
      y += 20;
      if (y > 680) { doc.addPage(); y = 50; }

      if (store.warranty_terms) {
        doc.fontSize(9).font('Helvetica-Bold').text('Warranty Terms:', 50, y);
        y += 14;
        doc.font('Helvetica').text(store.warranty_terms, 50, y, { width: 495 });
        y += 30;
      }

      if (store.receipt_footer) {
        doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
          .text(store.receipt_footer, 50, y, { width: 495, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoice };
