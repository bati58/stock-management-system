# Stock Management System — Final Refactoring Recommendations

## Objective
Refactor the existing React + Node.js/Express + PostgreSQL Stock Management System without rebuilding it from scratch.

The final system must ensure:
- Every actor sees the correct dashboard and authorized sidebar modules.
- Every sidebar item opens its own corresponding page.
- No module redirects to an unrelated dashboard.
- Every page loads real backend data and has proper loading, error, empty, and success states.
- Every CTA performs its intended operation.
- CRUD and workflow actions are controlled by actor permissions.
- Frontend, backend, and PostgreSQL are fully connected.
- Backend authorization independently protects every action.
- Stock-changing operations are transactional, auditable, traceable, and reflected in stock/bin cards and FIFO records.
- Existing working functionality and realistic seed data are preserved unless correctness requires change.

## Architecture rule

Every operational action must follow:

```text
Actor
→ Role + Permission
→ React Page
→ CTA/Form
→ API Client
→ Express Route
→ Authentication
→ Authorization
→ Validation
→ Controller
→ Business Service
→ PostgreSQL Transaction
→ Stock/Related Tables
→ Audit + Notification
→ API Response
→ UI Refresh
```

A feature is implemented only when this complete chain works.

## Action-level permissions

Use action permissions, not only page permissions:

`VIEW, CREATE, EDIT, SUBMIT, APPROVE, REJECT, AMEND, POST, EXECUTE, VERIFY, ISSUE, RECEIVE, RETURN, TRANSFER, EXPORT, PRINT, CANCEL, REVERSE, MANAGE, CONFIGURE, MANAGE_USERS, VIEW_AUDIT`

Frontend permission checks are for usability. Backend authorization is the real security boundary.

---

# Actor and sidebar recommendations

## 1. Administrator

### Sidebar
- Dashboard
- Stores
- Item Categories
- Items
- Locations
- Suppliers
- Departments
- Goods Receipts
- Technical Evaluation
- GRN Documents
- Stock Cards
- Bin Cards
- Bin Transfers
- Store Requisitions
- Issue Vouchers
- Material Returns
- Material Transfers
- Stock Taking
- Reconciliation
- Fixed Assets
- User Material Cards
- Disposal Management
- Gate Pass Verification
- Users
- Roles/Permissions
- Business Rules
- Reports
- Audit Log
- Notifications

### Permissions
Broad system administration and operational oversight. May have full technical permissions, but posted historical transactions must remain protected from destructive deletion.

---

## 2. Property Administration Officer (PAO)

### Sidebar
- Dashboard
- Stores
- Categories
- Items
- Locations
- Suppliers
- Departments
- Goods Receipts
- Technical Evaluation
- GRN Documents
- Stock Cards
- Bin Cards
- Bin Transfers
- Store Requisitions
- Issue Vouchers
- Material Returns
- Material Transfers
- Stock Taking
- Reconciliation
- Fixed Assets
- User Material Cards
- Disposal Management
- Reports
- Audit Log

### Main permissions
- VIEW operational records
- APPROVE/REJECT assigned workflows
- REVIEW reconciliation
- REVIEW/APPROVE disposal
- REVIEW assets
- EXPORT/PRINT reports
- VIEW audit history

PAO has substantial authority but should not impersonate TEC technical decisions or Security gate verification.

---

## 3. Store Head

### Sidebar
- Dashboard
- Stores
- Categories
- Items
- Locations
- Suppliers
- Departments
- Goods Receipts
- Technical Evaluation Status
- GRN Documents
- Stock Cards
- Bin Cards
- Bin Transfers
- Store Requisitions
- Issue Vouchers
- Material Returns
- Material Transfers
- Stock Taking
- Reconciliation
- User Material Cards
- Reports

### Main permissions
VIEW, CREATE/EDIT where store-owned, SUBMIT, REVIEW, APPROVE/REJECT store-level workflows, SUPERVISE, PRINT, EXPORT.

Must not perform TEC technical evaluation decisions.

---

## 4. Storekeeper

### Sidebar
- Dashboard
- Items
- Locations
- Suppliers
- Goods Receipts
- GRN Documents
- Stock Cards
- Bin Cards
- Bin Transfers
- Approved Requisitions
- Issue Vouchers
- Material Returns
- Material Transfers
- Stock Taking
- User Material Cards

### Main permissions
- CREATE/EDIT draft receipts
- SUBMIT receipts
- VIEW GRNs
- VIEW stock/bin cards
- PREPARE bin transfers
- PREPARE issue vouchers
- RECEIVE/RECORD returns
- PREPARE transfers
- RECORD physical counts

Must not bypass requisition approval, SIV approval, TEC evaluation, disposal approval, or gate verification.

---

## 5. Stock Clerk

### Sidebar
- Dashboard
- Items
- Locations
- Stock Cards
- Bin Cards
- Stock Taking
- Reconciliation
- Reports

### Main permissions
VIEW records, record physical counts, support reconciliation, export authorized reports.

Must not directly edit system-generated stock balances.

---

## 6. Technical Evaluation Committee (TEC)

