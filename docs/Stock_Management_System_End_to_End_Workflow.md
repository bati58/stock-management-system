# Stock Management System — End-to-End Operational Workflow

## 1. Purpose

This document explains how the Stock Management System operates from end to end: how materials are requested, received, evaluated, accepted, stored, issued, transferred, returned, counted, reconciled, assigned as assets, monitored, disposed of, and reported.

The central traceability chain is:

**Source document → approval/evaluation → stock transaction → location/bin balance → stock/bin card → audit trail → reports**

Operational stock quantities must change through authorized transactions, not direct balance editing.

---

## 2. Operational Actors

| Actor | Main responsibility |
|---|---|
| Administrator | Users, roles, permissions, configuration and system oversight |
| Property Administration Officer (PAO) | Property/stock oversight, approvals, monitoring and reports |
| Store Head | Store supervision and operational approvals |
| Storekeeper | Receiving, storage, issuing, transfers and returns |
| Stock Clerk | Stock records, locations, bin/stock-card support and documentation |
| Technical Evaluation Committee (TEC) | Technical inspection and evaluation |
| Department Head | Department requisitions and approvals |
| Accountant | Inventory valuation, financial reports and reconciliation |
| Security Officer | Gate/pass verification of authorized material movement |

Backend authorization must enforce these responsibilities; hiding a menu item in the frontend is not sufficient.

---

# 3. Core Stock Principle

Every stock-changing transaction should have:

1. Source document.
2. Authorized actor.
3. Valid workflow status.
4. Item and quantity.
5. Store/location/bin.
6. Transaction reference.
7. Stock transaction.
8. Updated stock/bin card.
9. Audit record.
10. Traceability to the originating document.

Example:

```text
Goods Receipt
   ↓
Technical Evaluation
   ↓
Acceptance
   ↓
GRN
   ↓
Stock Transaction (+accepted quantity)
   ↓
FIFO Lot
   ↓
Store / Bin Balance
   ↓
Stock Card / Bin Card
   ↓
Audit Log
```

---

# 4. Master Data Setup

Before transactions begin, authorized users maintain:

### Stores
Examples:
- Main Store
- Department Store
- Cafe Store

### Categories
Examples:
- Stationery
- Cleaning Materials
- ICT Equipment
- Laboratory Equipment
- Furniture
- Electrical Materials

### Locations

A physical location should be structured:

```text
Store
 → Section
   → Rack
     → Shelf
       → Bin
```

Example:

```text
Main Store / Stationery / Rack R01 / Shelf S01 / Bin B001
```

### Items

Typical fields:

- Item code
- Item name
- Description/specification
- Category
- Unit of measure
- Store
- Safety stock
- Batch/lot where applicable
- Expiry where applicable
- Condition
- Storage requirement

Creating an item does **not** increase stock.

### Suppliers

Supplier master records should contain name, contact information, address/reference information and active status.

Creating a supplier does **not** increase inventory.

---

# 5. Example Used Throughout

Use this example to understand the complete lifecycle.

**Item:** A4 Copy Paper  
**Code:** PAP-A4-001  
**Unit:** Ream  
**Category:** Stationery

Supplier delivers:

**100 reams × ETB 500 = ETB 50,000**

Target location:

```text
Main Store
 → Stationery
   → Rack R01
     → Shelf S01
       → Bin B001
```

Later:
- 95 are accepted after evaluation.
- 20 are issued to a department.
- 5 are returned.
- 4 returned units are reusable and 1 is damaged.
- Some stock is transferred.
- Physical stock is counted and reconciled.
- Damaged/obsolete stock may enter disposal.

---

# 6. Goods Receiving Workflow

## Step 1 — Supplier Delivery

The supplier delivers materials with the relevant purchase/donation/delivery documents.

The Storekeeper physically receives the delivery.

## Step 2 — Create Receipt

The Storekeeper creates a goods receipt containing:

- Supplier
- Purchase/delivery reference
- Store
- Item
- Quantity
- Unit
- Date
- Documents
- Condition/remarks

