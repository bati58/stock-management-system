# Transaction Database Verification

Use these checks after each UI action. Run them against the same PostgreSQL database used by the backend. Replace placeholders with the real references returned by the UI.

## 1. Document Status

```sql
SELECT grn_ref, status, evaluation_status, received_date, updated_at
FROM goods_receipts
WHERE grn_ref = '<GRN-...>';

SELECT sr_ref, status, department, updated_at
FROM requisitions
WHERE sr_ref = '<SR-...>';

SELECT siv_ref, sr_ref, status, gate_verified, posted_by, posted_at
FROM issue_vouchers
WHERE siv_ref = '<SIV-...>';

SELECT srn_ref, status, qty, qty_approved, original_issue_ref, updated_at
FROM material_returns
WHERE srn_ref = '<SRN-...>';

SELECT transfer_ref, status, qty, from_store_id, to_store_id,
       dispatched_by, received_by, dispatched_at, received_at
FROM material_transfers
WHERE transfer_ref = '<TRF-...>';
```

## 2. Check the Item Balance

```sql
SELECT i.code, i.name, s.name AS store_name, i.bin,
       i.qty_on_hand, i.unit, i.unit_price
FROM items i
JOIN stores s ON s.id = i.store_id
WHERE i.code = 'ITEM-TEST-001';
```

Expected source-store balance for the guide scenario:

```text
0 + 10 - 6 + 2 - 3 = 3
```

## 3. Check Receipt Posting

```sql
SELECT grn_number, goods_receipt_id, generated_by, generated_at
FROM grns
WHERE goods_receipt_id = (
  SELECT id FROM goods_receipts WHERE grn_ref = '<GRN-...>'
);

SELECT gi.item_id, i.code, gi.qty, gi.unit_price
FROM grn_items gi
JOIN items i ON i.id = gi.item_id
JOIN grns g ON g.id = gi.grn_id
WHERE g.goods_receipt_id = (
  SELECT id FROM goods_receipts WHERE grn_ref = '<GRN-...>'
);

SELECT source_ref, qty_received, qty_remaining, unit_price
FROM stock_lots
WHERE source_ref = '<GRN-...>'
ORDER BY id;
```

For the example, GRN quantity is `10`, not the delivered quantity `12`.

## 4. Check Stock Ledger and Bin Card

```sql
SELECT st.date, st.type, st.ref, st.qty_in, st.qty_out,
       st.balance, st.actor_name, s.name AS store_name, st.bin,
       st.source_type, st.source_id
FROM stock_transactions st
LEFT JOIN stores s ON s.id = st.store_id
WHERE st.ref IN ('<GRN-...>', '<SIV-...>', '<SRN-...>', '<TRF-...>')
   OR st.source_id IN ('<GRN-...>', '<SIV-...>', '<SRN-...>', '<TRF-...>')
ORDER BY st.id;

SELECT bcm.movement_date, bcm.reference, bcm.type,
       bcm.qty_in, bcm.qty_out, bcm.balance, bcm.actor_name,
       bcm.bin_card_id
FROM bin_card_movements bcm
WHERE bcm.reference IN ('<GRN-...>', '<SIV-...>', '<SRN-...>', '<TRF-...>')
ORDER BY bcm.id;
```

Expected source-store movements for the guide:

| Reference | Type | In | Out |
|---|---|---:|---:|
| GRN | Receipt | 10 | 0 |
| SIV | Issue | 0 | 6 |
| SRN | Return | 2 | 0 |
| TRF | Transfer-Out | 0 | 3 |

## 5. Check FIFO Lots

```sql
SELECT sl.id, i.code, sl.received_date, sl.unit_price,
       sl.qty_received, sl.qty_remaining, sl.source_ref
FROM stock_lots sl
JOIN items i ON i.id = sl.item_id
WHERE i.code = 'ITEM-TEST-001'
ORDER BY sl.received_date, sl.id;
```

The issue consumes the oldest lot first. The reusable return creates a new lot unless the implementation reuses an existing layer.

## 6. Check Requisition Approval and Issue Link

```sql
SELECT r.sr_ref, r.status, ri.qty, ri.qty_approved,
       ra.decision, ra.approved_by, ra.approved_at
FROM requisitions r
JOIN requisition_items ri ON ri.requisition_id = r.id
LEFT JOIN requisition_approvals ra ON ra.requisition_id = r.id
WHERE r.sr_ref = '<SR-...>'
ORDER BY ra.approved_at DESC;

SELECT siv_ref, sr_ref, status
FROM issue_vouchers
WHERE sr_ref = '<SR-...>';
```

## 7. Check Audit and Notifications

```sql
SELECT created_at, user_name, actor_role, action, module,
       entity_type, entity_reference, outcome
FROM audit_logs
WHERE entity_reference IN ('<GRN-...>', '<SR-...>', '<SIV-...>', '<SRN-...>', '<TRF-...>')
   OR entity_id IN (
     SELECT id::text FROM goods_receipts WHERE grn_ref = '<GRN-...>'
   )
ORDER BY created_at;

SELECT n.created_at, u.username, u.role, n.title, n.message,
       n.route, n.entity_type, n.entity_id, n.read_at
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.id DESC
LIMIT 30;
```

## 8. Negative Checks

Each invalid action must fail without changing stock or creating partial ledger rows:

```text
Post the same GRN twice.
Post the same SIV twice.
Issue more than available stock.
Return more than the posted SIV quantity.
Transfer from a source bin with insufficient balance.
Use the same source and destination store.
Use the same source and destination bin.
Approve or post while logged in with the wrong role.
```

After a failed request, rerun the item, stock transaction, FIFO, and bin movement queries. The balances and row counts must be unchanged.

## 9. Pass Criteria

A transaction passes only when all of these are true:

- The UI shows the expected status after refresh.
- The database stores that status.
- Stock changes only at the correct final action.
- The item balance equals the ledger balance.
- FIFO lots match posted quantities.
- Bin-card movements match stock movements.
- The document reference links all related rows.
- Audit records identify actor, role, action, and outcome.
- Notifications go to the next responsible actor.
- Repeating the final CTA does not duplicate stock.
