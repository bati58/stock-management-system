# Stock Management System — Integrated End-to-End Implementation Description

## 1. Purpose

This document is the consolidated implementation reference for a realistic Stock Management System. It merges the original SRS, the operational Stock Management Manual, and the mentor's amended use cases.

The system is not a collection of independent CRUD pages. It is a connected transaction system:

```text
Master Data
  -> Receiving
  -> Inspection / Technical Evaluation
  -> Acceptance
  -> GRN
  -> Stock Posting
  -> Stock Card + Bin Card
  -> Requisition
  -> Approval
  -> SIV / ISIV
  -> Final Issue
  -> Stock Reduction
  -> Return / Transfer / Adjustment / Disposal
  -> Audit + Reports + Notifications
```

Institution-specific rules that are not explicitly defined must be configurable and marked **BUSINESS DECISION REQUIRED**, not invented.

---

## 2. Technology Architecture

Target architecture:

```text
React Frontend
      |
      | REST / JSON
      v
Node.js + Express Backend
      |
      | Business services + transactions
      v
PostgreSQL
```

Every operational action must follow:

```text
Frontend
 -> API
 -> Authentication
 -> Authorization
 -> Validation
 -> Controller
 -> Business Service
 -> PostgreSQL transaction
 -> Audit / Notification
 -> API response
 -> Frontend refresh
```

Do not implement important business operations as frontend-only state changes.

---

# 3. Core Actors

Use these nine operational roles:

1. Administrator
2. Property Administration Officer (PAO)
3. Store Head
4. Storekeeper
5. Stock Clerk
6. Technical Evaluation Committee (TEC)
7. Department Head
8. Accountant
9. Security Officer

Supplier is primarily an external party unless supplier login is explicitly required.

## Administrator

System administration:
- users;
- roles;
- permissions;
- configuration;
- stores;
- categories;
- units;
- locations;
- system-wide monitoring;
- audit.

Administrator may have emergency technical override authority, but should not normally perform receiving, TEC evaluation, routine issue, approval, physical movement, or disposal execution. Actual operational actors must remain recorded.

## PAO

Broad property/inventory supervisory role:
- review receipts and GRNs;
- inventory oversight;
- approval workflows assigned by policy;
- fixed asset registration and assignment;
- valuation/property reports;
- disposal/property monitoring;
- reconciliation and compliance monitoring.

PAO should have a broad dashboard but should not act as TEC or Security.

## Store Head

Supervises store operations:
- review receiving;
- coordinate TEC evaluation;
- supervise stock;
- review/approve operational workflows according to configured policy;
- SIV/ISIV approval/amendment where assigned;
- returns;
- transfers;
- stock taking;
- disposal;
- reports.

## Storekeeper

Physical store operations:
- receive goods;
- verify quantities/condition;
- record receiving documents;
- assign locations/bins;
- prepare approved issues;
- create preliminary SIV/ISIV;
- issue materials;
- receive returns;
- dispatch approved transfers;
- participate in stock taking.

Must not approve their own transaction where segregation is required or directly edit posted balances.

## Stock Clerk

Record-keeping/support:
- search inventory;
- view stock cards;
- view bin cards;
- assist receiving;
- assist stock taking;
- maintain permitted clerical records;
- reports.

Must not directly edit system-generated stock/bin balances.

## TEC

Technical evaluation:
- inspect materials;
- record findings;
- accept;
- partially accept if policy permits;
- reject;
- hold;
- record evidence and evaluation history.

## Department Head

Department-side control:
- create/review requisitions;
- approve department requests where applicable;
- confirm receipt;
- monitor issued materials;
- initiate/monitor returns;
- view only authorized department records.

## Accountant

Financial/property reporting:
- inventory valuation;
- asset valuation;
- acquisition values;
- disposal values;
- financial reports.

## Security Officer

Physical exit control:
- verify SIV/ISIV;
- verify gate pass;
- record gate movements;
- verify asset movements where required;
- maintain security history.

Security must not edit inventory balances.

---

# 4. Dashboard Expectations

Dashboards must use real backend data and be role-specific.

### Administrator
Users, roles, configuration, stores, system health, system-wide summary, audit alerts.

### PAO
Inventory quantity/value, stores, pending receipts/evaluations/GRNs, requisitions, SIV approvals, returns, transfers, stock taking, reconciliation, assets, disposal, low stock, expiry, activity.

### Store Head
Store stock, receipts, evaluations, requisitions, SIVs, returns, transfers, disposal, stock taking, reconciliation, alerts.

### Storekeeper
Today's receipts, receiving tasks, available stock, low stock, approved requisitions ready for issue, pending issues/returns/transfers, bins and locations.