Initial workflow:

```text
Draft
→ Submitted / Pending Evaluation
```

### Critical rule

**Creating a receipt must NOT increase available stock.**

If 100 units are received physically, available inventory can still be 0 until acceptance/posting.

## Step 3 — Document Verification

The Store Head/authorized actor verifies:

- Supplier documentation
- Purchase/donation reference
- Quantity
- Item identity
- Delivery information
- Discrepancies

---

# 7. Technical Evaluation

For materials requiring inspection, the Store Head notifies the TEC.

TEC evaluates:

- Specification compliance
- Quantity
- Quality
- Condition
- Technical suitability
- Findings
- Remarks
- Evidence
- Accepted quantity
- Rejected quantity

Recommended evaluation states:

```text
Pending
Under Review
Approved
Rejected
Partially Approved
On Hold
```

### Example

Delivered:

```text
100 reams
```

TEC finds:

```text
95 acceptable
5 damaged/rejected
```

Therefore:

```text
Accepted = 95
Rejected = 5
```

The rejected 5 must not enter available stock.

---

# 8. GRN Workflow

A Goods Receiving Note should be generated only from an accepted receipt/evaluation.

GRN should link to:

- Receipt
- Supplier
- Evaluation
- Accepted line items
- Stock transactions
- FIFO lots
- Location/bin
- Audit record

For the example:

```text
Receipt = 100
Accepted = 95
Rejected = 5
GRN = 95
```

---

# 9. Posting Accepted Stock

After the accepted receipt is finalized:

```text
Stock +95
```

Cost:

```text
95 × ETB 500 = ETB 47,500
```

FIFO layer:

```text
Lot #1
Quantity: 95
Unit Cost: ETB 500
Remaining: 95
```

The same atomic operation should update:

- Inventory balance
- FIFO layer
- Stock transaction
- Bin transaction
- Stock card
- Bin card
- Audit trail
- Workflow notifications

---

# 10. Stock Card and Bin Card

After receiving:

| Date | Reference | Receipt | Issue | Balance |
|---|---|---:|---:|---:|
| Day 1 | GRN-0001 | 95 | 0 | 95 |

The bin card should maintain movement history rather than act as a manually editable balance.

---

# 11. Department Requisition

A department needs 20 reams.

Requester creates:

```text
RQ-0001
Item: A4 Copy Paper
Quantity: 20
Department: Finance
Purpose: Office use
```

Lifecycle:

```text
Draft
→ Submitted
→ Pending Approval
→ Approved
→ Ready for Issue
→ Partially Issued / Fulfilled
```

Possible negative states:

```text
Rejected
Cancelled
```

### Critical rule

**A requisition does not reduce stock.**

Stock remains:

```text
95
```

---

# 12. Requisition Approval

The Department Head reviews:

- Requester/department ownership
- Quantity
- Purpose
- Authorization
- Other applicable business rules

Decision:

```text
Approved
```

or:

```text
Rejected
```

Record:

- Approver
- Date/time
- Decision
- Comment
- Previous status
- New status

---

# 13. Preliminary SIV / ISIV

For an approved requisition, the Storekeeper prepares a preliminary Store Issue Voucher / Internal Store Issue Voucher.

Example:

```text
SIV-0001
Requisition: RQ-0001
Quantity: 20
```

At this stage:

**Stock remains 95.**

Preparing the document must not automatically post inventory.

---

# 14. Final SIV Approval and Issue

Before posting, the system validates:

- Requisition is approved
- Correct department/recipient
- Correct store
- Authorized issuer
- Correct item
- Correct quantity
- Sufficient stock
- Required gate-pass/verification requirements

Only the final issue-posting action changes stock.

---

# 15. FIFO Issue Example

Before issue:

```text
95 × ETB 500
```

Issue:

```text
20
```

FIFO consumes the oldest lot:

```text
20 × ETB 500 = ETB 10,000 COGS
```

Remaining:

```text
75 × ETB 500
```

Stock transaction:

```text
-20
```

Bin transaction:

```text
-20
```

The SIV, stock transaction, FIFO consumption, bin update and audit record must remain linked.

---

# 16. Security / Gate Verification

When controlled material leaves the store, the Security Officer verifies the movement.

Security checks:

- Authorized SIV/transfer
- Approval/final status
- Recipient
- Item
- Quantity
- Gate-pass where required
- Date/time
- Relevant person/vehicle information

Security should not validate an unapproved or unposted movement.

---

# 17. Partial Issue

Requested:

```text
50
```

Available:

```text
30
```

If partial issue is allowed:

```text
Approved = 50
Issued = 30
Remaining = 20
```

Status:

```text
Partially Issued
```

The system must not falsely mark all 50 as issued.

---

# 18. Return Workflow

Suppose 5 of the 20 issued reams are returned.

The return must reference the original SIV:

```text
Return → SIV-0001
```

Validate:

```text
Previously issued = 20
Previously returned = 0
New return = 5
```

A return of 25 must be rejected.

---

# 19. Return Inspection

Returned material is inspected.

Possible conditions:

```text
Reusable
Damaged
Needs Repair
Obsolete
Quarantine
```

Example:

```text
Returned = 5
Reusable = 4
Damaged = 1
```

Only approved reusable quantity becomes available stock.

Therefore:

```text
Stock +4
```

The damaged 1 enters the appropriate damaged/repair/disposal process.

---

# 20. Store-to-Store Transfer

Example:

```text
Main Store → Department Store
Quantity = 20
```

Workflow:

```text
Draft
→ Submitted
→ Approved
→ Ready for Dispatch
→ Dispatched
→ Received
→ Completed
```

Pending transfers must not incorrectly alter stock.

A robust transaction model is:

### Dispatch

```text
Source Store -20
Transfer-in-transit +20
```

### Destination receipt

```text
Transfer-in-transit -20
Destination Store +20
```

Both records retain the same transfer reference.

The exact timing rule should follow the approved business policy.

---

# 21. Bin-to-Bin Transfer

Example:

```text
B001 → B010
Quantity = 10
```

Validate:

```text
B001 balance >= 10
B001 != B010
```

Atomic update:

```text
B001 -10
B010 +10
```

Both bin histories contain the transfer reference.

Direct manual editing of bin balances should be prohibited.

---

# 22. Stock Taking

Suppose the system says:

```text
79
```

Physical count finds:

```text
78
```

Variance:

```text
-1
```

Workflow:

```text
Stock-Taking Session
→ Physical Count
→ Variance
→ Investigation
→ Verification
→ Approval
→ Adjustment Transaction
→ Closure
```

Physical counting must never directly overwrite the inventory balance.

---

# 23. Reconciliation

Investigate:

```text
System = 79
Physical = 78
Variance = -1
```

Possible causes:

- Recording error
- Unrecorded issue
- Damage
- Location error
- Counting error

After authorization:

```text
Adjustment = -1
New Stock = 78
```

The adjustment creates a ledger and audit record.

---

# 24. Fixed Asset Workflow

For fixed assets such as laptops:

```text
Goods Receipt
→ Technical Evaluation
→ Acceptance
→ GRN
→ Asset Registration
→ Asset ID / Serial Number
→ Location
→ Assignment
→ Movement / Custody
```

Example:

```text
Laptop
Serial: SN-001
Asset ID: AST-0001
Condition: New
Location: ICT Store
```

When assigned:

```text
Asset
→ Department
→ Employee/User
→ Assignment Date
```

When moved:

```text
Office A → Office B
```

the system records an asset movement history.

The asset record is not deleted.

---

# 25. Damaged, Obsolete and Quarantine Stock

Stock may have controlled states:

```text
Available
Damaged
Quarantine
Obsolete
Surplus
Under Repair
Pending Disposal
```

Damaged or quarantined stock must not automatically appear in available quantity.

---

