const Stripe = require('stripe');

function getStripeClient(secretKey) {
  if (!secretKey) throw new Error('Stripe secret key is not configured');
  return new Stripe(secretKey);
}

async function createCheckoutSession({ stripe, ticketId, storeId, ticketNumber, amount, customerName, successUrl, cancelUrl }) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Repair Ticket #${ticketNumber}`,
            description: `Payment for repair services – ${customerName}`,
          },
          unit_amount: Math.round(amount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      ticketId,
      storeId,
      ticketNumber: String(ticketNumber),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

module.exports = { getStripeClient, createCheckoutSession };