### Stock Clerk
Stock quantities, movements, stock cards, bin balances, receipts, issues, low stock, clerical tasks and discrepancies.

### TEC
Pending evaluations, under evaluation, completed evaluations, accepted/rejected, history.

### Department Head
Department requisitions, approvals, approved requests, issued materials, returns, transfers.

### Accountant
Inventory value, asset value, acquisition/disposal value, valuation reports.

### Security
Pending gate verification, SIV/ISIV, gate movements, asset movements, verification history.

---

# 5. Sidebar / Module Structure

Only expose modules that actually work.

### Administration
- Dashboard
- Users
- Roles & Permissions
- Departments
- Stores
- Categories
- Units
- Suppliers
- Locations
- System Settings
- Notifications
- Audit Logs

### Receiving
- Goods Receipts
- Technical Evaluations
- GRNs
- Receipt History

### Inventory
- Inventory
- Stock Cards
- Bin Cards
- Stock Movements
- Inventory Monitoring

### Requisitions & Issues
- Requisitions
- Approval Queue where required
- SIV / ISIV
- Issues
- Gate Verification

### Returns
- Returns / SRN
- Return Inspection
- Return History

### Transfers
- Store Transfers
- Transfer Approvals
- Dispatch
- Destination Receipt
- Bin Transfers

### Stock Control
- Stock Taking
- Reconciliation
- Adjustments
- Low Stock
- Shelf-Life Monitoring
- Damaged/Obsolete Stock

### Assets
- Fixed Assets
- Asset Registration
- Asset Assignments
- Asset Movements
- User Cards / Custody

### Disposal
- Disposal Flags
- Disposal Requests
- Disposal Approval
- Disposal Execution
- Disposal History

### Reports
Inventory, movement, receiving, GRN, requisition, issue, return, transfer, stock taking, reconciliation, assets, disposal, valuation and audit.

Every sidebar item must open its correct page. No dead link, wrong dashboard, placeholder route or wrong-role page.

---

# 6. Master Data

Required entities include:

- Users
- Roles
- Permissions
- Departments
- Stores
- Store types
- Categories
- Units
- Suppliers
- Items
- Item specifications
- Locations
- Sections
- Racks
- Shelves
- Bins

Location hierarchy:

```text
Store
 -> Section
 -> Rack
 -> Shelf
 -> Bin
```

Example:

```text
Main Store
 -> Electrical Section
 -> Rack E-03
 -> Shelf 02
 -> Bin E03-02-04
```

Master-data CRUD should support create, read, update, deactivate/archive, search, filtering, sorting, pagination, detail view, validation, duplicate prevention, error handling, success feedback and permission checks.

Do not hard-delete records referenced by historical transactions.

---

# 7. Goods Receiving / Model 19

The manual requires physical verification against delivery/packing documents and purchase/order information. Technical materials may require specialist evaluation.

Workflow:

```text
Supplier delivers
 -> Storekeeper receives physically
 -> Unpack / count
 -> Check delivery documents
 -> Check purchase/order reference
 -> Check item/specification
 -> Check quantity and condition
 -> Create receipt
 -> Store Head review
 -> Notify TEC if technical evaluation required
 -> TEC evaluation
 -> Accepted / Partially Accepted / Rejected / On Hold
 -> GRN
 -> Post accepted quantity
 -> Inventory + FIFO
 -> Stock Card
 -> Bin Card
 -> Audit
 -> Notifications
```

Creating a receipt must NOT make rejected/unaccepted materials available stock.

Example:

```text
Delivered: 10 laptops
Accepted: 8
Rejected/held: 2

Opening stock: 20
New available stock: 20 + 8 = 28
```

The GRN must reference the receipt and accepted quantities.

The manual identifies Model 19 as the formal receipt evidence for accepted materials.

---

# 8. Stock Card

Stock Card / Stock Record Card is system-generated.

It must capture:
- item;
- store/location;
- date;
- document reference;
- receipt;
- issue;
- return;
- transfer;
- adjustment;
- balance;
- value where applicable.

Example:

```text
Opening = 20
GRN +8 = 28
Issue -6 = 22
Return +1 = 23
Transfer -2 = 21
```

Users must not manually overwrite the calculated balance.

---

# 9. Bin Card

Bin Card is the quantity ledger for a physical storage location.

It should capture:
- item;
- bin/location;
- date;
- reference;
- quantity in;
- quantity out;
- balance.

Example:

```text
Bin A
Opening 0
GRN +8
Issue -6
Return +1
Transfer -2
Balance 1
```