# 26. Shelf-Life and Expiry Monitoring

For batch/expiry-controlled items, monitor:

- Batch
- Expiry date
- Days remaining
- Near-expiry quantity
- Expired quantity
- Location

Example:

```text
Expiry = 20 days away
Configured threshold = 30 days
```

System raises an alert.

The item may be routed to inspection, quarantine, priority use or disposal according to business rules.

---

# 27. Disposal Workflow

Disposal must be a controlled lifecycle:

```text
Disposal Flag
→ Disposal Request
→ Review
→ Evaluation
→ Approval
→ Disposal Execution
→ Inventory Transaction
→ Completion
```

Example:

```text
10 obsolete chairs
```

Approval means:

```text
Approved for disposal
```

It does NOT immediately remove inventory.

Only execution posts:

```text
Stock -10
```

Historical disposal and asset records remain.

---

# 28. Notifications

Notifications should come from real backend workflow events.

Examples:

- Receipt awaiting TEC evaluation
- Receipt partially accepted
- GRN ready
- Requisition awaiting approval
- SIV awaiting approval
- Transfer awaiting dispatch
- Transfer awaiting receipt
- Return awaiting inspection
- Stock-taking awaiting verification
- Reconciliation awaiting approval
- Asset awaiting registration
- Disposal awaiting approval
- Low-stock warning
- Near-expiry warning

States:

```text
Unread
→ Read
→ Dismissed / Historical
```

Notifications should link to the source document.

---

# 29. Role-Based Dashboards

## Administrator

Should see system-wide:

- Stores
- Items
- Users
- Inventory value
- Pending approvals
- Low-stock alerts
- Recent transactions
- Audit/security alerts
- System activity

## PAO

Should see:

- Inventory overview
- Inventory value
- Pending receipts/evaluations
- Approvals
- Stock-taking
- Reconciliation
- Disposal
- Assets
- Reports

## Store Head

Should see:

- Store stock
- Pending receipts
- Evaluations
- Issues
- Transfers
- Returns
- Stock alerts
- Store activity

## Storekeeper

Should see:

- Current stock
- Receipts
- Issues
- Transfers
- Returns
- Low-stock alerts
- Operational queues

## Stock Clerk

Should see:

- Stock records
- Locations
- Stock cards
- Bin cards
- Stock-taking
- Operational documentation

## TEC

Should see:

- Receipts awaiting evaluation
- Returns awaiting inspection
- Evaluation history
- Findings
- Pending decisions

## Department Head

Should see:

- Department requisitions
- Approval queue
- Approved requests
- Partially fulfilled requests
- Department accountability

## Accountant

Should see:

- Inventory valuation
- FIFO valuation
- Stock movement value
- Reconciliation
- Financial/valuation reports

## Security Officer

Should see:

- Pending gate verification
- Approved issue documents
- Transfer verification
- Gate-pass records
- Material exit history

---

# 30. Sidebar Modules

Typical modules are:

```text
Dashboard

Master Data
 ├─ Stores
 ├─ Locations
 ├─ Categories
 ├─ Items
 ├─ Units
 ├─ Suppliers
 └─ Departments

Receiving
 ├─ Goods Receipts
 ├─ Technical Evaluation
 └─ GRNs

Inventory
 ├─ Stock Overview
 ├─ Stock Cards
 ├─ Bin Cards
 ├─ Stock Transactions
 └─ FIFO / Valuation

Requisitions
 ├─ Requisitions
 ├─ Approvals
 └─ SIV / ISIV

Issues
 ├─ Issue Vouchers
 └─ Issue History

Returns
 ├─ Returns
 ├─ Inspection
 └─ Return History

Transfers
 ├─ Store Transfers
 ├─ Bin Transfers
 ├─ Dispatch
 └─ Receiving

Stock Control
 ├─ Stock Taking
 ├─ Reconciliation
 ├─ Adjustments
 ├─ Low Stock
 └─ Expiry Monitoring

Assets
 ├─ Asset Register
 ├─ Assignments
 └─ Movements

Disposal
 ├─ Disposal Flags
 ├─ Requests
 ├─ Approvals
 └─ Execution

Security
 ├─ Gate Verification
 └─ Gate Passes

Reports
 ├─ Inventory
 ├─ Receiving
 ├─ GRN
 ├─ Issues
 ├─ Returns
 ├─ Transfers
 ├─ Stock Taking
 ├─ Reconciliation
 ├─ Assets
 ├─ Disposal
 ├─ Valuation
 └─ Audit

Administration
 ├─ Users
 ├─ Roles
 ├─ Permissions
 ├─ Notifications
 └─ Configuration
```

