# UI Transaction Workflow Guide

Use this guide on a test database. Every seeded user password is `sms1234`.
Use a different login whenever the responsible actor changes.

## Test Scenario

| Field | Value |
|---|---|
| Store | Testing Main Store |
| Destination store | Electrical Engineering Dept. Store |
| Supplier | Test Engineering Supplies PLC |
| Department | Mechanical Test Department |
| Item | Test A4 Paper (`ITEM-TEST-001`) |
| Unit | ream |
| Test bin | `TEST-BIN` |
| Purchase reference | `PO-TEST-001` |
| Delivery reference | `DN-TEST-001` |

Create the store, supplier, department, location hierarchy, and item first if they do not exist. Set the item opening quantity to `0`.

## Rules To Confirm

- Draft, submitted, evaluated, approved, and generated documents do not change stock unless the workflow says **post**, **execute**, **receive**, or **return to stock**.
- Never edit `qty_on_hand`, stock transactions, FIFO lots, or bin-card balances directly.
- After every action, refresh the page and confirm the persisted status.
- Save each generated reference: GRN, SR, SIV, SRN, and TRF.

## 1. Goods Receipt

### Step 1: Create the receipt

**Login:** `storekeeper`  
**Page:** Goods Receipt

Enter:

```text
Supplier: Test Engineering Supplies PLC
PO reference: PO-TEST-001
Received date: today
Store: Testing Main Store
Received by: storekeeper
Item: Test A4 Paper
Quantity: 12
Unit price: 220
Condition: Good
Bin: TEST-BIN
```

Click **Create Goods Receipt**.

Expected: a generated `GRN-...` reference with status `Draft`.

Stock remains `0`.

### Step 2: Submit for evaluation

**Login:** `storekeeper`

Open the receipt and click **Submit for Evaluation**.

Expected: `Draft -> Submitted`. TEC is next. Stock remains `0`.

### Step 3: Send to evaluation

**Login:** `storehead`

Open the submitted receipt and move it to **Pending Evaluation** or **Under Evaluation**, using the displayed action.

Expected: the status is persisted and TEC receives the notification. Stock remains `0`.

### Step 4: Evaluate the delivery

**Login:** `tec`  
**Page:** Goods Receipt Evaluation

Enter:

```text
Decision: Partially Approved
Findings: Ten reams are acceptable; two reams have water damage.
Accepted quantity: 10
Rejected quantity: 2
Condition: Good for accepted quantity
Evidence: DN-TEST-001; TEST-EVID-001
Evaluation note: Accept 10 reams and reject 2 damaged reams.
```

Click **Evaluate**.

Expected: `Under Evaluation -> Partially Accepted`. Stock remains `0`.

### Step 5: Generate the GRN

**Login:** `storehead` or another role allowed by the page

Click **Generate GRN / Model 19**.

Expected: status `GRN Generated`, a row in `grns`, and a GRN line for `10` reams. Stock remains `0`.

### Step 6: Post accepted stock

**Login:** `storekeeper` or `storehead`

Click **Post Accepted Stock**.

Expected:

```text
Status: Posted
ITEM-TEST-001 qty_on_hand: 0 -> 10
New FIFO lot: 10 at unit price 220
New stock transaction: Receipt, qty_in 10
New bin movement: TEST-BIN, qty_in 10
```

This is the first stock-changing action.

## 2. Requisition and Issue Voucher

### Step 1: Create requisition

**Login:** `depthead`  
**Page:** Requisitions

Enter:

```text
Department: Mechanical Test Department
Store: Testing Main Store
Requested by: depthead
Item: Test A4 Paper
Quantity: 8
Required date: today
Purpose: Mechanical test office use
```

Click **Create**. Save the generated `SR-...` reference.

Expected: status `Draft`; stock remains `10`.

### Step 2: Submit requisition

**Login:** `depthead`

Click **Submit for Approval**.

Expected: status `Submitted`; the approval actor is notified; stock remains `10`.

### Step 3: Approve the requested quantity

**Login:** the role shown by the approval queue, normally `depthead`, `pao`, or `storehead`

Choose **Approved** and set approved quantity to `6` if testing partial approval. Add a comment such as `Approved for current operational need`.

Expected: status `Approved` or `Partially Approved`; `qty_approved = 6`; stock remains `10`.

### Step 4: Create the preliminary SIV

**Login:** `storekeeper`  
**Page:** Issue Vouchers

