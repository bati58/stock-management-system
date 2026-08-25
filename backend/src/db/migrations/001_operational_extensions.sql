-- Idempotent additive migration for operational workflow extensions.
-- Apply after the original schema and before seed data.

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  parent_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('SECTION', 'RACK', 'SHELF', 'BIN')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, parent_id, code)
);
ALTER TABLE items ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  head_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS evaluation_status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS evaluation_date DATE;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS evaluation_findings TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS evaluation_condition TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS evaluation_evidence TEXT;
ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS qty_accepted NUMERIC(14,2);
ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS qty_rejected NUMERIC(14,2);
CREATE TABLE IF NOT EXISTS grns (
  id SERIAL PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  goods_receipt_id INTEGER NOT NULL UNIQUE REFERENCES goods_receipts(id) ON DELETE RESTRICT,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  remarks TEXT
);
CREATE TABLE IF NOT EXISTS grn_items (
  id SERIAL PRIMARY KEY,
  grn_id INTEGER NOT NULL REFERENCES grns(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(14,2) NOT NULL
);

ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE RESTRICT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS bin TEXT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS source_id TEXT;
CREATE TABLE IF NOT EXISTS bin_card_movements (
  id SERIAL PRIMARY KEY,
  bin_card_id INTEGER NOT NULL REFERENCES bin_cards(id) ON DELETE RESTRICT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT NOT NULL,
  type TEXT NOT NULL,
  qty_in NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty_out NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL,
  actor_name TEXT,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS requisition_approvals (
  id SERIAL PRIMARY KEY,
  requisition_id INTEGER NOT NULL REFERENCES requisitions(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('Approved', 'Partially Approved', 'Rejected')),
  comments TEXT,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS posted_by TEXT;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS issue_voucher_amendments (
  id SERIAL PRIMARY KEY,
  issue_voucher_id INTEGER NOT NULL REFERENCES issue_vouchers(id) ON DELETE RESTRICT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  previous_qty NUMERIC(14,2) NOT NULL,
  amended_qty NUMERIC(14,2) NOT NULL CHECK (amended_qty > 0),
  reason TEXT,
  amended_by TEXT NOT NULL,
  amended_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS original_issue_ref TEXT;
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS qty_approved NUMERIC(14,2);
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS evaluated_by TEXT;
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP;
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS evaluation_findings TEXT;
ALTER TABLE material_returns ADD COLUMN IF NOT EXISTS evaluation_recommendation TEXT;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS destination_bin TEXT;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS dispatched_by TEXT;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS transfer_unit_price NUMERIC(14,2);

CREATE TABLE IF NOT EXISTS stock_taking_sessions (
  id SERIAL PRIMARY KEY,
  session_ref TEXT NOT NULL UNIQUE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Approved','Closed','Rejected')),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMP,
  closed_by TEXT,
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stock_taking_items (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES stock_taking_sessions(id) ON DELETE RESTRICT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  bin TEXT,
  system_qty NUMERIC(14,2) NOT NULL,
  physical_qty NUMERIC(14,2) NOT NULL CHECK (physical_qty >= 0),
  variance NUMERIC(14,2) NOT NULL,
  reason TEXT,
  counter TEXT,
  verified_by TEXT,
  adjustment_ref TEXT,
  UNIQUE (session_id, item_id, bin)
);

CREATE TABLE IF NOT EXISTS business_rules (
  id SERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_category TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('integer', 'decimal', 'boolean', 'text', 'enum')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_value TEXT,
  max_value TEXT,
  allowed_values TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  route TEXT NOT NULL DEFAULT '/',
  entity_type TEXT,
  entity_id TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_store ON locations(store_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_bin_movement_card_date ON bin_card_movements(bin_card_id, movement_date, id);
CREATE INDEX IF NOT EXISTS idx_requisition_approvals_req ON requisition_approvals(requisition_id, approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_amendments_voucher ON issue_voucher_amendments(issue_voucher_id, amended_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_taking_status ON stock_taking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_session ON stock_taking_items(session_id);
CREATE INDEX IF NOT EXISTS idx_business_rules_category ON business_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