### Sidebar
- Dashboard
- Pending Technical Evaluations
- Evaluation History
- Evaluation Reports

### Main permissions
- VIEW pending evaluations
- START evaluation
- RECORD findings/condition/remarks
- RECORD accepted and rejected quantities
- APPROVE
- REJECT
- PARTIALLY APPROVE
- HOLD
- SUBMIT evaluation

Must not generate final GRNs, issue stock, change inventory balances, approve requisitions, or execute disposal.

---

## 7. Department Head

### Sidebar
- Dashboard
- My Department
- Store Requisitions
- Create Requisition
- Requisition History
- Material Returns
- Material Transfers
- Reports

### Main permissions
CREATE/EDIT draft requisitions, SUBMIT, VIEW own department requests, create returns and transfer requests, view issue history.

Backend must enforce department ownership.

---

## 8. Accountant

### Sidebar
- Dashboard
- Suppliers
- Stock Cards
- Issue Vouchers
- Reconciliation
- Inventory/FIFO Valuation Reports
- Receiving/Issue/Return/Transfer/Disposal Reports
- Audit Log

### Main permissions
Primarily VIEW, FILTER, EXPORT, PRINT, and financial review.

Normally should not mutate operational stock.

---

## 9. Security Officer

### Sidebar
- Dashboard
- Gate Pass Verification
- Verification History
- Issue Vouchers
- Material Transfers
- Security Verification History

### Main permissions
VIEW authorized documents, VERIFY gate passes, ACCEPT/REJECT verification, record remarks, view history.

Must not modify inventory quantities.

---

# Dashboard requirements

Each dashboard must be role-specific.

### Administrator
Stores, items, users, stock value, pending evaluations, requisitions, issues, returns, transfers, stock-taking, reconciliation, disposal, low stock, audit activity.

### PAO
Pending approvals, GRNs, requisitions, returns, transfers, reconciliation variances, stock-taking, disposal, fixed assets.

### Store Head
Store inventory, pending receipts, evaluations, requisitions, issues, returns, transfers, stock-taking, low stock.

### Storekeeper
Current stock, today's receipts/issues, pending requisitions, returns, transfers, low stock, stock-taking tasks.

### Stock Clerk
Stock-card activity, bin activity, counting tasks, reconciliation issues, low-stock items.

### TEC
Pending/under-review/approved/rejected evaluations and history.

### Department Head
Department requisitions, drafts, pending approvals, approved/partially issued/fulfilled requests, returns, transfers.

### Accountant
Inventory value, FIFO value, receiving/issue/return/disposal/reconciliation values.

### Security
Pending gate passes, today's verifications, rejected passes, outgoing issues and transfers.

---

# Page standard

Every sidebar item must satisfy:

```text
Sidebar item
→ Correct URL
→ Correct React page
→ Correct API
→ Correct permission
→ Correct backend route
→ Correct database operation
```

Every applicable page must support:
- Search
- Filter
- Sort
- Pagination
- View/details
- Create
- Edit
- Submit
- Approve
- Reject
- Amend
- Post
- Execute
- Verify
- Print
- Export
- History

Never show an action the current actor cannot perform.

Never use a generic dashboard redirect as a substitute for a missing module page.

---

# CRUD rules

Normal CRUD is appropriate for authorized master data:
- Stores
- Categories
- Items
- Locations
- Suppliers
- Departments
- Users

Operational records must use controlled workflow actions instead of unrestricted CRUD:
- Goods Receipts
- GRNs
- Requisitions
- SIV/ISIV
- SRNs
- Transfers
- Stock Taking
- Reconciliation
- Disposal

Use:
`Submit, Approve, Reject, Return for Correction, Cancel, Amend, Post, Reverse, Execute`

Do not allow unrestricted DELETE on posted historical transactions.

---

# Stock integrity

All stock-changing operations must pass through the centralized stock service.

Where applicable, one transaction must maintain:
- inventory balance
- FIFO layers
- stock-card transactions
- bin-card transactions
- source document reference
- actor
- timestamp
- store/location
- reason
- audit
- notification

Never modify stock quantity directly from React.

---

# Critical workflows

## Receiving

```text
Goods Receipt
→ Document verification
→ Submit
→ Store Head review
→ TEC evaluation
→ Approved/Rejected/Partial
→ GRN
→ Post accepted quantity
→ FIFO layer
→ Stock Card
→ Bin Card
→ Audit
→ Notification
```

Creating a receipt must not automatically increase available stock.

## Requisition and issue

```text
Department Head
→ Create requisition
→ Submit
→ Approval
→ Ready for Issue
→ Preliminary SIV/ISIV
→ Amendment if needed
→ SIV approval
→ Final SIV
→ Issue posting
→ FIFO consumption
→ Stock Card
→ Bin Card
→ Gate Pass
→ Security verification
→ Audit
```

Only final issue posting decreases available stock.

## Return

```text
Department
→ SRN
→ Store receives
→ Inspection
→ Technical evaluation where required
→ Approval
→ Approved reusable quantity
→ Stock posting
→ Stock Card
→ Bin Card
→ Audit
```

