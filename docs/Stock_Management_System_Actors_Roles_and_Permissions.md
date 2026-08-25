# Stock Management System — Actors, Roles, Permissions and Activities

## 1. Purpose

This document defines a clear role-assignment model for the Stock Management System.

The goal is to make every actor's responsibilities explicit so that:

- each actor sees the correct dashboard;
- each actor sees only the appropriate sidebar modules;
- every action/CTA is permitted according to role;
- approval and operational duties are separated where appropriate;
- backend authorization is stronger than frontend visibility;
- every transaction has a clear responsible actor;
- administrators retain overall system-management authority without destroying operational segregation.

---

# 2. Recommended Role Model

The system should use these operational actors:

1. Administrator
2. Property Administration Officer (PAO)
3. Store Head
4. Storekeeper
5. Stock Clerk
6. Technical Evaluation Committee (TEC)
7. Department Head
8. Accountant
9. Security Officer

> Supplier is treated as an external party rather than a core internal operational actor unless the SRS explicitly requires supplier login.

---

# 3. Critical Principle: Administrator vs Operational Roles

## Can Administrator have permission to perform every operation?

### Technically: Yes.

An Administrator can be given a system-level `SUPER_ADMIN` capability that allows emergency access to every module.

### Operationally: Do not make the Administrator the normal performer of every transaction.

This distinction is important.

The Administrator should primarily manage:

- users;
- roles;
- permissions;
- system configuration;
- master data;
- security;
- system monitoring;
- audit access;
- technical maintenance.

The Administrator may have emergency/override access when necessary, but ordinary operational transactions should still require their designated operational actor.

### Example

A Storekeeper normally receives goods.

The Administrator technically may have an emergency override to correct or complete a transaction, but the normal workflow remains:

```text
Supplier
   ↓
Storekeeper / Receiving Staff
   ↓
TEC
   ↓
PAO / Authorized Approver
   ↓
GRN
   ↓
Inventory
```

The system must preserve the actual actor who performed each action.

---

# 4. PAO — Property Administration Officer

## Role purpose

The PAO is a major supervisory, administrative and control actor.

The PAO should have broad permissions, but not unlimited operational authority.

The PAO is responsible for:

- property administration oversight;
- inventory administration;
- approval workflows assigned to property administration;
- monitoring stores;
- reviewing receipts and GRNs;
- supervising stock control;
- reviewing reports;
- monitoring assets;
- monitoring disposal;
- overseeing reconciliation;
- auditing operational compliance.

## PAO dashboard

The PAO dashboard should show:

- total inventory value;
- total stock quantity;
- number of stores;
- pending receipts;
- receipts awaiting evaluation;
- receipts awaiting approval;
- pending GRNs;
- pending requisitions;
- pending SIV approvals;
- pending returns;
- pending transfers;
- stock-taking sessions;
- reconciliation variances;
- assets requiring registration;
- assets requiring assignment;
- disposal requests;
- damaged/obsolete stock;
- low-stock alerts;
- expiry alerts;
- recent operational activities;
- audit alerts.

## PAO sidebar

Recommended:

- Dashboard
- Stores
- Locations
- Categories
- Items
- Suppliers
- Departments
- Goods Receipts
- Technical Evaluations
- GRNs
- Requisitions
- SIV / ISIV
- Stock
- Stock Cards
- Bin Cards
- Transfers
- Returns
- Stock Taking
- Reconciliation
- Fixed Assets
- Disposal
- Reports
- Notifications
- Audit Logs

## PAO permissions

### Can create/edit

- stores;
- locations;
- categories;
- items;
- suppliers;
- departments;
- configuration;
- selected administrative records.

### Can approve/review

- goods receiving workflows assigned to PAO;
- GRNs;
- requisitions where PAO approval is required;
- SIV/ISIV;
- transfers where PAO approval is required;
- returns;
- reconciliation;
- disposal requests.

### Can view

Broad operational and financial information.

### Should not normally perform

- routine physical receiving;
- routine stock issuing;
- physical counting as the sole counter;
- TEC technical evaluation;
- security gate verification.

This preserves segregation of duties.

---

# 5. Administrator

## Purpose

The Administrator owns the technical/system administration layer.

## Dashboard

Show:

- users;
- active sessions;
- roles;
- permissions;
- system health;
- database/system status;
- audit activity;
- failed logins;
- workflow exceptions;
- configuration status;
- operational summary.

