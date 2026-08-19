-- =============================================================================
-- Stock Management System — PostgreSQL schema
-- Mirrors Backend-SRS.docx Section 5 field-for-field. Run once with:
--   npm run db:schema
-- =============================================================================

-- ---------- Reference number sequences (Backend-SRS §6.8) ----------
CREATE TABLE IF NOT EXISTS ref_sequences (
  prefix    TEXT PRIMARY KEY,        -- e.g. 'GRN', 'SR', 'SIV', 'SRN', 'TRF', 'DSP', 'FA'
  year      INTEGER NOT NULL,
  next_val  INTEGER NOT NULL DEFAULT 1,
  UNIQUE (prefix, year)
);

-- ---------- users (§5.1) ----------
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL,
  email          TEXT,
  department     TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- stores (§5.2) ----------
CREATE TABLE IF NOT EXISTS stores (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  code           TEXT NOT NULL UNIQUE,
  type           TEXT NOT NULL CHECK (type IN ('Main Store', 'Department Store', 'Cafe Store')),
  location       TEXT,
  head_of_store  TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- categories (§5.3) ----------
CREATE TABLE IF NOT EXISTS categories (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL,
  name         TEXT NOT NULL,
  store_id     INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  description  TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- items (§5.4) ----------
CREATE TABLE IF NOT EXISTS items (
  id             SERIAL PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,     -- 10-digit MoFED code, e.g. 4402-001-001
  name           TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  bin            TEXT,
  unit           TEXT NOT NULL,
  min_level      NUMERIC(14,2) NOT NULL DEFAULT 0,
  max_level      NUMERIC(14,2) NOT NULL DEFAULT 0,
  reorder_level  NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty_on_hand    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  unit_price     NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_store ON items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);

-- ---------- goods_receipts + line items (§5.5, §5.11) ----------
CREATE TABLE IF NOT EXISTS goods_receipts (
  id               SERIAL PRIMARY KEY,
  grn_ref          TEXT NOT NULL UNIQUE,
  supplier         TEXT NOT NULL,
  po_ref           TEXT,
  received_date    DATE NOT NULL,
  received_by      TEXT,
  store_id         INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status           TEXT NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Draft','Submitted','Pending','Pending Evaluation','Under Evaluation','Accepted','Approved','Rejected','GRN Generated')),
  evaluation_note  TEXT,
  evaluated_by     TEXT,
  gate_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  gate_verified_by TEXT,
  gate_verified_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_receipts(status);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                 SERIAL PRIMARY KEY,
  goods_receipt_id   INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  item_id            INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty                NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  unit_price         NUMERIC(14,2) NOT NULL
);

-- ---------- stock_lots — FIFO costing layer (§6.6) ----------
CREATE TABLE IF NOT EXISTS stock_lots (
  id             SERIAL PRIMARY KEY,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  received_date  DATE NOT NULL,
  unit_price     NUMERIC(14,2) NOT NULL,
  qty_received   NUMERIC(14,2) NOT NULL,
  qty_remaining  NUMERIC(14,2) NOT NULL CHECK (qty_remaining >= 0),
  source_ref     TEXT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lots_item_fifo ON stock_lots(item_id, received_date, id);

-- ---------- stock_transactions — Stock Card ledger (§5.6) ----------
CREATE TABLE IF NOT EXISTS stock_transactions (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL CHECK (type IN ('Receipt','Issue','Return','Transfer-Out','Transfer-In','Disposal')),
  ref         TEXT NOT NULL,
  qty_in      NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty_out     NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance     NUMERIC(14,2) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stocktxn_item_date ON stock_transactions(item_id, date);

-- ---------- bin_cards (§5.7) ----------
CREATE TABLE IF NOT EXISTS bin_cards (
  id             SERIAL PRIMARY KEY,
  bin            TEXT NOT NULL,
  store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  last_movement  DATE,
  balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
  UNIQUE (bin, store_id, item_id)
);

-- ---------- bin_transfers (§5.8) ----------
CREATE TABLE IF NOT EXISTS bin_transfers (
  id              SERIAL PRIMARY KEY,
  item_id         INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  from_bin        TEXT NOT NULL,
  to_bin          TEXT NOT NULL,
  qty             NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  transferred_by  TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- requisitions + line items (§5.9) ----------
CREATE TABLE IF NOT EXISTS requisitions (
  id            SERIAL PRIMARY KEY,
  sr_ref        TEXT NOT NULL UNIQUE,
  department    TEXT NOT NULL,
  requested_by  TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft','Pending','Partially Approved','Approved','Rejected')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_req_status ON requisitions(status);

CREATE TABLE IF NOT EXISTS requisition_items (
  id               SERIAL PRIMARY KEY,
  requisition_id   INTEGER NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  item_id          INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty              NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  qty_approved     NUMERIC(14,2) CHECK (qty_approved >= 0)
);

-- ---------- issue_vouchers + line items (§5.10) ----------
CREATE TABLE IF NOT EXISTS issue_vouchers (
  id          SERIAL PRIMARY KEY,
  siv_ref     TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('SIV','ISIV')),
  sr_ref      TEXT NOT NULL,
  issued_to   TEXT,
  issued_by   TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'Issued',
  gate_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  gate_verified_by TEXT,
  gate_verified_at TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_voucher_items (
  id                 SERIAL PRIMARY KEY,
  issue_voucher_id   INTEGER NOT NULL REFERENCES issue_vouchers(id) ON DELETE CASCADE,
  item_id            INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty                NUMERIC(14,2) NOT NULL,
  unit_price         NUMERIC(14,2) NOT NULL
);

-- ---------- fixed_assets (§5.12) ----------
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                SERIAL PRIMARY KEY,
  asset_tag         TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  category          TEXT,
  store_id          INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  assigned_to       TEXT,
  status            TEXT NOT NULL DEFAULT 'In Store'
                      CHECK (status IN ('Registered','In Store','Assigned','In Use','Maintenance','Under Repair','Lost','Damaged','Disposed')),
  acquisition_date  DATE,
  value             NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- material_returns / SRN (§5.13) ----------
CREATE TABLE IF NOT EXISTS material_returns (
  id           SERIAL PRIMARY KEY,
  srn_ref      TEXT NOT NULL UNIQUE,
  department   TEXT NOT NULL,
  item_id      INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty          NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  reason       TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft','Submitted','Pending Review','Approved','Rejected','Returned to Stock')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- material_transfers — store to store (§5.14) ----------
CREATE TABLE IF NOT EXISTS material_transfers (
  id             SERIAL PRIMARY KEY,
  transfer_ref   TEXT NOT NULL UNIQUE,
  from_store_id  INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  to_store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty            NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft','Submitted','Pending Approval','Approved','Dispatched','Received','Completed','Rejected')),
  gate_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  gate_verified_by TEXT,
  gate_verified_at TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- disposals (§5.15) ----------
CREATE TABLE IF NOT EXISTS disposals (
  id             SERIAL PRIMARY KEY,
  disposal_ref   TEXT NOT NULL UNIQUE,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  qty            NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  reason         TEXT,
  date_flagged   DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Flagged','Requested','Pending Review','Approved','Rejected','Executed','Completed')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- audit_logs (§5.16) ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_name   TEXT NOT NULL,
  action      TEXT NOT NULL,
  module      TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS user_cards (
  id             SERIAL PRIMARY KEY,
  user_name      TEXT NOT NULL,
  department     TEXT,
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  issue_ref      TEXT NOT NULL,
  issue_date     DATE NOT NULL,
  qty            NUMERIC(14,2) NOT NULL CHECK (qty > 0),
  status         TEXT NOT NULL DEFAULT 'In Use' CHECK (status IN ('In Use','Maintenance','Lost','Damaged','Returned')),
  returned_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Status vocabulary migration ----------
-- Keep an existing installation in sync with the richer frontend workflows.
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conrelid::regclass AS table_name, c.conname
    FROM pg_constraint c
    WHERE c.conrelid IN ('goods_receipts'::regclass, 'requisitions'::regclass, 'fixed_assets'::regclass, 'material_returns'::regclass, 'material_transfers'::regclass, 'disposals'::regclass)
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;

  ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_status_check
    CHECK (status IN ('Draft','Submitted','Pending','Pending Evaluation','Under Evaluation','Accepted','Approved','Rejected','GRN Generated'));

  ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;
  ALTER TABLE requisitions ADD CONSTRAINT requisitions_status_check
    CHECK (status IN ('Draft','Pending','Partially Approved','Approved','Rejected'));

  ALTER TABLE fixed_assets DROP CONSTRAINT IF EXISTS fixed_assets_status_check;
  ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_status_check
    CHECK (status IN ('Registered','In Store','Assigned','In Use','Maintenance','Under Repair','Lost','Damaged','Disposed'));

  ALTER TABLE material_returns DROP CONSTRAINT IF EXISTS material_returns_status_check;
  ALTER TABLE material_returns ADD CONSTRAINT material_returns_status_check
    CHECK (status IN ('Draft','Submitted','Pending','Pending Review','Approved','Rejected','Returned to Stock'));

  ALTER TABLE material_transfers DROP CONSTRAINT IF EXISTS material_transfers_status_check;
  ALTER TABLE material_transfers ADD CONSTRAINT material_transfers_status_check
    CHECK (status IN ('Draft','Submitted','Pending','Pending Approval','Approved','Dispatched','Received','Completed','Rejected'));

  ALTER TABLE disposals DROP CONSTRAINT IF EXISTS disposals_status_check;
  ALTER TABLE disposals ADD CONSTRAINT disposals_status_check
    CHECK (status IN ('Flagged','Requested','Pending','Pending Review','Approved','Rejected','Executed','Completed'));
END $$;

-- ---------- Existing-installation additions ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gate_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gate_verified_by TEXT;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gate_verified_at TIMESTAMP;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS gate_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS gate_verified_by TEXT;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS gate_verified_at TIMESTAMP;
ALTER TABLE issue_vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS gate_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS gate_verified_by TEXT;
ALTER TABLE material_transfers ADD COLUMN IF NOT EXISTS gate_verified_at TIMESTAMP;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_reference TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE requisition_items ADD COLUMN IF NOT EXISTS qty_approved NUMERIC(14,2);
