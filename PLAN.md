# RepairDesk SaaS Business Platform — Implementation Plan

## Business Model Analysis

### Competitor Pricing (for reference)
- **RepairDesk (competitor)**: $99/mo (Essential), $149/mo (Growth), Custom (Advanced)
- **RepairShopr**: $60/mo (Starter, limited tickets), $130/mo (Repair Shop), $150/mo/location (Big Chain)
- Both charge per-store/per-location, gate features by tier

### Recommended Tier Structure

| Feature | Starter ($49/mo) | Growth ($99/mo) | Business ($199/mo) |
|---|---|---|---|
| Users | 1 | Up to 5 | Up to 15 per store |
| Stores | 1 | 1 | Up to 5 |
| Tickets | 50/month | Unlimited | Unlimited |
| Customers | Unlimited | Unlimited | Unlimited |
| Payments & Invoicing | Yes | Yes | Yes |
| Intake Checklists | Yes | Yes | Yes |
| Inventory Management | — | Yes | Yes |
| Parts & Suppliers | — | Yes | Yes |
| Repair Templates | — | Yes | Yes |
| Canned Responses | — | Yes | Yes |
| Email Notifications | — | Yes | Yes |
| Customer Portal | — | Yes | Yes |
| Reports & Analytics | Basic | Full | Full |
| Tags & SLA Rules | — | Yes | Yes |
| Stripe Online Payments | — | Yes | Yes |
| AI Diagnostics | — | — | Yes |
| Multi-Store / Org Dashboard | — | — | Yes |
| Cross-Store Transfers | — | — | Yes |
| Cross-Store Inventory | — | — | Yes |
| Knowledge Base | — | Yes | Yes |
| Warranty Tracking | — | Yes | Yes |
| Annual Discount | 20% off | 20% off | 20% off |

**14-day free trial on all plans** — no credit card required to start.

### Why these prices?
- **Starter at $49**: Undercuts RepairShopr ($60) for solo operators. Low barrier to entry.
- **Growth at $99**: Matches RepairDesk Essential. Best value for small shops with staff.
- **Business at $199**: Multi-store premium. Higher than competitors but includes AI diagnostics.
- Annual discount (20%) encourages commitment: $39/mo, $79/mo, $159/mo effectively.

---

## Implementation Phases

### PHASE 1: Database + Platform Admin Foundation (This Session)
New migration, platform admin model, routes, and dashboard UI.

#### 1A. Database Migration (`server/migrations/004_platform.sql`)

New tables:
```sql
-- Subscription tier definitions (seeded, not user-created)
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  yearly_price NUMERIC(10,2) NOT NULL,
  max_users INTEGER NOT NULL,
  max_stores INTEGER NOT NULL,
  max_tickets_per_month INTEGER,  -- NULL = unlimited
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each store gets a subscription (defaults to trial on registration)
CREATE TABLE store_subscriptions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
  status TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform admin flag (separate from store roles)
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN DEFAULT false;

-- Monthly ticket counter for tier enforcement
ALTER TABLE stores ADD COLUMN monthly_ticket_count INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN ticket_count_reset_at TIMESTAMPTZ DEFAULT NOW();
```

Seed data — 3 tiers with feature flags:
```
Starter: features = ["tickets","customers","payments","checklists","basic_reports"]
Growth:  features = ["tickets","customers","payments","checklists","inventory","templates",
                     "canned_responses","email_notifications","customer_portal","full_reports",
                     "tags","sla","stripe_payments","knowledge_base","warranties"]
Business: features = [...Growth, "ai_diagnostics","multi_store","org_dashboard",
                      "cross_store_transfers","cross_store_inventory"]
```

#### 1B. Platform Admin Backend

**New model:** `server/src/models/platform.js`
- `getAllStores()` — list all stores with subscription info, user count, ticket count
- `getStore(storeId)` — full store detail with users, subscription, stats
- `getDashboard()` — platform-wide metrics (total stores, revenue, active trials, etc.)
- `toggleStoreActive(storeId, active)` — enable/disable a store
- `setSubscription(storeId, tierId, status)` — manually manage subscriptions
- `getSubscriptionTiers()` — list all tier definitions
- `updateTier(tierId, fields)` — edit tier pricing/features

**New middleware:** `server/src/middleware/platform.js`
- `requirePlatformAdmin` — checks `req.user.isPlatformAdmin === true`

