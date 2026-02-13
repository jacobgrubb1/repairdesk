const express = require('express');
const paymentModel = require('../models/payment');
const ticketModel = require('../models/ticket');
const { authenticate } = require('../middleware/auth');
const { required } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

// GET /api/tickets/:ticketId/payments
router.get('/tickets/:ticketId/payments', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const payments = await paymentModel.findByTicket(req.params.ticketId);
    const totalPaid = await paymentModel.getTotalPaid(req.params.ticketId);
    res.json({ payments, totalPaid });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:ticketId/payments
router.post('/tickets/:ticketId/payments', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const err = required(['amount', 'method'], req.body);
    if (err) return res.status(400).json({ error: err });

    const payment = await paymentModel.create({
      ticketId: req.params.ticketId,
      storeId: req.user.storeId,
      amount: req.body.amount,
      method: req.body.method,
      note: req.body.note,
      createdBy: req.user.id,
    });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tickets/:ticketId/payments/:id
router.delete('/tickets/:ticketId/payments/:id', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await paymentModel.delete(req.params.id, req.params.ticketId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
