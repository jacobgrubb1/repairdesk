-- 002_stripe.sql: Add Stripe payment integration columns

-- Stripe configuration on stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Expand payment method CHECK to include 'stripe'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash', 'card', 'check', 'other', 'stripe'));

-- Stripe reference columns on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
