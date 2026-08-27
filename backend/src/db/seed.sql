-- =============================================================================
-- Demo seed data — mirrors frontend/src/services/seed.js exactly, so the
-- numbers on screen don't change the moment the frontend is pointed at this
-- real API. Passwords for every seeded user: "sms1234" (bcrypt-hashed below).
-- Run with: npm run db:seed  (after npm run db:schema)
-- =============================================================================

-- Password hash below is bcrypt("sms1234", 10) — same for every demo user.
-- Generate your own with: node -e "console.log(require('bcryptjs').hashSync('sms1234',10))"
-- and replace if you want a different demo password.

INSERT INTO users (name, username, password_hash, role, email, active) VALUES
  ('Abel Tesfaye',   'admin',       '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Administrator', 'admin@sms.local', TRUE),
  ('Meron Getachew', 'pao',         '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Property Administration Officer', 'pao@sms.local', TRUE),
  ('Yonas Bekele',   'storehead',   '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Store Head', 'storehead@sms.local', TRUE),
  ('Sara Alemu',     'storekeeper', '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Storekeeper', 'storekeeper@sms.local', TRUE),
  ('Kaleb Mulugeta', 'clerk',       '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Stock Clerk', 'clerk@sms.local', TRUE),
  ('Dr. Fikru Wolde','tec',         '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Technical Evaluation Committee', 'tec@sms.local', TRUE),
  ('Hana Girma',     'depthead',    '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Department Head', 'depthead@sms.local', TRUE),
  ('Biniam Assefa',  'accountant',  '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Accountant', 'accountant@sms.local', TRUE),
  ('Samuel Tadesse', 'security',    '$2a$10$fF.Qgf.cGWoI8R7KsGJHkuOA42j/R49By3m3JX7MSnhzt1W6w/Ytq', 'Security Officer', 'security@sms.local', TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO stores (name, code, type, location, head_of_store, active) VALUES
  ('Main Store', 'STR-MAIN', 'Main Store', 'Central Warehouse', 'Yonas Bekele', TRUE),
  ('Electrical Engineering Dept. Store', 'STR-EEE', 'Department Store', 'EEE Building', 'Sara Alemu', TRUE),
  ('Mechanical Engineering Dept. Store', 'STR-MEE', 'Department Store', 'MEE Building', 'Kaleb Mulugeta', TRUE),
  ('Chemical Engineering Dept. Store', 'STR-CHE', 'Department Store', 'CHE Building', 'Hana Girma', TRUE),
  ('Cafeteria Store', 'STR-CAF', 'Cafe Store', 'Student Cafeteria', 'Biniam Assefa', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (code, name, store_id, description) VALUES
  ('4402', 'Office Supplies', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Stationery and general office consumables'),
  ('4405', 'Educational Supplies', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Teaching and laboratory materials'),
  ('4411', 'Research & Development Supplies', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Equipment and materials for R&D labs'),
  ('4414', 'Spare Parts', (SELECT id FROM stores WHERE code='STR-MEE'), 'Workshop and machine spare parts'),
  ('4406', 'Food Items', (SELECT id FROM stores WHERE code='STR-CAF'), 'Cafeteria consumables')
ON CONFLICT DO NOTHING;

INSERT INTO items (code, name, category_id, store_id, bin, unit, min_level, max_level, reorder_level, qty_on_hand, unit_price) VALUES
  ('4402-001-001', 'A4 Photocopy Paper (White)', (SELECT id FROM categories WHERE code='4402'), (SELECT id FROM stores WHERE code='STR-MAIN'), 'A-01', 'ream', 50, 500, 100, 320, 220),
  ('4402-002-004', 'Ballpoint Pen (Blue)', (SELECT id FROM categories WHERE code='4402'), (SELECT id FROM stores WHERE code='STR-MAIN'), 'A-02', 'box', 20, 200, 40, 18, 150),
  ('4405-001-002', 'Digital Multimeter', (SELECT id FROM categories WHERE code='4405'), (SELECT id FROM stores WHERE code='STR-EEE'), 'E-05', 'pcs', 5, 60, 10, 34, 1850),
  ('4411-003-001', 'Arduino Uno R3 Board', (SELECT id FROM categories WHERE code='4411'), (SELECT id FROM stores WHERE code='STR-MAIN'), 'B-11', 'pcs', 10, 100, 20, 62, 950),
  ('4414-002-007', 'Ball Bearing 6205-ZZ', (SELECT id FROM categories WHERE code='4414'), (SELECT id FROM stores WHERE code='STR-MEE'), 'M-03', 'pcs', 30, 300, 60, 45, 180),
  ('4406-001-005', 'Cooking Oil (5L)', (SELECT id FROM categories WHERE code='4406'), (SELECT id FROM stores WHERE code='STR-CAF'), 'C-01', 'litre', 40, 400, 80, 75, 900)
ON CONFLICT (code, store_id) DO NOTHING;

-- Seed a FIFO lot for every item matching its current qty_on_hand, so FIFO
-- issuing works correctly from the very first transaction after seeding.
INSERT INTO stock_lots (item_id, received_date, unit_price, qty_received, qty_remaining, source_ref)
SELECT id, CURRENT_DATE - INTERVAL '10 days', unit_price, qty_on_hand, qty_on_hand, 'SEED-OPENING-BALANCE'
FROM items;

INSERT INTO bin_cards (bin, store_id, item_id, last_movement, balance)
SELECT bin, store_id, id, CURRENT_DATE - INTERVAL '5 days', qty_on_hand FROM items WHERE bin IS NOT NULL;

INSERT INTO goods_receipts (grn_ref, supplier, po_ref, received_date, received_by, store_id, status, evaluation_note, evaluated_by) VALUES
  ('GRN-2026-0001', 'Ethio Office Supplies PLC', 'PO-2026-014', '2026-08-05', 'Sara Alemu', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Approved', 'Quantity and quality verified against packing slip. Accepted.', 'Dr. Fikru Wolde'),
  ('GRN-2026-0002', 'National Lab Equipment Importers', 'PO-2026-021', '2026-08-11', 'Sara Alemu', (SELECT id FROM stores WHERE code='STR-EEE'), 'Under Evaluation', NULL, NULL),
  ('GRN-2026-0003', 'Addis Hardware Trading', 'PO-2026-028', '2026-08-13', 'Kaleb Mulugeta', (SELECT id FROM stores WHERE code='STR-MEE'), 'Pending', NULL, NULL)
ON CONFLICT (grn_ref) DO NOTHING;

INSERT INTO goods_receipt_items (goods_receipt_id, item_id, qty, unit_price) VALUES
  ((SELECT id FROM goods_receipts WHERE grn_ref='GRN-2026-0001'), (SELECT id FROM items WHERE code='4402-001-001'), 100, 220),
  ((SELECT id FROM goods_receipts WHERE grn_ref='GRN-2026-0002'), (SELECT id FROM items WHERE code='4405-001-002'), 15, 1850),
  ((SELECT id FROM goods_receipts WHERE grn_ref='GRN-2026-0003'), (SELECT id FROM items WHERE code='4414-002-007'), 50, 180);

INSERT INTO requisitions (sr_ref, department, requested_by, date, store_id, status) VALUES
  ('SR-2026-0041', 'Electrical Engineering Dept.', 'Hana Girma', '2026-08-10', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Pending'),
  ('SR-2026-0040', 'Mechanical Engineering Dept.', 'Kaleb Mulugeta', '2026-08-08', (SELECT id FROM stores WHERE code='STR-MEE'), 'Approved')
ON CONFLICT (sr_ref) DO NOTHING;

INSERT INTO requisition_items (requisition_id, item_id, qty) VALUES
  ((SELECT id FROM requisitions WHERE sr_ref='SR-2026-0041'), (SELECT id FROM items WHERE code='4402-001-001'), 10),
  ((SELECT id FROM requisitions WHERE sr_ref='SR-2026-0041'), (SELECT id FROM items WHERE code='4402-002-004'), 5),
  ((SELECT id FROM requisitions WHERE sr_ref='SR-2026-0040'), (SELECT id FROM items WHERE code='4414-002-007'), 20);

INSERT INTO fixed_assets (asset_tag, name, category, store_id, assigned_to, status, acquisition_date, value) VALUES
  ('FA-2026-0102', 'HP LaserJet Printer M404', 'Office Equipment', (SELECT id FROM stores WHERE code='STR-MAIN'), 'Registrar Office', 'In Use', '2025-03-10', 18500),
  ('FA-2026-0155', 'Oscilloscope - Tektronix TBS1052B', 'Lab Equipment', (SELECT id FROM stores WHERE code='STR-EEE'), 'EEE Lab 2', 'In Use', '2024-11-02', 62000)
ON CONFLICT (asset_tag) DO NOTHING;

INSERT INTO material_returns (srn_ref, department, item_id, qty, reason, date, status) VALUES
  ('SRN-2026-0011', 'Chemical Engineering Dept.', (SELECT id FROM items WHERE code='4405-001-002'), 2, 'Excess issued quantity', '2026-08-06', 'Pending')
ON CONFLICT (srn_ref) DO NOTHING;

INSERT INTO material_transfers (transfer_ref, from_store_id, to_store_id, item_id, qty, date, status) VALUES
  ('TRF-2026-0007', (SELECT id FROM stores WHERE code='STR-MAIN'), (SELECT id FROM stores WHERE code='STR-EEE'), (SELECT id FROM items WHERE code='4411-003-001'), 15, '2026-08-04', 'Approved')
ON CONFLICT (transfer_ref) DO NOTHING;

INSERT INTO disposals (disposal_ref, item_id, store_id, qty, reason, date_flagged, status) VALUES
  ('DSP-2026-0003', (SELECT id FROM items WHERE code='4402-001-001'), (SELECT id FROM stores WHERE code='STR-MAIN'), 3, 'Obsolete - beyond economical repair', '2026-07-20', 'Pending')
ON CONFLICT (disposal_ref) DO NOTHING;

INSERT INTO audit_logs (user_name, action, module) VALUES
  ('Sara Alemu', 'Created GRN-2026-0001', 'Goods Receipt'),
  ('Dr. Fikru Wolde', 'Approved evaluation for GRN-2026-0001', 'Technical Evaluation'),
  ('admin', 'Created user account for Biniam Assefa', 'User Management');

-- Seed the reference sequences so the first auto-generated ref after seeding
-- continues from where the demo data leaves off, e.g. next GRN is 0004.
INSERT INTO ref_sequences (prefix, year, next_val) VALUES
  ('GRN', 2026, 4), ('SR', 2026, 42), ('SIV', 2026, 10),
  ('SRN', 2026, 12), ('TRF', 2026, 8), ('DSP', 2026, 4), ('FA', 2026, 156)
ON CONFLICT (prefix, year) DO NOTHING;