Bin balances originate from posted transactions, not direct manual editing.

---

# 10. Store Requisition / Model 20

Workflow:

```text
Department need
 -> Create Draft
 -> Submit
 -> Pending Approval
 -> Approve / Reject / Partial Approval
 -> Ready for Issue
 -> Partially Issued
 -> Fulfilled
 -> Cancelled
```

Capture:
- requester;
- department;
- item;
- quantity;
- purpose;
- approval;
- comments;
- rejection reason;
- history.

Rejected/pending requisitions cannot be issued.

Department ownership must be enforced server-side.

---

# 11. SIV / ISIV / Model 22

Workflow:

```text
Approved Requisition
 -> Storekeeper review
 -> Check stock
 -> Prepare preliminary SIV/ISIV
 -> Amend/correct if allowed
 -> Approve
 -> Final SIV/ISIV
 -> Confirm actual issue quantity
 -> Final stock posting
 -> FIFO consumption
 -> Stock reduction
 -> Stock Card OUT
 -> Bin Card OUT
 -> Gate Pass where required
 -> Security verification
 -> Recipient confirmation
 -> Audit
```

Preliminary preparation must NOT reduce stock.

Only authorized final posting changes inventory.

Example:

```text
Available stock = 28
Approved SIV = 6

Before final posting: 28
After final posting: 22
```

---

# 12. FIFO

Example:

```text
Lot A: 10 laptops × ETB 35,000
Lot B: 5 laptops × ETB 38,000
```

Issue 7:

```text
7 × 35,000 = ETB 245,000
```

Remaining:

```text
3 × 35,000
5 × 38,000
```

The database must preserve cost layers and issue allocations.

---

# 13. Gate Pass

For outbound movements requiring physical gate control:

```text
Final SIV/ISIV
 -> Gate Pass
 -> Security verification
 -> Verify person/material/document
 -> Record gate movement
```

Security verifies the authorized document; it does not manipulate stock.

---

# 14. Returns / SRN

Workflow:

```text
Issued material
 -> SRN
 -> Store receives
 -> Inspection
 -> Technical evaluation if required
 -> Classification
 -> Approve / Reject
 -> Reusable quantity returns to stock
 -> Stock transaction
 -> Stock Card IN
 -> Bin Card IN
 -> Audit
```

Classifications:
- reusable;
- damaged;
- repair;
- obsolete;
- quarantine;
- disposal candidate.

Returned quantity cannot exceed the original issued quantity.

Damaged material must not automatically become available stock.

---

# 15. Store-to-Store Transfer

Workflow:

```text
Transfer Request
 -> Approval
 -> Dispatch
 -> In Transit
 -> Destination Receipt
 -> Completed
```

Track:
- source;
- destination;
- item;
- quantity;
- source bin;
- destination bin;
- transfer reference;
- dispatch;
- destination receipt;
- source transaction;
- destination transaction;
- gate verification where required.

The exact stock timing must be a business decision if the source documents do not define it.

---

# 16. Bin-to-Bin Transfer

```text
Source bin
 -> validate quantity
 -> destination bin
 -> approve if required
 -> execute
 -> source OUT
 -> destination IN
 -> linked bin transactions
 -> audit
```

Example:

```text
Bin A = 50
Transfer 10
Bin A = 40
Bin B = previous + 10
```

Reject same-bin transfers and insufficient stock.

---

# 17. Stock Taking

Controlled workflow:

```text
Create Session
 -> Select stores/locations/items
 -> Physical Count
 -> Enter Count
 -> Compare System vs Physical
 -> Calculate Variance
 -> Investigate
 -> Record Reason
 -> Verify
 -> Approve Adjustment
 -> Adjustment Transaction
 -> Close Session
 -> Report
```

Example:

```text
System = 100
Physical = 97
Variance = -3
```

Do not directly overwrite 100 with 97.

Investigate causes such as:
- missing paperwork;
- unposted receipt/issue;
- incorrect posting;
- spoilage;
- unit conversion;
- unauthorized issue;
- theft/pilferage.

Only approved adjustment transactions may change the balance.

---

# 18. Reconciliation

```text
Variance
 -> Investigation
 -> Reason
 -> Corrective Action
 -> Approval
 -> Adjustment/Reversal
 -> Audit
```

Variance history must remain visible.

---

# 19. Stock Control and Shelf Life

Monitor:
- minimum;
- maximum;
- reorder point;
- safety stock;
- low stock;
- out of stock;
- slow moving;
- dormant;
- overstock;
- expiry;
- near expiry;
- damaged;
- obsolete;
- quarantine.

Thresholds should use configuration where policy is not fixed.

