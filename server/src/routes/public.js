const express = require('express');
const portalModel = require('../models/portal');
const storeModel = require('../models/store');
const paymentModel = require('../models/payment');
const { getStripeClient, createCheckoutSession } = require('../utils/stripe');

const router = express.Router();
// NOTE: No authenticate middleware — this is the public customer portal

router.get('/track/:token', async (req, res, next) => {
  try {
    const ticket = await portalModel.findTicketByToken(req.params.token);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const costs = await portalModel.getCostsByToken(req.params.token);
    const photos = await portalModel.getPhotosByToken(req.params.token);
    const feedback = await portalModel.getFeedbackByToken(req.params.token);
    res.json({ ticket, costs, photos, feedback });
  } catch (err) { next(err); }
});

router.post('/track/:token/approve', async (req, res, next) => {
  try {
    const result = await portalModel.approve(req.params.token);
    if (!result) return res.status(404).json({ error: 'Ticket not found' });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/track/:token/reject', async (req, res, next) => {
  try {
    const result = await portalModel.reject(req.params.token, req.body.reason);
    if (!result) return res.status(404).json({ error: 'Ticket not found' });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/track/:token/feedback', async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const result = await portalModel.submitFeedback(req.params.token, { rating: parseInt(rating), comment });
    if (!result) return res.status(404).json({ error: 'Ticket not found' });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

// Fetch payments for tracking portal
router.get('/track/:token/payments', async (req, res, next) => {
  try {
    const result = await portalModel.getPaymentsByToken(req.params.token);
    if (!result) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result);
  } catch (err) { next(err); }
});

// Create Stripe Checkout session
router.post('/track/:token/checkout', async (req, res, next) => {
  try {
    const ticket = await portalModel.getTicketFullByToken(req.params.token);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Calculate balance due
    const costs = await portalModel.getCostsByToken(req.params.token);
    const costsTotal = costs.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    const totalPaid = await paymentModel.getTotalPaid(ticket.id);
    const balance = costsTotal - totalPaid;

    if (balance <= 0) {
      return res.status(400).json({ error: 'No balance due' });
    }

    // Get store Stripe keys
    const stripeKeys = await storeModel.getStripeKeys(ticket.store_id);
    if (!stripeKeys || !stripeKeys.stripe_secret_key) {
      return res.status(400).json({ error: 'Online payment is not configured for this store' });
    }

    const stripe = getStripeClient(stripeKeys.stripe_secret_key);

    // Build success/cancel URLs
    const origin = req.headers.origin || req.headers.referer?.replace(/\/+$/, '') || 'http://localhost:5173';
    const successUrl = `${origin}/track/${req.params.token}?payment=success`;
    const cancelUrl = `${origin}/track/${req.params.token}?payment=cancelled`;

    const session = await createCheckoutSession({
      stripe,
      ticketId: ticket.id,
      storeId: ticket.store_id,
      ticketNumber: ticket.ticket_number,
      amount: balance,
      customerName: ticket.customer_name,
      successUrl,
      cancelUrl,
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

module.exports = router;