The Administrator may also have a read-only system-wide operational summary.

## Sidebar

- Dashboard
- Users
- Roles
- Permissions
- Stores
- Departments
- Categories
- Items
- Suppliers
- Locations
- System Configuration
- Security
- Audit Logs
- Notifications
- Reports
- System Health

## Administrator permissions

### Full system management

- user CRUD;
- role CRUD;
- permission management;
- account activation/deactivation;
- system configuration;
- security configuration;
- master-data administration;
- audit access;
- emergency operational override.

### Important restriction

`SUPER_ADMIN` must not mean that every transaction automatically bypasses workflow.

For normal workflows, the system should still record:

- actor;
- actor role;
- action;
- reason;
- timestamp;
- source document;
- override status.

Emergency override should require a reason.

---

# 6. Store Head

## Purpose

The Store Head supervises store operations.

## Dashboard

Show:

- store stock;
- receipts;
- pending evaluations;
- pending issues;
- requisitions;
- transfers;
- returns;
- stock alerts;
- stock-taking;
- reconciliation;
- store activities.

## Sidebar

- Dashboard
- My Store
- Items
- Locations
- Goods Receipts
- Technical Evaluation Queue
- GRNs
- Requisitions
- SIV / ISIV
- Stock
- Stock Cards
- Bin Cards
- Transfers
- Returns
- Stock Taking
- Reconciliation
- Reports
- Notifications

## Responsibilities

- supervise storekeepers;
- review receiving records;
- initiate TEC evaluation;
- supervise goods receipt;
- approve/store-review operational requests where assigned;
- supervise stock issues;
- review transfers;
- supervise stock taking;
- review discrepancies;
- monitor stock levels.

## Should not perform as normal duty

- system user administration;
- role/permission administration;
- independent TEC technical evaluation;
- Security gate verification;
- accounting approval.

---

# 7. Storekeeper

## Purpose

The Storekeeper performs physical stock operations.

## Dashboard

Show:

- today's receipts;
- pending receiving tasks;
- available stock;
- low stock;
- pending issues;
- approved requisitions ready for issue;
- pending returns;
- pending transfers;
- bin/location information.

## Sidebar

- Dashboard
- Items
- Locations
- Goods Receipts
- GRNs
- Stock
- Stock Cards
- Bin Cards
- Requisitions
- SIV / ISIV
- Returns
- Transfers
- Stock Taking
- Notifications
- Operational Reports

## Main actions

### Receiving

- create receiving record;
- record supplier;
- record documents;
- record received quantities;
- record condition;
- submit receipt;
- attach evidence where supported.

### Issuing

- view approved requisitions;
- prepare issue;
- prepare SIV/ISIV;
- issue approved quantities;
- select stock/location;
- complete final posting where authorized.

### Transfers

- prepare transfer;
- dispatch approved transfer;
- select source bins;
- confirm quantities.

### Returns

- receive returned materials;
- record quantity;
- send for inspection/evaluation;
- post approved reusable return.

### Stock taking

- participate in physical counting;
- enter physical quantities;
- report differences.

## Must not

- approve their own transactions where segregation is required;
- modify posted ledger history;
- manually edit system-generated bin-card balances;
- delete historical stock transactions.

---

# 8. Stock Clerk

## Purpose

The Stock Clerk supports daily inventory record keeping.

## Dashboard

Show:

- stock quantity;
- bin/location balances;
- stock movements;
- receiving records;
- issue records;
- low stock;
- pending clerical tasks.

## Sidebar

- Dashboard
- Items
- Locations
- Stock
- Stock Cards
- Bin Cards
- Goods Receipts
- GRNs
- Requisitions
- Returns
- Transfers
- Stock Taking
- Reports

## Main activities

- maintain permitted item information;
- record/support stock documentation;
- search stock;
- view stock cards;
- view bin cards;
- assist stock taking;
- assist receiving;
- prepare clerical records.

## Important control

Stock Clerk should NOT directly edit system-generated balances.

For example:

```text
Stock Clerk cannot:
Bin balance = 100 → manually change to 120
```

Instead:

```text
Approved transaction
      ↓
Stock service
      ↓
Inventory balance
      ↓
Bin transaction
      ↓
Bin balance
```

---

# 9. Technical Evaluation Committee (TEC)

## Purpose

TEC evaluates materials that require technical inspection.

## Dashboard

Show:

- receipts awaiting evaluation;
- materials under review;
- pending evaluation;
- approved quantities;
- rejected quantities;
- partial acceptance;
- findings requiring action;
- evaluation history.

## Sidebar

- Dashboard
- Evaluation Queue
- Goods Receipts
- Technical Evaluations
- Evaluation History
- Attachments/Evidence
- Notifications
- Reports

## Main actions

- open receipt for evaluation;
- inspect material;
- record findings;
- record condition;
- record accepted quantity;
- record rejected quantity;
- recommend approval;
- reject;
- partially approve;
- place on hold;
- attach evidence;
- submit evaluation.

## Must not

- modify stock balances directly;
- create arbitrary inventory adjustments;
- issue stock;
- approve their own financial/administrative actions.

---

# 10. Department Head

## Purpose

The Department Head manages material requests for their department.

## Dashboard

Show:

- department stock requests;
- draft requisitions;
- submitted requisitions;
- pending approvals;
- approved requisitions;
- partially fulfilled requests;
- fulfilled requests;
- rejected requests;
- request history.

## Sidebar

- Dashboard
- My Department
- Requisitions
- Request Status
- Issues
- Returns
- Assets
- Notifications
- Reports

## Main actions

- create requisition;
- edit draft requisition;
- submit requisition;
- approve/review departmental requests where authorized;
- track fulfillment;
- confirm receipt;
- initiate return;
- view assigned assets.

## Critical security rule

The backend must enforce department ownership.

A Department Head from Department A must not be able to access or modify Department B requisitions simply by changing an ID in the URL.

---

# 11. Accountant

## Purpose

The Accountant primarily handles financial and valuation visibility.

## Dashboard

Show:

- inventory value;
- FIFO valuation;
- received stock value;
- issued stock value;
- returns;
- asset value;
- disposal value;
- stock adjustments;
- valuation trends.

## Sidebar

- Dashboard
- Inventory Valuation
- Stock Movement
- Goods Receipts
- GRNs
- Issues
- Returns
- Fixed Assets
- Disposal
- Reports
- Audit/Financial History
- Notifications

## Main actions

- view valuation;
- review inventory cost;
- review GRNs;
- review stock issues;
- review returns;
- review asset values;
- generate financial reports;
- export reports.

## Normally read-only

Accountant should not normally:

- receive goods;
- issue goods;
- modify stock;
- approve technical evaluations;
- perform gate verification.

---

# 12. Security Officer

## Purpose

Security verifies authorized movement of materials through the university gate.

## Dashboard

Show:

- pending gate verifications;
- approved outgoing issues;
- transfer dispatches;
- asset movement requests;
- suspicious/invalid documents;
- recently verified movements.

## Sidebar

- Dashboard
- Gate Verification
- Issue Documents
- Transfer Documents
- Asset Movement
- Verification History
- Notifications

## Main actions

- scan/open document;
- verify document number;
- verify approval status;
- verify items and quantities;
- verify responsible person;
- confirm outgoing movement;
- reject invalid movement;
- record gate verification.

## Must not

- approve stock requisitions;
- modify stock balances;
- create arbitrary issues;
- approve their own gate verification.

---

# 13. Permission Matrix

The system should distinguish these permission types:

| Permission | Meaning |
|---|---|
| VIEW | Read information |
| CREATE | Create draft records |
| EDIT | Edit unposted/unapproved records |
| SUBMIT | Submit for workflow |
| REVIEW | Review records |
| APPROVE | Approve |
| REJECT | Reject |
| POST | Perform the actual stock/accounting posting |
| EXECUTE | Execute approved physical/business action |
| VERIFY | Verify at a control point |
| EXPORT | Export reports |
| CONFIGURE | Change system configuration |
| ADMIN | Manage system/security |

---

# 14. High-Level Permission Matrix

