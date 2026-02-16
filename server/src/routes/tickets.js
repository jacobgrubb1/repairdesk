const express = require('express');
const ticketModel = require('../models/ticket');
const paymentModel = require('../models/payment');
const storeModel = require('../models/store');
const { authenticate } = require('../middleware/auth');
const { required } = require('../utils/validation');
const { generateInvoice } = require('../utils/invoicePdf');
const { sendEmail } = require('../utils/email');
const { invoiceEmail } = require('../utils/emailTemplates');

const router = express.Router();
router.use(authenticate);

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const tickets = await ticketModel.findByStore(req.user.storeId, {
      status: req.query.status,
      search: req.query.search,
      customerId: req.query.customerId,
      assignedTo: req.query.assignedTo,
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.id, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', async (req, res, next) => {
  try {
    const err = required(['customerId', 'issueDescription'], req.body);
    if (err) return res.status(400).json({ error: err });

    const ticket = await ticketModel.create({
      storeId: req.user.storeId,
      createdBy: req.user.id,
      ...req.body,
    });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const ticket = await ticketModel.update(req.params.id, req.user.storeId, req.body);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/notes
router.get('/:id/notes', async (req, res, next) => {
  try {
    const notes = await ticketModel.getNotes(req.params.id);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/notes
router.post('/:id/notes', async (req, res, next) => {
  try {
    const err = required(['content'], req.body);
    if (err) return res.status(400).json({ error: err });

    const note = await ticketModel.addNote(
      req.params.id,
      req.user.id,
      req.body.content,
      req.body.isInternal || false
    );
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/costs
router.get('/:id/costs', async (req, res, next) => {
  try {
    const costs = await ticketModel.getCosts(req.params.id);
    res.json(costs);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/costs
router.post('/:id/costs', async (req, res, next) => {
  try {
    const err = required(['description', 'costType', 'amount'], req.body);
    if (err) return res.status(400).json({ error: err });

    const cost = await ticketModel.addCost(req.params.id, req.body);
    res.status(201).json(cost);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/tickets/:id/costs/:costId
router.delete('/:id/costs/:costId', async (req, res, next) => {
  try {
    await ticketModel.deleteCost(req.params.costId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/similar — find similar past repairs
router.get('/:id/similar', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.id, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const similar = await ticketModel.findSimilar(req.user.storeId, ticket);
    res.json(similar);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/invoice — download PDF
router.get('/:id/invoice', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.id, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const costs = await ticketModel.getCosts(req.params.id);
    const payments = await paymentModel.findByTicket(req.params.id);
    const store = await storeModel.findById(req.user.storeId);

    const pdfBuffer = await generateInvoice(ticket, costs, payments, store);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${ticket.ticket_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/invoice/email — email PDF to customer
router.post('/:id/invoice/email', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.id, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!ticket.customer_email) return res.status(400).json({ error: 'Customer has no email address' });

    const costs = await ticketModel.getCosts(req.params.id);
    const payments = await paymentModel.findByTicket(req.params.id);
    const store = await storeModel.findById(req.user.storeId);

    const pdfBuffer = await generateInvoice(ticket, costs, payments, store);
    const emailData = invoiceEmail({
      customerName: ticket.customer_name,
      ticketNumber: ticket.ticket_number,
      storeName: store.name,
    });

    await sendEmail({
      to: ticket.customer_email,
      ...emailData,
      attachments: [{
        filename: `invoice-${ticket.ticket_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    res.json({ success: true, message: 'Invoice emailed to customer' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