Every sidebar item must open its own correct route/page and perform its intended function.

---

# 31. CRUD Rules

## Create

Only authorized actors can create records.

## Read

Users see records within their permitted organizational scope.

## Update

Draft records may normally be edited.

Submitted, approved and posted records should be controlled.

Use amendment/correction workflows rather than silent modification.

## Delete

Posted operational history should not be freely deleted.

Use:

```text
Cancel
Reverse
Void
Correction
```

with audit history.

---

# 32. Document Status vs Stock Posting

These are different concepts.

Example:

```text
SIV = Approved
```

does not automatically mean:

```text
Stock -20
```

The stock-changing event is:

```text
Final Issue Posting
```

Likewise:

```text
Disposal = Approved
```

does not mean:

```text
Stock Removed
```

The stock-changing event is:

```text
Disposal Execution
```

---

# 33. Stock Ledger

Every stock-changing transaction should identify:

```text
Transaction ID
Date/time
Item
Store
Location/Bin
Quantity
Direction
Unit cost
Total cost
Source type
Source ID
Reference number
Actor
Reason
Previous balance
New balance
```

Typical source types:

```text
GRN
ISSUE
RETURN
TRANSFER_OUT
TRANSFER_IN
STOCK_ADJUSTMENT
DISPOSAL
```

---

# 34. FIFO Example With Multiple Receipts

Receipt 1:

```text
100 × ETB 500
```

Receipt 2:

```text
50 × ETB 600
```

Total:

```text
150
```

Issue:

```text
120
```

FIFO:

```text
100 × 500 = ETB 50,000
20 × 600 = ETB 12,000
```

COGS:

```text
ETB 62,000
```

Remaining:

```text
30 × ETB 600
```

Cost layers must remain traceable.

---

# 35. Atomic Transaction Requirement

A stock-changing operation should succeed completely or roll back completely.

For an issue:

```text
Validate stock
→ Create final issue posting
→ Deduct inventory
→ Consume FIFO lots
→ Update bin
→ Create stock transaction
→ Create audit record
→ Create notification
```

Never allow states such as:

```text
Stock deducted
but SIV not recorded
```

or:

```text
Bin reduced
but ledger unchanged
```

---

# 36. Frontend → Backend → PostgreSQL

Correct operational chain:

```text
User
 ↓
React page/component
 ↓
API client
 ↓
Express route
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Controller
 ↓
Service/business logic
 ↓
PostgreSQL transaction
 ↓
Database
 ↓
JSON response
 ↓
React state/query cache
 ↓
Updated UI
```

Every operational button must complete this chain.

---

# 37. CTA Requirements

Examples:

### Receive Goods
Opens receiving workflow and calls the receiving API.

### Evaluate
Opens TEC evaluation and saves evaluation to backend.

### Generate GRN
Creates a real GRN linked to the accepted receipt.

### Approve Requisition
Checks authorization and changes the backend workflow state.

### Post Issue
Performs the actual stock transaction.

### Transfer
Creates and progresses the transfer workflow.

### Return
Creates return and inspection workflow.

### Approve Disposal
Approves disposal without prematurely removing stock.

### Execute Disposal
Performs the final inventory removal.

Every CTA should have:

```text
Correct route
Correct UI
Correct API
Correct authorization
Correct validation
Correct database operation
Success feedback
Error feedback
Data refresh
Audit record
```