Returned damaged/obsolete material must not automatically become available stock. Returned quantity must not exceed previously issued quantity.

## Transfer

```text
Transfer Request
→ Approval
→ Dispatch
→ Gate verification where required
→ Source movement
→ Destination receipt
→ Destination movement
→ Bin update
→ Audit
```

Use one consistent business rule for transfer stock timing.

## Disposal

```text
Flag
→ Disposal Request
→ Review
→ Approval
→ Disposal Execution
→ Inventory removal
→ Disposal transaction
→ Audit
```

Approval must not itself remove stock.

---

# Frontend/backend/database verification

For every page inspect:

### Frontend
- route
- page component
- API client
- payload
- validation
- loading/error/empty/success states
- permission checks
- refresh behavior

### Backend
- route
- authentication
- authorization
- validation
- controller
- service
- transaction
- response
- error handling

### PostgreSQL
- tables
- foreign keys
- constraints
- indexes
- transaction behavior
- audit records
- stock ledger
- source references

---

# Sidebar and CTA audit

For every actor create:

```text
Actor
→ Sidebar Module
→ URL
→ Page
→ API
→ Permission
→ Backend Route
→ Database Tables
```

Find and fix:
- wrong URLs
- dashboard redirects
- missing pages
- duplicate routes
- unauthorized modules
- missing API calls
- dead CTAs
- fake/local-only data
- broken CRUD
- backend authorization gaps

Test every CTA:

`Add, Edit, Save, Submit, Approve, Reject, Amend, Post, Execute, Receive, Issue, Return, Transfer, Dispatch, Verify, Cancel, Print, Export, View Details`

Every CTA must validate input, call the correct API, pass authorization, persist correctly, create required audit/notification data, refresh the UI, and report success/failure.

---

# Reports

Reports must use actual database transactions.

Required:
- Inventory
- Stock Movement
- Stock Cards
- Bin Cards
- Receiving
- GRN
- Requisitions
- Issues
- Returns
- Transfers
- Stock Taking
- Reconciliation
- Fixed Assets
- User Material Cards
- Disposal
- FIFO Valuation
- Audit
- Gate Verification

Support appropriate search, filters, dates, store, department, item, status, pagination, CSV export, and printing.

---

# AI refactoring procedure

## Phase 1 — Audit
Do not modify initially. Inspect all source files except `node_modules`.

Report:
- implemented
- partial
- missing
- broken pages
- wrong routes
- permission gaps
- API gaps
- database gaps
- workflow gaps

## Phase 2 — Route/Page matrix
Verify every sidebar item opens the correct functional page.

## Phase 3 — Permission matrix
Verify `Actor × Module × Action` and make frontend/backend authorization consistent.

## Phase 4 — Workflow audit
Trace every transaction from UI to PostgreSQL.

## Phase 5 — Refactor
Fix only identified gaps. Do not unnecessarily rewrite working modules.

## Phase 6 — Regression
Retest all nine core actors and all affected workflows after each major change.

---

# Definition of done

- [ ] Every actor has a correct dashboard.
- [ ] Every sidebar item opens its corresponding page.
- [ ] No unrelated dashboard redirects.
- [ ] Every page loads real data.
- [ ] Every page has appropriate actions.
- [ ] Every CTA works.
- [ ] Frontend permissions are correct.
- [ ] Backend authorization independently enforces permissions.
- [ ] Store/department ownership is enforced.
- [ ] Status transitions are controlled.
- [ ] Posted transactions cannot be casually deleted.
- [ ] Stock changes only through approved workflows.
- [ ] Stock Cards update automatically.
- [ ] Bin Cards update automatically.
- [ ] FIFO layers update correctly.
- [ ] Audit logs are generated.
- [ ] Workflow notifications use real backend events.
- [ ] Reports use transactional data.
- [ ] Failed transactions roll back.
- [ ] Existing working features remain functional.
- [ ] Frontend build passes.
- [ ] Backend build passes.
- [ ] PostgreSQL integrity checks pass.
- [ ] Regression tests pass.

# Final instruction to the refactoring agent

Act as a Senior Full-Stack Engineer, Business Analyst, Frontend Architect, Backend Architect, PostgreSQL Engineer, Security Engineer, and QA Engineer.

Use the existing system as the baseline. **Do not rebuild from scratch.**

Do not assume a feature is implemented because a page, route, controller, service, or table exists. Verify:

```text
Page
→ CTA
→ API
→ Auth
→ Permission
→ Validation
→ Controller
→ Service
→ PostgreSQL
→ Transaction
→ Audit
→ Notification
→ Response
→ UI refresh
```

For every gap:
1. Identify it.
2. Identify affected files.
3. Explain business impact.
4. Make the smallest safe correction.
5. Test it.
6. Verify affected actors.
7. Verify related workflows.
8. Verify database integrity.
9. Continue only when stable.

Do not create duplicate permission systems, stock services, pages, or APIs. Extend and correct the existing architecture.

The final system must be fully connected:

**actors → roles → sidebar → pages → CTAs → APIs → backend services → PostgreSQL → stock ledger → audit → notifications → reports.**
