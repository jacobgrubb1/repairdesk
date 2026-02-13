const express = require('express');
const { getStripeClient } = require('../utils/stripe');
const paymentModel = require('../models/payment');
const storeModel = require('../models/store');
const notificationModel = require('../models/notification');
const db = require('../config/db');

const router = express.Router();

// POST /api/webhooks/stripe
// NOTE: This route must receive a raw body (not JSON-parsed).
// It is mounted in index.js with express.raw() middleware BEFORE express.json().
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing stripe-signature header');

  // The raw body is a Buffer from express.raw()
  const rawBody = req.body;

  try {
    // We need the store's webhook secret. Since Stripe doesn't tell us which store
    // this is for before verifying, we get it from session metadata after verifying.
    // Strategy: iterate stores that have webhook secrets configured,
    // try to verify with each until one matches.
    const stores = await db.many(
      "SELECT id, stripe_secret_key, stripe_webhook_secret FROM stores WHERE stripe_webhook_secret IS NOT NULL AND stripe_webhook_secret != ''"
    );

    let event = null;
    let matchedStore = null;

    for (const store of stores) {
      try {
        const stripe = getStripeClient(store.stripe_secret_key);
        event = stripe.webhooks.constructEvent(rawBody, sig, store.stripe_webhook_secret);
        matchedStore = store;
        break;
      } catch {
        // Signature didn't match this store, try the next one
        continue;
      }
    }

    if (!event || !matchedStore) {
      return res.status(400).send('Webhook signature verification failed');
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { ticketId, storeId } = session.metadata || {};

      if (ticketId && storeId) {
        const amountTotal = (session.amount_total || 0) / 100; // Convert from cents

        await paymentModel.create({
          ticketId,
          storeId,
          amount: amountTotal,
          method: 'stripe',
          note: `Online payment via Stripe`,
          createdBy: null, // No user — customer payment
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
        });

        // Get ticket number for notification
        const ticket = await db.one('SELECT ticket_number FROM tickets WHERE id = $1', [ticketId]);
        if (ticket) {
          await notificationModel.notifyRole(
            storeId,
            'admin',
            ticketId,
            'payment_received',
            `Online payment of $${amountTotal.toFixed(2)} received for Ticket #${ticket.ticket_number}`
          );
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router;