| Actor | Master Data | Receiving | TEC | GRN | Requisition | SIV/Issue | Return | Transfer | Stock Taking | Reconciliation | Assets | Disposal | Gate | Reports |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Administrator | Full | Override | Override | Override | Override | Override | Override | Override | Override | Override | Override | Override | Override | Full |
| PAO | Full/High | Review | Review | Approve/Review | Approve | Approve/Review | Approve/Review | Approve/Review | Approve | Approve | Manage/Review | Approve/Review | View | Full |
| Store Head | Store | Supervise | Initiate/Review | Review | Review | Supervise | Review | Approve/Review | Supervise | Review | Review | Review | View | High |
| Storekeeper | Limited | Execute | No | Prepare | View | Execute | Receive/Prepare | Dispatch | Count | Participate | Register/Move where authorized | Prepare | No | Operational |
| Stock Clerk | Limited | Support | No | View/Support | Support | Support | Support | Support | Count | Support | Support | Support | No | Operational |
| TEC | No | Inspect | Execute | Recommend | No | No | Inspect | No | No | No | Technical review | Technical review | No | Evaluation |
| Department Head | Department | No | No | No | Create/Approve departmental | Request/Confirm | Request | Request | Participate | View | View own dept | Request | No | Department |
| Accountant | Financial view | View | No | Financial review | Financial view | Financial review | Financial review | Financial view | View | Financial review | Asset value | Financial review | No | Financial |
| Security Officer | No | No | No | No | No | Verify movement | No | Verify movement | No | No | Verify asset movement | Verify disposal movement | Execute gate verification | Verification |

> This matrix is a recommended operational model. Where the official SRS/mentor documentation specifies a different authority, that documented rule takes precedence.

---

# 15. Example: Goods Receiving

## Step 1 — Storekeeper

Creates receipt:

```text
Supplier: ABC Office Supplies
Item: A4 Paper
Quantity: 500 boxes
Unit Cost: ETB 450
Store: Main Store
```

Status:

```text
Draft
```

## Step 2 — Storekeeper

Submits receipt.

```text
Submitted
```

## Step 3 — Store Head / PAO

Reviews documents and sends material to TEC where technical evaluation is required.

```text
Under Evaluation
```

## Step 4 — TEC

Inspects the paper.

Result:

```text
Accepted = 480
Rejected = 20
```

## Step 5 — Authorized approval

The approved quantity becomes eligible for GRN.

## Step 6 — GRN

GRN is generated for 480 boxes.

## Step 7 — Stock posting

Only now:

```text
Inventory +480
FIFO layer +480
Stock card +480
Bin transaction +480
Audit log
```

The rejected 20 boxes do not become available stock.

---

# 16. Example: Requisition and Issue

Department requests:

```text
A4 Paper = 100 boxes
```

Department Head:

```text
Create → Submit
```

Authorized approver:

```text
Review → Approve
```

Storekeeper:

```text
Prepare SIV/ISIV
```

Authorized approver:

```text
Approve SIV
```

Storekeeper:

```text
Final Issue Post
```

Stock service:

```text
Available stock: 480
Issue: 100
Remaining: 380
```

FIFO layers are consumed according to the approved costing method.

Security Officer:

```text
Verify SIV
Verify quantity
Verify recipient
Verify authorization
Confirm gate exit
```

---

# 17. Example: Transfer

Main Store:

```text
A4 Paper = 380
```

Department Store requests:

```text
100 boxes
```

Workflow:

```text
Transfer Request
      ↓
Approval
      ↓
Dispatch
      ↓
Security Verification
      ↓
Destination Receipt
      ↓
Completion
```

The system must preserve one transfer reference across both stores.

---

# 18. Example: Return

Department returns:

```text
20 boxes
```

System checks:

```text
Previously issued quantity
```

Return quantity cannot exceed previously issued quantity.

Storekeeper receives the return.

Inspection determines:

```text
15 reusable
5 damaged
```

Only:

```text
15
```

returns to available stock.

The damaged 5 move into the appropriate damaged/quarantine workflow.

---

# 19. Example: Stock Taking

System says:

```text
A4 Paper = 380
```

Physical count:

```text
A4 Paper = 374
```

Variance:

```text
-6
```

The system must NOT simply change 380 → 374.

Instead:

```text
Stock-taking session
      ↓
Physical count
      ↓
Variance
      ↓
Investigation
      ↓
Reason
      ↓
Approval
      ↓
Adjustment transaction
      ↓
New balance = 374
```

---

# 20. Example: Disposal

Damaged stock:

```text
5 boxes
```

Workflow:

```text
Damage/Obsolete Flag
      ↓
Disposal Request
      ↓
Review
      ↓
Approval
      ↓
Disposal Execution
      ↓
Inventory transaction
      ↓
Stock removed
      ↓
Disposal record retained
```

Approval alone must NOT silently remove stock.

---

# 21. Actor Dashboard Design Principle

Dashboards should not merely show generic totals.

Every dashboard should answer:

1. What requires my attention?
2. What actions can I perform?
3. What is waiting for my approval?
4. What happened recently?
5. What exceptions require attention?
6. What stock information is relevant to my role?