**New routes:** `server/src/routes/platform.js`
- `GET /api/platform/dashboard` — platform metrics
- `GET /api/platform/stores` — all stores with filters (status, tier, search)
- `GET /api/platform/stores/:id` — single store detail
- `PUT /api/platform/stores/:id` — update store (activate/deactivate)
- `GET /api/platform/tiers` — list subscription tiers
- `PUT /api/platform/tiers/:id` — edit tier
- `GET /api/platform/subscriptions` — all subscriptions
- `PUT /api/platform/subscriptions/:id` — manually change subscription

**Auth changes:**
- Add `is_platform_admin` to JWT payload in `generateTokens()`
- Add `isPlatformAdmin` to `/api/auth/me` response
- You (the owner) will be bootstrapped as platform admin via a one-time DB command

#### 1C. Platform Admin Frontend

**New pages:**
- `client/src/pages/platform/PlatformDashboard.jsx` — KPI cards (total stores, MRR, active users, trials expiring)
- `client/src/pages/platform/PlatformStores.jsx` — searchable/filterable store list with subscription badges
- `client/src/pages/platform/PlatformStoreDetail.jsx` — full store view (users, tickets, subscription, usage)
- `client/src/pages/platform/PlatformTiers.jsx` — view/edit subscription tiers

**Layout changes:**
- Platform admin sees a separate nav section: "Platform" with Dashboard, Stores, Tiers
- Platform admin can "impersonate" a store to see it from their perspective (future)

**New routes in App.jsx:**
- `/platform` — PlatformDashboard
- `/platform/stores` — PlatformStores
- `/platform/stores/:id` — PlatformStoreDetail
- `/platform/tiers` — PlatformTiers

---

### PHASE 2: Feature Gating Middleware (This Session)
Enforce tier limits so free/lower tiers can't access premium features.

#### 2A. Server-Side Gating

**New middleware:** `server/src/middleware/featureGate.js`
- `requireFeature(featureName)` — checks store's subscription tier includes the feature
- `checkTicketLimit()` — for Starter tier, checks monthly ticket count
- Applied to routes that are tier-gated

**Route changes:**
- Inventory routes → `requireFeature('inventory')`
- Template routes → `requireFeature('templates')`
- Customer portal routes → `requireFeature('customer_portal')`
- Org routes → `requireFeature('multi_store')`
- AI suggestion routes → `requireFeature('ai_diagnostics')`
- Ticket creation → `checkTicketLimit()` for Starter tier

#### 2B. Client-Side Gating

- Store subscription info fetched on login (via `/api/auth/me` or `/api/store`)
- Context provider: `SubscriptionContext` with `hasFeature(name)` helper
- Nav items hidden if feature not available
- Upgrade prompts shown when accessing gated features

---

### PHASE 3: Stripe Billing Integration (Next Session)
Wire up Stripe subscriptions for automated billing.

- Platform-level Stripe account (YOUR business Stripe, separate from store Stripe keys)
- Create Stripe Products + Prices matching the 3 tiers (monthly + yearly)
- Registration flow → starts 14-day trial → prompt to subscribe before trial ends
- Stripe Customer Portal for self-service billing management
- Webhook handling: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Auto-downgrade on cancellation, grace period on past_due

---

### PHASE 4: Self-Service Subscription Management (Next Session)
Let store admins manage their own subscription.

- Billing page in Store Settings (new tab)
- Current plan display, usage stats
- Upgrade/downgrade buttons → Stripe Checkout
- Payment history from Stripe
- Cancel subscription flow

---

## Summary of Changes for Phase 1 + 2 (This Session)

### New Files:
1. `server/migrations/004_platform.sql` — new tables + seed data
2. `server/src/models/platform.js` — platform admin data model
3. `server/src/middleware/platform.js` — platform admin auth
4. `server/src/middleware/featureGate.js` — tier-based feature gating
5. `server/src/routes/platform.js` — platform admin API endpoints
6. `client/src/pages/platform/PlatformDashboard.jsx` — admin dashboard
7. `client/src/pages/platform/PlatformStores.jsx` — store management
8. `client/src/pages/platform/PlatformStoreDetail.jsx` — store detail view
9. `client/src/pages/platform/PlatformTiers.jsx` — tier management
10. `client/src/context/SubscriptionContext.jsx` — client-side feature gating

### Modified Files:
1. `server/src/routes/auth.js` — add isPlatformAdmin to JWT + me endpoint
2. `server/src/index.js` — mount platform routes, apply feature gates
3. `client/src/App.jsx` — add platform routes
4. `client/src/components/Layout.jsx` — platform admin nav section + feature gating on nav items
5. Various route files — add `requireFeature()` middleware to gated endpoints