Select the approved SR and click **Create Preliminary Voucher**.

Expected: generated `SIV-...` with status `Preliminary`; stock remains `10`.

### Step 5: Approve the SIV

**Login:** `storehead`

Click **Approve**.

Expected: status `Approved`; stock remains `10`.

### Step 6: Post the issue

**Login:** `storekeeper` or another authorized posting actor

Click **Post**.

Expected:

```text
SIV status: Posted
ITEM-TEST-001 qty_on_hand: 10 -> 4
FIFO consumed: 6
Issue transaction: qty_out 6
Bin movement: TEST-BIN, qty_out 6
```

### Step 7: Verify the gate pass

**Login:** `security`  
**Page:** Gate Pass

Find the real posted SIV and click **Verify Gate Pass**.

Expected: gate fields are saved. Stock stays `4`; gate verification must not deduct stock again.

## 3. Material Return

### Step 1: Create and submit the return

**Login:** `depthead`  
**Page:** Material Return

Enter:

```text
Department: Mechanical Test Department
Item: Test A4 Paper
Quantity: 2
Reason: Excess
Condition: Usable
Original issue reference: the posted SIV-... reference
```

Create the record, save the `SRN-...` reference, then click **Submit**.

Expected: status `Submitted`; stock remains `4`.

### Step 2: Approve the reusable return

**Login:** `pao` or `storehead`

Set decision to **Approved**, approved quantity `2`, and enter inspection findings.

Expected:

```text
SRN status: Returned to Stock
ITEM-TEST-001 qty_on_hand: 4 -> 6
FIFO lot added: 2
Return transaction: qty_in 2
Bin movement: TEST-BIN, qty_in 2
```

A damaged return should be tested separately with `Condition: Damaged`. It must not enter available stock.

## 4. Store-to-Store Material Transfer

### Step 1: Create the transfer

**Login:** `storekeeper`  
**Page:** Material Transfer

Enter:

```text
From store: Testing Main Store
To store: Electrical Engineering Dept. Store
Item: Test A4 Paper
Quantity: 3
Destination bin: E-05
Date: today
```

Click **Create Transfer Request**. Save `TRF-...`.

Expected: status `Pending Approval`; source stock remains `6`.

### Step 2: Approve the transfer

**Login:** `pao` or `storehead`

Click **Approve Transfer**.

Expected: status `Approved`; stock remains `6`.

### Step 3: Dispatch from the source store

**Login:** source-store `storekeeper`

Click **Dispatch Materials**.

Expected: status `Dispatched`; source stock becomes `3`; a `Transfer-Out` transaction and source bin OUT movement are created.

### Step 4: Receive at the destination store

**Login:** destination-store `storekeeper`

Click **Receive Materials**.

Expected: status `Completed`; destination item is created or increased by `3`; a `Transfer-In` transaction and destination bin IN movement are created.

## 5. Final Expected Quantity

For the source item in Testing Main Store:

```text
0 + 10 received - 6 issued + 2 returned - 3 transferred = 3 reams
```

Confirm this after refreshing the Items page and by SQL.

## 6. Ownership Summary

| Workflow step | Responsible actor | Next actor | Stock effect |
|---|---|---|---|
| Create receipt | Storekeeper | Store Head / TEC | None |
| Submit receipt | Storekeeper | TEC | None |
| Evaluate receipt | TEC | Store Head / GRN actor | None |
| Generate GRN | Store Head / authorized actor | Storekeeper | None |
| Post GRN | Storekeeper / Store Head | Requester | `+accepted quantity` |
| Create and submit SR | Department Head | Approver | None |
| Approve SR | Configured approver | Storekeeper | None |
| Create SIV | Storekeeper | Store Head | None |
| Approve SIV | Store Head | Storekeeper | None |
| Post SIV | Authorized issuer | Security / recipient | `-issued quantity` |
| Verify gate pass | Security Officer | Completed | None |
| Create and submit SRN | Department Head | Store reviewer | None |
| Approve SRN | PAO / Store Head | Completed | `+approved usable quantity` |
| Create transfer | Storekeeper | PAO / Store Head | None |
| Approve transfer | PAO / Store Head | Source storekeeper | None |
| Dispatch transfer | Source storekeeper | Destination storekeeper | Source `-quantity` |
| Receive transfer | Destination storekeeper | Completed | Destination `+quantity` |
