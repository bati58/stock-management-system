# Stock Management System
## Manual End-to-End UI Workflow Test Playbook

This playbook is for manually testing the complete application through the
frontend browser. Enter the values in the forms, click the displayed CTA, and
verify that the API response, status, stock, ledger, audit, and notification
change correctly.

The test data is synthetic. Do not use production data.

---

## 1. Start the System

### Database and backend

From the repository root:

```text
cd backend
npm install
npm run db:schema
npm run db:seed
npm run dev
```

The backend must respond at:

```text
http://localhost:4000/health
```

### Frontend

In a second terminal:

```text
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend API URL must be:

```text
VITE_API_BASE_URL=http://localhost:4000/api
```

Never run `db:schema` against a database that contains data you need to keep.
It recreates the schema. Use the normal seed only on a test database.

---

## 2. Test Users and Responsibilities

Every seeded user has password `sms1234`.

| Login | Role | Responsible for |
|---|---|---|
| `admin` | Administrator | Administration and controlled diagnostic access |
| `pao` | Property Administration Officer | Property approvals, transfers, disposals, controls |
| `storehead` | Store Head | Store review, approval, and authorized stock operations |
| `storekeeper` | Storekeeper | Receiving, preparation, dispatch, receipt, and stock operations |
| `clerk` | Stock Clerk | Stock-taking and assigned stock-record work |
| `tec` | Technical Evaluation Committee | Technical receipt evaluation |
| `depthead` | Department Head | Department requisition approval |
| `accountant` | Accountant | Financial and valuation reports |
| `security` | Security Officer | Gate-pass verification |

### Manual test rule

Use a different login when the responsible actor changes. Log out and log in as
the next actor. Do not use Administrator for every step because that hides
separation-of-duties problems.

For every CTA, record:

```text
Current status:
Responsible actor:
What is waiting:
CTA clicked:
API endpoint:
Expected next status:
Actual next status:
Database rows changed:
Stock changed:
Audit created:
Notification created:
```

---

## 3. Database Verification Queries

Run these queries in the PostgreSQL client after each workflow step. Replace
`<id>` and `<ref>` with values returned by the UI/API.

### Check a document status

```sql
SELECT * FROM goods_receipts WHERE grn_ref = '<ref>';
SELECT * FROM requisitions WHERE sr_ref = '<ref>';
SELECT * FROM issue_vouchers WHERE siv_ref = '<ref>';
SELECT * FROM material_returns WHERE srn_ref = '<ref>';
SELECT * FROM material_transfers WHERE transfer_ref = '<ref>';
SELECT * FROM disposals WHERE disposal_ref = '<ref>';
SELECT * FROM stock_taking_sessions WHERE session_ref = '<ref>';
```

### Check item quantity

```sql
SELECT code, name, store_id, bin, qty_on_hand, unit_price
FROM items
WHERE code = '<item-code>';
```

### Check all stock evidence for a reference

```sql
SELECT date, type, ref, qty_in, qty_out, balance, actor_name,
       store_id, bin, reason, source_type, source_id
FROM stock_transactions
WHERE ref = '<ref>' OR source_id = '<ref>'
ORDER BY id;

SELECT *
FROM stock_lots
WHERE source_ref = '<ref>'
ORDER BY id;

SELECT bcm.*
FROM bin_card_movements bcm
WHERE bcm.reference = '<ref>'
ORDER BY bcm.id;
```

### Check audit and notifications

```sql
SELECT created_at, user_name, actor_role, action, module,
       entity_type, entity_id, entity_reference, outcome
FROM audit_logs
ORDER BY id DESC
LIMIT 20;