---

# 38. Reports and Traceability

Reports should use authoritative database transactions.

Inventory can conceptually be reconciled from:

```text
Receipts
+ Returns
+ Transfers In
- Issues
- Transfers Out
- Disposal
± Adjustments
```

Every transaction should be traceable to:

```text
Source document
→ Actor
→ Store
→ Location
→ Date/time
→ Quantity
→ Cost
→ Audit event
```

---

# 39. Complete A4 Paper Lifecycle

```text
Supplier delivers 100
        ↓
Storekeeper creates receipt
        ↓
Stock still 0
        ↓
TEC evaluates
        ↓
95 accepted / 5 rejected
        ↓
GRN for 95
        ↓
Stock +95
        ↓
Department requests 20
        ↓
Department Head approves
        ↓
Stock still 95
        ↓
Preliminary SIV
        ↓
Final approval
        ↓
Storekeeper issues 20
        ↓
Stock 75
        ↓
Security verifies movement
        ↓
Department receives
        ↓
Department returns 5
        ↓
Inspection
        ↓
4 reusable / 1 damaged
        ↓
Stock +4
        ↓
Stock 79
        ↓
Transfer 20
        ↓
Source / transit / destination transactions
        ↓
Stock taking
        ↓
System 59 / physical 58
        ↓
Reconciliation
        ↓
Approved adjustment -1
        ↓
Stock 58
        ↓
Damaged/obsolete items may enter disposal
        ↓
Disposal approval
        ↓
Disposal execution
        ↓
Final stock transaction
        ↓
Reports + audit trail
```

---

# 40. Final System Integrity Rules

The completed system should ensure:

1. Every sidebar module opens the correct page.
2. Every page loads real backend data.
3. Every CRUD action calls the correct API.
4. Every API requires appropriate authentication.
5. Sensitive APIs enforce backend authorization.
6. Frontend visibility and backend permissions agree.
7. Every stock movement is transactional.
8. Unauthorized actors cannot perform controlled actions.
9. Posted records cannot simply be deleted.
10. Stock cannot become negative.
11. Rejected receipts do not enter available stock.
12. Pending requisitions do not reduce stock.
13. Preliminary SIV creation does not reduce stock.
14. Final issue posting reduces stock.
15. Damaged returns do not automatically become available stock.
16. Pending transfers do not incorrectly alter balances.
17. Physical counts do not overwrite balances directly.
18. Reconciliation adjustments require authorization.
19. Disposal approval does not execute disposal.
20. Disposal execution creates the final stock transaction.
21. Fixed assets preserve assignment and movement history.
22. FIFO layers remain traceable.
23. Stock cards and bin cards reflect ledger transactions.
24. Every movement has a source/reference.
25. Audit logs identify who did what and when.
26. Notifications originate from real workflow events.
27. Dashboard totals match database values.
28. Reports use authoritative posted transactions.
29. Frontend, backend and PostgreSQL remain synchronized.
30. Failed transactions roll back completely.
31. Workflow transitions are validated server-side.
32. Each actor sees and performs only assigned responsibilities.

---

# 41. End-to-End Mental Model

```text
DEFINE
  ↓
STORE / LOCATE
  ↓
RECEIVE
  ↓
VERIFY
  ↓
EVALUATE
  ↓
ACCEPT
  ↓
GRN
  ↓
POST STOCK
  ↓
REQUEST
  ↓
APPROVE
  ↓
PREPARE SIV
  ↓
FINALIZE
  ↓
ISSUE
  ↓
GATE VERIFY
  ↓
ACCOUNTABILITY
  ↓
RETURN / TRANSFER / RELOCATE
  ↓
STOCK TAKE
  ↓
RECONCILE
  ↓
MONITOR
  ↓
DISPOSE WHEN AUTHORIZED
  ↓
REPORT + AUDIT
```

**Core principle: Documents control authorization; transactions control stock; PostgreSQL is the source of truth; audit history preserves accountability.**
