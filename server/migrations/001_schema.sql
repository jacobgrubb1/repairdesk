-- ============================================================
-- Consolidated PostgreSQL Schema for RepairDesk SaaS
-- Replaces: 001_initial, 002_features, 003_expansion, 004_portal_inventory
-- ============================================================

-- Organizations (parent grouping entity for stores)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  warranty_days INTEGER DEFAULT 30,
  warranty_terms TEXT DEFAULT 'Standard warranty covers the specific repair performed. Does not cover physical damage, water damage, or unrelated issues.',
  receipt_footer TEXT DEFAULT 'Thank you for your business!',
  logo_url TEXT,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(organization_id);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'front_desk')),
  is_active INTEGER DEFAULT 1,
  org_role TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  ticket_number INTEGER,
  device_type TEXT,
  device_brand TEXT,
  device_model TEXT,
  issue_description TEXT NOT NULL,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'diagnosing', 'awaiting_approval', 'in_repair', 'completed', 'picked_up', 'cancelled')),
  estimated_cost NUMERIC(10,2),
  final_cost NUMERIC(10,2),
  parts_cost NUMERIC(10,2) DEFAULT 0,
  labor_cost NUMERIC(10,2) DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  assigned_to TEXT REFERENCES users(id),
  notify_customer INTEGER DEFAULT 0,
  accessories TEXT,
  intake_signature TEXT,
  pickup_signature TEXT,
  tracking_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_store ON tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(store_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_tracking_token ON tickets(tracking_token);

-- Ticket notes
CREATE TABLE IF NOT EXISTS ticket_notes (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket ON ticket_notes(ticket_id);

-- Ticket costs
CREATE TABLE IF NOT EXISTS ticket_costs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('part', 'labor', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  hours NUMERIC(6,2),
  hourly_rate NUMERIC(10,2),
  part_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_costs_ticket ON ticket_costs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_costs_part ON ticket_costs(part_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'check', 'other')),
  note TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payments_store ON payments(store_id);

-- SLA rules
CREATE TABLE IF NOT EXISTS sla_rules (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  max_hours NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_rules_store ON sla_rules(store_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_store ON notifications(store_id);

-- Repair templates
CREATE TABLE IF NOT EXISTS repair_templates (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT,
  device_brand TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_store ON repair_templates(store_id);

CREATE TABLE IF NOT EXISTS repair_template_items (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES repair_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('part', 'labor', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  hours NUMERIC(6,2),
  hourly_rate NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON repair_template_items(template_id);

-- Intake checklist items
CREATE TABLE IF NOT EXISTS intake_checklist_items (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  checked INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_ticket ON intake_checklist_items(ticket_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_store ON tags(store_id);

CREATE TABLE IF NOT EXISTS ticket_tags (
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Warranties
CREATE TABLE IF NOT EXISTS warranties (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  warranty_days INTEGER NOT NULL DEFAULT 30,
  warranty_terms TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranties_ticket ON warranties(ticket_id);
CREATE INDEX IF NOT EXISTS idx_warranties_store ON warranties(store_id);

-- Ticket photos
CREATE TABLE IF NOT EXISTS ticket_photos (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('intake', 'repair', 'completion')),
  taken_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_photos_ticket ON ticket_photos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_photos_store ON ticket_photos(store_id);

-- Customer feedback
CREATE TABLE IF NOT EXISTS ticket_feedback (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_feedback_ticket ON ticket_feedback(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_feedback_store ON ticket_feedback(store_id);

-- Customer approvals
CREATE TABLE IF NOT EXISTS ticket_approvals (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_approvals_ticket ON ticket_approvals(ticket_id);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers(store_id);

-- Parts catalog
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_store ON parts(store_id);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts(store_id, sku);
CREATE INDEX IF NOT EXISTS idx_parts_supplier ON parts(supplier_id);

-- Part stock transactions
CREATE TABLE IF NOT EXISTS part_transactions (
  id TEXT PRIMARY KEY,
  part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES tickets(id) ON DELETE SET NULL,
  quantity_change INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restock', 'used', 'adjustment')),
  note TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_part_transactions_part ON part_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_part_transactions_ticket ON part_transactions(ticket_id);

-- Ticket transfers
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_store_id TEXT NOT NULL REFERENCES stores(id),
  to_store_id TEXT NOT NULL REFERENCES stores(id),
  transferred_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket ON ticket_transfers(ticket_id);

-- Canned responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_store ON canned_responses(store_id);