SELECT n.created_at, u.username, u.role, n.title, n.message,
       n.route, n.entity_type, n.entity_id, n.read_at
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.id DESC
LIMIT 20;
```

A status-only frontend update is a failure. The backend must persist the
status and the page must show the persisted value after refresh.

---

# 4. Master Data Setup Workflows

Master data does not normally change stock, but every record must be available
for later workflows.

## 4.1 Department

**Login:** `admin` or `pao`

**Page:** Departments

Enter:

```text
Code: DEPT-MECH-TEST
Name: Mechanical Test Department
Head: Kaleb Mulugeta
Active: Yes
```

Expected:

```text
Create -> record appears in the list -> GET /api/departments
```

Verify:

```sql
SELECT * FROM departments WHERE code = 'DEPT-MECH-TEST';
```

Test Edit and Activate/Deactivate. Refresh the page after each action.

## 4.2 Supplier

**Login:** `pao`

**Page:** Suppliers

Enter:

```text
Code: SUP-TEST-001
Name: Test Engineering Supplies PLC
Contact: +251-911-000001
Address: Addis Ababa
Active: Yes
```

Expected: the supplier is available in the Goods Receipt supplier selector.

Verify:

```sql
SELECT * FROM suppliers WHERE code = 'SUP-TEST-001';
```

## 4.3 Store

**Login:** `admin`, `pao`, or authorized `storehead`

**Page:** Stores

Enter:

```text
Name: Testing Main Store
Code: STR-TEST
Type: Main Store
Location: Testing Warehouse
Head of Store: Yonas Bekele
Contact: +251-911-000002
Description: Store used for manual workflow testing
Active: Yes
```

Expected: the store can be selected by item, receipt, requisition, and transfer
forms.

Do not delete a store after it has operational history.

## 4.4 Category

**Login:** `admin`, `pao`, or `storehead`

**Page:** Categories

Enter:

```text
Code: CAT-TEST-001
Name: Manual Test Consumables
Applicable Store: Testing Main Store
Description: Materials used for manual workflow verification
Active: Yes
```

## 4.5 Locations

**Login:** `storehead` or `storekeeper`

**Page:** Locations

Create the hierarchy in this order:

```text
SECTION: TEST-SECTION
RACK: TEST-RACK       parent TEST-SECTION
SHELF: TEST-SHELF     parent TEST-RACK
BIN: TEST-BIN         parent TEST-SHELF
```

Expected: each child can only be created after its parent exists.

## 4.6 Item

**Login:** `storehead` or `storekeeper`

**Page:** Items

Enter:

```text
Code: ITEM-TEST-001
Name: Test A4 Paper
Category: Manual Test Consumables
Store: Testing Main Store
Bin: TEST-BIN
Unit: ream
Minimum level: 10
Maximum level: 100
Reorder level: 20
Quantity on hand: 0 for a new item
Unit price: 220
Expiry date: leave empty for normal paper
Batch number: TEST-BATCH-001
Condition: Good
```

Expected: creation does not invent a stock transaction. Stock enters through a
Goods Receipt or another valid stock operation.

Verify:

```sql
SELECT * FROM items WHERE code = 'ITEM-TEST-001';
```

---

# 5. Goods Receipt to Available Stock

This is the main receiving journey. Use the same item and supplier created
above, or use the seeded A4 paper and `Ethio Office Supplies PLC`.

## Example delivery

```text
Supplier: Test Engineering Supplies PLC
PO / purchase reference: PO-TEST-001
Delivery document: DN-TEST-001
Store: Testing Main Store
Item: Test A4 Paper
Quantity received: 12 reams
Unit price: 220
Condition: Good
Temporary location/bin: TEST-BIN
```

## Step 1 - Create receipt

**Login:** `storekeeper`

**Page:** Goods Receipt -> Record Goods Receipt

CTA: `Create Goods Receipt`

Expected status: `Draft`.

Expected database effect:

```text
goods_receipts: one new Draft row
items.qty_on_hand: unchanged
stock_transactions: no receipt row
stock_lots: no new lot
bin_card_movements: no new movement
```

Verify the quantity before continuing:

```sql
SELECT qty_on_hand FROM items WHERE code = 'ITEM-TEST-001';
```

## Step 2 - Submit for evaluation

**Login:** `storekeeper`

Open the Draft record and click:

`Submit for Evaluation`

Expected status: `Draft -> Submitted`.

Expected effects:

```text
Receipt status persisted
Audit event created
Notification sent to the next receiving actor
Stock unchanged
```

## Step 3 - Store review / send to TEC

**Login:** `storehead`

Open the submitted receipt.

Expected responsibility: Store Head.

Expected actions, if implemented by the current page:

```text
View
Verify Documents
Return for Correction
Send to TEC
```

Click `Send to TEC`.

Expected status: `Submitted -> Pending Evaluation` or `Under Evaluation`,
depending on the displayed workflow step.

Expected stock effect: none.

## Step 4 - Technical evaluation

**Login:** `tec`

**Page:** Goods Receipt Evaluation

Open the receipt and click `Evaluate`.

Enter:

```text
Findings: Packaging verified; two reams have water damage.
Accepted quantity: 10
Rejected quantity: 2
Condition: Good for accepted quantity
Evidence: DN-TEST-001 and inspection photo reference TEST-EVID-001
Remarks: Accept 10 reams and reject 2 damaged reams.
```

Choose `Partially Approved`.

Expected status: `Under Evaluation -> Partially Accepted`.

Expected effects:

```text
goods_receipt_items.qty_accepted = 10
goods_receipt_items.qty_rejected = 2
evaluation fields saved
audit event created
notification sent to the GRN actor
items.qty_on_hand unchanged
```

## Step 5 - Generate GRN

**Login:** `storehead` or authorized GRN actor

Click:

`Generate GRN / Model 19`

Expected status: `Partially Accepted -> GRN Generated`.

Expected effects:

```text
grns row created
grn_items row created for accepted quantity 10
items.qty_on_hand unchanged
no FIFO lot yet
no stock card IN yet
no bin card IN yet
```

This is a critical check: generating the document must not silently post stock.

## Step 6 - Post accepted stock

**Login:** `storekeeper` or `storehead`

Click:

`Post Accepted Stock`

Expected status: `GRN Generated -> Posted`.

Expected stock effects:

```text
Test A4 Paper quantity increases by 10
one FIFO lot is created for quantity 10 at unit price 220
one Receipt stock transaction is created
one bin-card IN movement is created for TEST-BIN
one audit event is created
```

Verify:

```sql
SELECT qty_on_hand FROM items WHERE code = 'ITEM-TEST-001';
SELECT * FROM grns ORDER BY id DESC LIMIT 1;
SELECT * FROM grn_items ORDER BY id DESC LIMIT 1;
```

---

# 6. Store Requisition to Issue Voucher to Gate Pass

Use the stock created by the previous workflow.

## Example request

```text
Department: Mechanical Test Department
Store: Testing Main Store
Item: Test A4 Paper
Requested quantity: 8 reams
Approved quantity: 6 reams
```

## Step 1 - Create requisition Draft

**Login:** `depthead`

**Page:** Requisitions -> New Requisition

Enter the example values and click `Create` or `Save Draft` if shown.

Expected status: `Draft`.

Stock must not change.

## Step 2 - Submit requisition

**Login:** `depthead`

Open the Draft and click:

`Submit for Approval`

Expected status: `Draft -> Submitted`.

Expected effects:

```text
requisition status persisted
audit created
notification sent to the approval actor
stock unchanged
```

## Step 3 - Approve partially

**Login:** `depthead` or the configured requisition approver

Open the Submitted request.

Enter approved quantity `6` and click:

`Approve (Full/Partial)`

Expected status: `Submitted -> Partially Approved`.

Expected effects:

```text
requisition_items.qty_approved = 6
requisition_approvals row created
stock unchanged
```

## Step 4 - Create Preliminary SIV

**Login:** `storekeeper`

**Page:** Issue Vouchers

Select the approved requisition and click:

`Create Preliminary Voucher`

Expected status: `Preliminary`.

Expected stock effect: none.

## Step 5 - Approve SIV

**Login:** `storehead`

Click `Approve` on the Preliminary voucher.

Expected status: `Preliminary -> Approved`.

Stock must remain unchanged.

## Step 6 - Post issue

**Login:** `storekeeper` or authorized issuer

Click `Post`.

Expected status: `Approved -> Posted`.

Expected stock effects:

```text
Test A4 Paper quantity decreases by 6
FIFO quantity is consumed
Issue stock transaction is created
bin-card OUT movement is created
requisition becomes fulfilled/issued according to current implementation
audit event is created
```

## Step 7 - Gate-pass verification

**Login:** `security`

**Page:** Gate Pass

Find the issued voucher and click the verification CTA.

Verify:

```text
Document: SIV reference
Recipient: Mechanical Test Department
Item: Test A4 Paper
Quantity: 6
Authorization: approved SIV
```

Click `Verify Gate Pass`.

Expected effect:

```text
issue_vouchers.gate_verified = TRUE
gate_verified_by is saved
gate_verified_at is saved
audit event is created
```

Gate verification must not change stock a second time.

---

# 7. Material Return / SRN

Use the previously issued quantity. Do not return more than the quantity in the
posted SIV.

## Example reusable return

```text
Department: Mechanical Test Department
Item: Test A4 Paper
Quantity: 2 reams
Reason: Excess
Condition: Usable
Original SIV reference: the real posted SIV reference
```

## Steps

1. **Login `depthead` or authorized requester:** create the return request.
2. Confirm the record is `Draft` or `Submitted` according to the current form.
3. If it is Draft, click `Submit Return Note` or `Submit`.
4. **Login `storehead` or store reviewer:** open `Pending Review`.
5. Click the approval CTA and approve quantity `2`.

Expected reusable result:

```text
Material return status becomes Returned to Stock
items.qty_on_hand increases by 2
FIFO lot is added
Return stock transaction is added
bin-card IN movement is added
audit is added
```

## Unsafe condition test

Create a second return with:

```text
Condition: Damaged
Quantity: 1
```

Approve it.

Expected result:

```text
The return decision is saved
The damaged quantity does NOT enter available stock
No Return stock transaction is created for the damaged quantity
```

If the API rejects the return because the original issue reference does not
match a real posted SIV, that is correct validation. Use the actual SIV
reference returned by the issue workflow.

---

# 8. Store-to-Store Material Transfer

## Example transfer

```text
From store: Main Store
To store: Electrical Engineering Dept. Store
Item: A4 Photocopy Paper (White)
Quantity: 5 reams
Destination bin: E-05
Date: today
```

## Step 1 - Create transfer

**Login:** `storekeeper`

Click `New Transfer Request`, enter the values, and submit.

Expected status: `Pending Approval`.

No stock should move yet.

## Step 2 - Approve

**Login:** `pao`

Open the transfer and click:

`Approve Transfer`

To test the correction loop instead, click `Return for Correction`, then log
back in as the requester and resubmit.

Expected approval status: `Pending Approval -> Approved`.

## Step 3 - Dispatch

**Login:** source-store `storekeeper`

Click:

`Dispatch Materials`

Expected status: `Approved -> Dispatched`.

Expected effects:

```text
source item quantity decreases by 5
source FIFO is consumed
source Transfer-Out stock transaction created
source bin-card OUT movement created
```

## Step 4 - Receive at destination

**Login:** destination `storekeeper`

Click:

`Receive Materials`

Expected persisted final status: `Completed`.
The request sent to the API is the `Received` decision, but the backend stores
`Completed`.

Expected effects:

```text
destination item row is created or updated
destination quantity increases by 5
destination FIFO lot is created
destination Transfer-In transaction is created
destination bin-card IN movement is created
source and destination entries share the transfer reference
```

---

# 9. Bin-to-Bin Transfer

This is an immediate stock-location movement inside one store.

## Example

```text
Item: A4 Photocopy Paper (White)
Source bin: A-01
Destination bin: A-99
Quantity: 3
```

**Login:** `storekeeper` or `clerk`

**Page:** Bin Transfers

Click `Create Bin Transfer` and submit.

Expected result:

```text
source bin balance decreases by 3
destination bin balance increases by 3
item total qty_on_hand does not change
one bin_transfers row is created
two bin-card movements share one BTR reference
audit event is created
```

Negative tests:

```text
source bin = destination bin -> reject
quantity greater than source bin balance -> reject
unknown item -> reject
```

A rejected transfer must leave both bin balances unchanged.

---

# 10. Disposal

## Example disposal

```text
Store: Main Store
Item: A4 Photocopy Paper (White)
Quantity: 1
Reason: Damaged and beyond economical repair
```

## Step 1 - Flag

**Login:** `storekeeper` or authorized store staff

Click `Flag for Disposal` and submit.

Expected status: `Pending`, `Flagged`, or `Pending Review` according to the
current form/backend vocabulary.

Expected stock effect: none.

## Step 2 - Review and correction test

**Login:** `pao` or `storehead`

Open the record.

Available real actions should include:

```text
Approve
Reject
Return for Correction
```

Use Return for Correction once and verify the status is persisted. Then reopen
and correct the reason.

## Step 3 - Approve

Click `Approve`.

Expected status: `Approved`.

Stock must not change at approval.

## Step 4 - Execute

**Login:** authorized disposal executor

Click `Execute Disposal`.

Expected effects:

```text
status becomes Executed
item quantity decreases by 1
FIFO is consumed
Disposal stock transaction is created
bin-card OUT movement is created
audit event is created
```

Do not delete an Executed disposal record.

Current implementation note: execution evidence fields such as method,
witnesses, and document attachment are not yet present in the database. Record
this as a gap if the page offers no evidence form.

---

# 11. Stock Taking and Reconciliation

## Example count

```text
Store: Main Store
Item: A4 Photocopy Paper (White)
System quantity shown by the form: 100
Physical quantity counted: 98
Variance: -2
Reason: Two reams damaged during storage
Counter: Kaleb Mulugeta
```

## Step 1 - Create session

**Login:** `clerk`

**Page:** Stock Taking

Create the session and enter the physical count.

Expected status: `Draft`.

Important: physical count capture must not overwrite `items.qty_on_hand`.

## Step 2 - Submit count

Click `Submit`.

Expected status: `Draft -> Submitted`.

Expected notification: approval actor is notified.

## Step 3 - Approve adjustment

**Login:** `pao` or `storehead`

Open the Submitted session and click `Approve`.

Expected status: `Submitted -> Approved`.

Stock must still be unchanged until posting.

## Step 4 - Post adjustment

**Login:** authorized posting actor

Click `Post Stock Adjustments`.

Expected status: `Approved -> Closed` in the current implementation.

Expected effects:

```text
items.qty_on_hand becomes the physical counted quantity
Adjustment stock transaction is created
FIFO is added or consumed as required
bin-card adjustment movement is created
audit event is created
```

Verify that the final quantity equals the physical count, even if another
transaction occurred between counting and posting.

## Reconciliation page

The current reconciliation page is report-only. It can display variances and
export CSV, but it does not currently provide real Review, Investigate, Recount,
Approve, Reject, or Post endpoints. Do not invent buttons for these actions.
Record this as an implementation gap until backend endpoints exist.

---

# 12. Fixed Assets

## Create asset

**Login:** `pao` or `storehead`

**Page:** Fixed Assets

Enter:

```text
Asset tag: FA-TEST-001
Name: Test Digital Multimeter
Category: Laboratory Equipment
Store: Electrical Engineering Dept. Store
Assigned to: Testing Laboratory
Status: In Store
Acquisition date: today
Value: 1850
```

Expected:

```text
fixed_assets row is created
asset status is persisted
no inventory quantity change
```

Verify:

```sql
SELECT * FROM fixed_assets WHERE asset_tag = 'FA-TEST-001';
```

Test Edit. Do not delete an asset after it has operational history. The current
asset page does not yet implement the complete GRN registration, serial number,
custody transfer, and user-card linkage described in the master prompt; record
those missing actions as gaps rather than treating CRUD Edit as a full custody
workflow.

---

# 13. User Material Cards

## Responsibility and current working flow

The **Storekeeper** records custody after the related SIV has been approved and
posted. The **Store Head** supervises or corrects the record. The **Department
Head** confirms the recipient through the requisition process; they do not issue
stock from this page. The Administrator has technical override access but is not
the normal transaction actor.

1. Complete the requisition and SIV workflow above.
2. Confirm the SIV is `Posted` and stock has already been deducted.
3. Login as `storekeeper` (or `storehead` when supervising) and open User Cards.
4. Create the record with the recipient, item, quantity, issue date, and the
   real posted SIV reference. Use status `In Use`.
5. Refresh and verify the persisted row. Creating a card must not deduct stock
   again.

## Create card

**Login:** `storekeeper` or `storehead`

**Page:** User Cards

Enter:

```text
User name: Hana Girma
Department: Mechanical Test Department
Item: Digital Multimeter
Issue reference: the real posted SIV reference
Issue date: today
Quantity: 1
Status: In Use
Notes: Manual custody test
```

Expected:

```text
user_cards row is created
no second stock deduction occurs
issue_ref links the card to the real SIV reference
```

Use Edit only to maintain the custody record. For a return, use **Material
Return** with the original posted SIV. After the return is approved and reusable
stock is posted back, edit the card to `Returned` and enter the return date.
Editing the card alone does not return material, restore stock, or create an SRN.

Current limitation: this page is a manual custody register. It does not validate
that `issueRef` belongs to an existing SIV, create cards automatically from
posted SIVs, or provide separate Assign, Transfer Custody, History, Print, or
`In Custody` actions. Verify the SIV/SRN separately and do not treat this page as
an issue or return transaction.

---

# 14. Reports

**Login:** `accountant` for financial reports; use the role permitted by the
specific report for operational reports.

Test these reports after completing the workflows:

```text
Current Stock Balance
Stock Movement
Goods Receipt Status
Store Requisition
SIV / ISIV
Material Return / SRN
Inter-Store Transfer
Fixed Asset Register
Disposal
FIFO Valuation
```

For every report:

1. Select the report from the Report Type menu.
2. Apply store, status, item, search, and date filters where available.
3. Confirm the rows reflect posted backend data.
4. Click Export CSV.
5. Compare the report quantity with the SQL query for `items` or
   `stock_transactions`.

The following areas are currently incomplete or may still rely on local
aggregation until matching backend endpoints are added:

```text
Per-item stock-card report
Bin-card report details
Shelf-life report
User-card report
Stock-taking report
Some valuation and consumption reports
```

A report must never show a successful total that contradicts the database.

---

# 15. Notifications and Audit

After each major action, open Notifications and Audit Log using the relevant
role.

Confirm:

```text
The notification belongs to the next responsible actor.
The notification route opens the correct module.
The entity reference identifies the exact document.
The audit row contains actor, role, action, module, and outcome.
The stock transaction contains the source reference.
```

Expected critical events include:

| Event | Expected recipient |
|---|---|
| Receipt submitted | Store Head / TEC workflow actor |
| Receipt evaluated | PAO / Store Head workflow actor |
| Requisition submitted | Department Head / approver |
| Requisition approved | Storekeeper |
| Transfer approved | Source and destination store actors |
| Disposal approved | Disposal executor |
| Stock-taking variance | Store Head / approval actor |

If the toast says success but the database query shows no change, classify the
CTA as broken.

---

# 16. Negative and Security Tests

Run these tests with the wrong role and confirm the API returns `403`:

| Attempt | Wrong actor |
|---|---|
| TEC posts GRN stock | `tec` |
| Storekeeper approves a requisition | `storekeeper` |
| Storekeeper approves a transfer | `storekeeper` |
| Department Head posts stock | `depthead` |
| Security posts an SIV | `security` |
| Clerk posts stock-taking if not authorized by policy | `clerk` |
| User edits a posted stock transaction | any ordinary user |

Run these validation tests:

```text
Approve a nonexistent document.
Post a document twice.
Generate a second GRN for the same receipt.
Issue more than available stock.
Return more than previously issued quantity.
Transfer from a bin with insufficient balance.
Use the same source and destination bin.
Delete a posted/executed operational record.
```

Expected result for each invalid test:

```text
meaningful error response
no partial stock update
no orphan FIFO lot
no orphan stock-card movement
no orphan bin-card movement
```

---

# 17. Completion Checklist

A workflow is complete only when all answers are true:

- [ ] The correct actor can log in and see the page.
- [ ] The form accepts the test input.
- [ ] The record starts in the expected status.
- [ ] The next responsible actor is clear.
- [ ] The CTA is visible to the correct actor only.
- [ ] The CTA calls a real backend endpoint.
- [ ] The backend validates the operation.
- [ ] The status changes in PostgreSQL.
- [ ] Stock changes only at the approved posting/execution step.
- [ ] FIFO is updated when stock changes.
- [ ] Stock card is updated when stock changes.
- [ ] Bin card is updated when stock changes.
- [ ] Audit is created.
- [ ] Notification is created where required.
- [ ] Refreshing the browser shows the persisted result.
- [ ] Repeating the CTA does not duplicate the stock movement.
- [ ] A wrong actor receives `403`.
- [ ] A failed operation leaves stock and ledgers unchanged.

The final evidence for each transaction is:

```text
Frontend form input
-> CTA
-> API request
-> backend validation
-> PostgreSQL status
-> PostgreSQL stock/ledger changes
-> audit
-> notification
-> refreshed frontend result
```