Warnings must use real database inventory data.

---

# 20. Disposal

Workflow:

```text
Condition/Shelf-life monitoring
 -> Flag
 -> Disposal Request
 -> Review
 -> Approval / Rejection
 -> Execution
 -> Inventory Removal
 -> Disposal Transaction
 -> Audit
 -> History
```

Approval must NOT automatically remove stock. Execution is the stock-changing action.

Record:
- request;
- item;
- quantity;
- condition;
- reason;
- value;
- authority;
- disposal method;
- date;
- responsible officers;
- reference;
- execution result.

Never hard-delete disposal history.

---

# 21. Fixed Assets

Lifecycle:

```text
Receipt
 -> Evaluation
 -> GRN
 -> Asset Registration
 -> Asset Code
 -> Location
 -> Assignment
 -> User Card/Custody
 -> Movement
 -> Repair/Return
 -> Disposal
```

Track:
- asset code;
- serial number;
- acquisition date/value;
- location;
- department;
- custodian;
- condition;
- assignment history;
- movement history.

---

# 22. User Cards

User cards show assets/property assigned to a user.

```text
Asset
 -> Assignment
 -> User Card
 -> Custody
 -> Movement
 -> Return/Transfer
```

The system must preserve who received the asset, when, condition, location and subsequent movements.

---

# 23. Notifications

Persist backend-driven notifications for:
- pending evaluation;
- evaluation completed;
- GRN ready;
- requisition pending approval;
- SIV pending approval;
- issue ready;
- transfer awaiting receipt;
- return pending inspection;
- stock taking;
- reconciliation variance;
- disposal;
- low stock;
- expiry.

Each notification should link to its source record.

Do not rely only on localStorage/browser-derived notifications.

---

# 24. Audit

Audit:
- login;
- failed login where appropriate;
- create;
- update;
- submit;
- evaluate;
- approve;
- reject;
- receive;
- GRN;
- issue;
- return;
- transfer;
- adjustment;
- disposal;
- gate verification;
- role/permission changes.

Capture meaningful source information:
- actor;
- role;
- entity;
- entity ID;
- action;
- timestamp;
- before state;
- after state;
- reference;
- outcome;
- reason;
- IP where available.

---

# 25. Database Transaction Integrity

Every stock-changing operation must be atomic:

```text
BEGIN
 -> validate
 -> authorize
 -> validate stock
 -> consume FIFO where required
 -> update inventory
 -> create transaction
 -> update stock card
 -> update bin card
 -> create audit
 -> create notification
 -> COMMIT
```

Failure:

```text
ROLLBACK EVERYTHING
```

Never allow stock, ledger, bin card and audit data to become inconsistent.

---

# 26. Frontend Requirements

Every page must:
- open from the correct sidebar;
- belong to the correct actor;
- load real API data;
- show loading/empty/error states;
- have working CTAs;
- validate forms;
- respect permissions;
- call the correct API;
- refresh after mutation;
- display success/error feedback;
- link related documents;
- never expose unauthorized operations.

Examples:

```text
Approve Requisition
 -> API
 -> DB status changes
 -> audit
 -> notification
 -> UI refresh
```

```text
Generate GRN
 -> API
 -> GRN persisted
 -> accepted stock posted
 -> stock card updated
 -> bin card updated
 -> audit
 -> UI refresh
```

---

# 27. API Requirements

For every endpoint verify:

- method;
- URL;
- authentication;
- authorization;
- validation;
- controller;
- service;
- database;
- transaction;
- audit;
- notification;
- response;
- errors;
- frontend consumer.

Find:
- dead routes;
- duplicate routes;
- missing routes;
- unused routes;
- inconsistent response formats;
- missing authorization;
- missing validation.

---

# 28. Reports

At minimum:

### Current Stock
Item, store, location, opening, receipts, issues, returns, transfers, adjustments, closing, thresholds, value.

### Stock Movement
Date, reference, item, store, transaction, quantity in/out, balance, user.

### Valuation
Item, quantity, unit cost, total value, store, method, date.

### Receiving
Receipt, supplier, date, store, item, quantity, acceptance, GRN.

### Issues
Issue, requisition, department, item, quantity, date, store, recipient.

Also:
- GRN;
- requisition;
- returns;
- transfers;
- stock taking;
- reconciliation;
- assets;
- disposal;
- audit.

Reports must use posted database transactions.

---

# 29. Traceability

Every movement should answer:

1. What item?
2. How much?
3. From where?
4. To where?
5. Why?
6. Which source document?
7. Who requested?
8. Who approved?
9. Who physically handled it?
10. When?
11. Previous balance?
12. New balance?
13. FIFO effect?
14. Stock-card effect?
15. Bin-card effect?
16. Audit record?
17. Notification?
18. Report impact?

Traceability:

```text
Item
 -> Receipt
 -> Evaluation
 -> GRN
 -> Stock Transaction
 -> Stock Card
 -> Bin Card
 -> Requisition
 -> SIV
 -> Issue
 -> Return / Transfer / Adjustment / Disposal
 -> Audit
```

---

# 30. Important Business Validation Rules

Examples:
- quantity > 0;
- unique item codes;
- unique store codes;
- issue <= available stock;
- transfer <= source stock;
- return <= previously issued;
- disposal <= eligible stock;
- required fields cannot be empty;
- expiry date valid;
- GRN only after acceptance;
- final SIV only after approval;
- rejected/pending requisition cannot be issued;
- unauthorized user cannot approve/post;
- closed stock-taking cannot be silently changed;
- posted historical transactions cannot be deleted.

---

# 31. Required Business Decisions

Do not invent:
- approval limits;
- exact approval hierarchy;
- partial acceptance policy;
- partial issue policy;
- exact transfer stock timing;
- gate-pass scenarios;
- disposal authority;
- stock adjustment authority;
- shelf-life threshold;
- stock-taking frequency.

Mark unresolved items:

**BUSINESS DECISION REQUIRED**

and make the implementation configurable.

---

# 32. Completion Standard

A feature is complete only when:

```text
Correct page
+
Correct actor
+
Correct sidebar
+
Correct CTA
+
Form validation
+
API
+
Backend authorization
+
Database persistence
+
Atomic transaction
+
Correct stock effect
+
Stock Card update
+
Bin Card update
+
Audit
+
Notification where required
+
Frontend refresh
+
Error handling
+
Report visibility
```

The system is not complete merely because pages exist.

---

# 33. Implementation Order

Do not rebuild the application from scratch. Audit and extend the existing implementation.

Recommended order:

1. Authentication/RBAC
2. Master data
3. Receiving/evaluation/GRN
4. Stock ledger/FIFO
5. Requisition/approval
6. SIV/ISIV/issue
7. Returns
8. Transfers
9. Bin transfers
10. Stock taking
11. Reconciliation/adjustments
12. Fixed assets
13. Shelf-life/stock control
14. Disposal
15. Gate verification
16. Notifications
17. Reports
18. Audit/traceability
19. Automated testing
20. Security/performance hardening

After every phase:

```text
Build
 -> lint
 -> unit tests
 -> API tests
 -> database tests
 -> authorization tests
 -> workflow tests
 -> frontend verification
 -> regression testing
```

---

# 34. Final End-to-End Example

Suppose the system has 20 laptops.

### Receiving

10 arrive.

TEC accepts 8.

```text
Opening = 20
Accepted receipt = +8
Available = 28
```

### GRN

GRN is generated for 8 and references the receipt/evaluation.

### Requisition

A department requests 6.

Authorized approval succeeds.

### SIV

Storekeeper prepares SIV/ISIV.

No stock reduction yet.

### Final Issue

Final posting confirms 6.

```text
28 - 6 = 22
```

Stock Card OUT = 6.
Bin Card OUT = 6.
FIFO layers are consumed.

### Gate

If required:

```text
SIV -> Gate Pass -> Security verification -> Gate event
```

### Return

Department returns 2.

Inspection finds:
- 1 reusable;
- 1 damaged.

Only 1 returns to available stock.

```text
22 + 1 = 23
```

### Transfer

2 are transferred to another store after approval and dispatch/receipt.

Source becomes:

```text
23 - 2 = 21
```

Destination receives:

```text
+2
```

### Stock Taking

System says 21, physical count says 20.

Variance:

```text
-1
```

Investigation and approval occur before adjustment.

### Disposal

If the damaged item is eligible:

```text
Flag
 -> Request
 -> Review
 -> Approval
 -> Execution
 -> Inventory removal
 -> Disposal transaction
 -> Audit
```

Historical records remain.

---

# 35. Final Engineering Principle

The system must behave as ONE connected business system:

```text
BUSINESS DOCUMENT
      ↓
AUTHORIZED WORKFLOW
      ↓
POSTED TRANSACTION
      ↓
INVENTORY BALANCE
      ↓
STOCK CARD
      ↓
BIN CARD
      ↓
AUDIT
      ↓
NOTIFICATION
      ↓
REPORT
```

The most important engineering objective is not simply to create pages. It is to make every business action, database transaction, stock movement, document, approval, actor, audit record and report agree with each other.