Each dashboard should therefore contain:

```text
KPI cards
+
Pending-work queues
+
Alerts
+
Recent activities
+
Quick actions
+
Relevant charts/reports
```

---

# 22. Sidebar Rule

A sidebar item must never open another unrelated module.

Example:

```text
Stock Reconciliation
```

must open:

```text
/reconciliation
```

and NOT:

```text
/dashboard
```

Every sidebar item must have:

- correct route;
- correct page;
- correct role authorization;
- correct API integration;
- correct loading state;
- empty state;
- error state;
- CRUD/action controls where applicable.

---

# 23. CTA Rule

Every CTA must perform its advertised action.

Examples:

```text
+ New Receipt
      ↓
/receipts/new
```

```text
View
      ↓
/receipts/:id
```

```text
Approve
      ↓
POST /api/.../:id/approve
```

```text
Reject
      ↓
POST /api/.../:id/reject
```

```text
Post Issue
      ↓
POST /api/.../:id/post
```

No CTA should be decorative or route to an unrelated page.

---

# 24. Frontend Authorization

Frontend should hide unavailable actions.

However:

> Frontend hiding is NOT security.

Backend must independently verify:

```text
authenticated user
+
role
+
permission
+
resource ownership
+
workflow status
+
store/department scope
```

before executing an operation.

---

# 25. Backend Authorization

Example:

A Department Head requests:

```http
GET /api/requisitions/123
```

The backend must verify that requisition 123 belongs to that Department Head's department.

A user must not gain access by changing:

```text
/requisitions/123
```

to:

```text
/requisitions/456
```

---

# 26. Database Integrity

Every operational transaction should preserve:

```text
Who
What
When
Where
Why
Source Document
Previous State
New State
```

Stock-changing transactions should be atomic.

Example:

```text
Issue Post
 ├─ inventory balance
 ├─ FIFO layer
 ├─ stock transaction
 ├─ bin transaction
 ├─ SIV status
 ├─ audit log
 └─ notification
```

If any required part fails, the complete transaction should roll back.

---

# 27. Recommended Separation of Duties

The strongest design is:

```text
Administrator
    = system authority

PAO
    = property/inventory administration + broad supervision/approval

Store Head
    = store supervision

Storekeeper
    = physical stock operations

Stock Clerk
    = clerical stock support

TEC
    = technical inspection/evaluation

Department Head
    = departmental requisition/asset responsibility

Accountant
    = valuation/financial oversight

Security Officer
    = physical gate verification
```

This is better than giving every employee every permission.

---

# 28. Administrator Override Policy

The Administrator may have system-level override capability.

But every override must record:

```text
override = true
override_reason
administrator_id
timestamp
original_workflow_status
resulting_status
source_document
```

Example:

```text
Normal:
Storekeeper → Submit
PAO → Approve

Emergency:
Administrator → Override
```

The audit trail must clearly distinguish these.

---

# 29. Final Authorization Principle

The application should enforce:

> **Role determines what a user may attempt.**
>
> **Permission determines what action they may perform.**
>
> **Workflow status determines whether the action is currently valid.**
>
> **Organizational scope determines which records they may access.**
>
> **Database constraints and transactions enforce the final integrity.**

Therefore, a user should not be able to perform an operation simply because a button exists.

The system must validate:

```text
User
  ↓
Role
  ↓
Permission
  ↓
Scope
  ↓
Workflow status
  ↓
Business rules
  ↓
Database transaction
  ↓
Audit
```

---

# 30. Recommended Final Model

Do NOT design the system as:

```text
Admin = everything
PAO = everything
Storekeeper = everything
```

Instead:

```text
                    ADMINISTRATOR
                   System Authority
                         │
              ┌──────────┴──────────┐
              │                     │
             PAO              System Configuration
              │
       Property Oversight
              │
       ┌──────┼────────┐
       │      │        │
   Store Head  TEC   Accountant
       │
   ┌───┴────┐
   │        │
Storekeeper Stock Clerk

Department Head ─── Department Requests/Assets

Security Officer ─── Gate Verification
```

The Administrator remains capable of emergency intervention, but the normal business process remains segregated and traceable.

## Final implementation requirement

Before changing permissions, compare this model against the official SRS, mentor amendments, and manual.

Where those documents explicitly assign an actor a responsibility, preserve that assignment.

Where the documents are silent, use the least-privilege model above rather than granting broad operational authority.
