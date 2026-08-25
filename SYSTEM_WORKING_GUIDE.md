# Stock Management System
## End-to-End Working Guide

**System:** Stock Management System  
**Architecture:** React frontend, Node.js/Express backend, PostgreSQL database, REST API  
**Data:** Generic synthetic/demo data

---

## 1. Purpose of the System

The Stock Management System controls the complete lifecycle of inventory:

```text
Master Data
    -> Receiving
    -> Technical Evaluation
    -> GRN
    -> Available Stock
    -> Requisition
    -> Approval
    -> SIV/ISIV
    -> Issue
    -> Return or Transfer
    -> Stock Taking and Reconciliation
    -> Disposal
    -> Audit and Reporting
```

The system is designed around controlled business transactions rather than simple create, edit, and delete screens.

A stock quantity should change only through an authorized business operation. Each stock change should produce:

- An inventory quantity update.
- A stock transaction ledger entry.
- A FIFO cost-layer update where applicable.
- A bin-card update where a bin exists.
- An audit record.
- A source-document reference.

---

## 2. Application Architecture

### 2.1 Frontend

The frontend is a React application using React Router and reusable UI components.

Important frontend areas:

```text
frontend/src/
├── App.jsx                         Route definitions
├── main.jsx                        React application entry point
├── components/
│   ├── crud/                       Shared CRUD page behavior
│   ├── layout/                     Sidebar, topbar, dashboard layout
│   └── ui/                         Buttons, tables, cards, forms, dialogs
├── context/
│   ├── AuthContext.jsx             Authentication state
│   ├── NotificationContext.jsx     Notifications
│   └── ToastContext.jsx            User feedback messages
├── pages/                          Business workflow screens
├── services/
│   ├── apiClient.js                HTTP client
│   ├── entityService.js            Shared entity API wrapper
│   └── index.js                    Feature services
└── utils/
    ├── constants.js                Roles and statuses
    ├── rolePermissions.js           Frontend role behavior
    └── buildNotifications.js        Derived workflow alerts
```

The frontend is responsible for:

- Displaying pages and workflows.
- Hiding navigation not relevant to the current role.
- Showing permitted actions.
- Collecting and validating user input.
- Calling the backend API.
- Showing success, warning, and error messages.
- Displaying documents, stock cards, bin histories, dashboards, and reports.

Frontend permissions improve usability, but they are not the security boundary. The backend independently checks authentication and authorization.

### 2.2 Backend

The backend is an Express REST API.

```text
backend/src/
├── app.js                          Express configuration
├── server.js                       HTTP server entry point
├── config/db.js                    PostgreSQL pool and transactions
├── routes/index.js                 Protected API routes
├── controllers/                    HTTP request handlers
├── services/stockService.js        Stock-changing business logic
├── middleware/
│   ├── auth.js                     JWT verification
│   ├── authorize.js                Role and action authorization
│   └── errorHandler.js             Consistent error responses
├── db/
│   ├── schema.sql                  Canonical schema
│   ├── seed.sql                    Synthetic demo data
│   └── migrations/                 Additive schema changes
└── utils/
    ├── audit.js                    Audit record creation
    ├── permissions.js              Backend authorization matrix
    ├── workflow.js                 Status transition rules
    ├── refGenerator.js              Document reference generation
    └── AppError.js                  Application errors
```

A normal request follows this path:

```text
Browser
  -> React service
  -> HTTP request with JWT
  -> Express route
  -> requireAuth
  -> requireRole
  -> Controller
  -> Business service
  -> PostgreSQL transaction
  -> JSON response
  -> React state update
```

### 2.3 Database

PostgreSQL stores master data, documents, stock quantities, cost layers, transaction history, workflow history, and audit records.

The database uses:

- Primary keys.
- Foreign keys.
- Unique document and item codes.
- Quantity checks.
- Status checks.
- Indexes for frequently queried records.
- Row locks during stock operations.
- PostgreSQL transactions for multi-step stock changes.

---

## 3. Authentication and Authorization

### 3.1 Login

1. The user opens the login page.
2. The frontend sends username and password to `POST /api/auth/login`.
3. The backend finds the user by username.
4. The password is checked against the stored bcrypt hash.
5. The account must be active.
6. The backend signs a JWT containing user identity and role.
7. The frontend stores the token and user information locally.
8. Future requests include:

```http
Authorization: Bearer <token>
```

### 3.2 Session restoration

When the frontend starts:

1. It reads the saved session and token.
2. It calls `GET /api/auth/me`.
3. The backend verifies the token.
4. The frontend restores the current user or clears the invalid session.

### 3.3 Backend authorization

Protected routes first run JWT authentication. The authorization middleware then checks the requested resource and action against `backend/src/utils/permissions.js`.

Examples:

```text
GET  /api/items                 -> view permission
POST /api/items                 -> create permission
POST /api/requisitions/:id/approve -> approval permission
POST /api/issue-vouchers/:id/post -> posting permission
```

Unauthorized requests must return `403 Forbidden`.

### 3.4 Operational roles

The system defines these roles:

1. Administrator
2. Property Administration Officer
3. Store Head
4. Storekeeper
5. Stock Clerk
6. Technical Evaluation Committee
7. Department Head
8. Accountant
9. Security Officer

Role responsibilities are separated so that the person who records, approves, posts, and verifies a movement can be different people.

---

## 4. Master Data

Master data defines the objects used by operational workflows.

### 4.1 Stores

Stores represent physical stock-holding locations such as a main store, department store, specialized store, or laboratory store.

A store contains:

- Store name.
- Store code.
- Store type.
- Location.
- Store head.
- Active status.

Store records are used by:

- Item ownership.
- Goods receipts.
- Requisitions.
- Transfers.
- Bin cards.
- Reports.

### 4.2 Categories

Categories classify items, for example:

- Office Supplies.
- Laboratory Equipment.
- Electrical Components.
- Mechanical Tools.
- Computer Equipment.
- Safety Equipment.
- Furniture.
- Consumables.

Categories support searching, filtering, reporting, and valuation analysis.

### 4.3 Departments

Departments identify organizational requesters and approval owners.

A department can have:

- Department code.
- Department name.
- Assigned department head.
- Active status.

Department identity is used by requisitions, returns, user cards, and access scoping.

### 4.4 Suppliers

Suppliers are maintained as controlled master records containing:

- Supplier code.
- Supplier name.
- Contact information.
- Address.
- Active status.

Goods receipts can reference a supplier instead of relying only on uncontrolled text.

### 4.5 Items

An item represents a stock identity. It includes:

- Unique item code.
- Name.
- Category.
- Owning store.
- Unit of measure.
- Bin or structured location reference.
- Minimum level.
- Reorder level.
- Maximum level.
- Quantity on hand.
- Unit price.
- Expiry and condition information where available.

The database enforces unique item codes and non-negative quantity on hand.

### 4.6 Structured locations

Locations follow this hierarchy:

```text
Store
  -> Section
      -> Rack
          -> Shelf
              -> Bin
```

A location has:

- Store.
- Parent location.
- Level type.
- Code.
- Name.
- Active status.

When an item is assigned to a location, the backend verifies that the location belongs to the selected store.

---

## 5. Goods Receiving Workflow

### 5.1 Business flow

```text
Goods Arrive
  -> Temporary Receipt
  -> Submit / Notify TEC
  -> Technical Evaluation
  -> Accept, Partially Accept, or Reject
  -> Generate GRN
  -> Post Accepted Quantity
  -> Update Inventory and Stock Records
```

### 5.2 Creating a receipt

A Storekeeper or authorized user enters:

- Supplier or source.
- Purchase order or donation reference.
- Receipt date.
- Receiving store.
- Receiving officer.
- Material type.
- Condition on arrival.
- Supporting document reference.
- Item lines.
- Quantity.
- Unit price.

The backend creates a goods-receipt document and receipt-line records.

Creating the receipt does **not** increase available stock.

### 5.3 Technical evaluation

The receipt is moved through evaluation states such as:

```text
Pending Evaluation
  -> Under Evaluation
  -> Accepted
  -> Partially Accepted
  -> Rejected
```

The TEC records:

- Evaluation decision.
- Findings.
- Condition result.
- Accepted quantity.
- Rejected quantity.
- Evaluator.
- Evaluation date.
- Evidence or remarks.

Rejected material remains outside available inventory.

### 5.4 GRN generation and stock posting

A GRN can be generated only after acceptance.

The posting transaction performs these operations together:

1. Lock the receipt.
2. Confirm that the receipt is accepted or partially accepted.
3. Confirm that no GRN already exists.
4. Generate a server-side GRN number.
5. Create the GRN header and accepted lines.
6. Lock each affected item.
7. Increase item quantity on hand by accepted quantity.
8. Create a FIFO stock lot using the receipt cost.
9. Create a `Receipt` stock transaction.
10. Update the corresponding bin card.
11. Write an audit event.
12. Mark the receipt as `GRN Generated`.
13. Commit the transaction.

If any step fails, PostgreSQL rolls back the entire operation.

---

## 6. Stock Ledger and FIFO Valuation

### 6.1 Stock transaction ledger

The `stock_transactions` table records posted stock movements.

A transaction includes:

- Item.
- Date.
- Transaction type.
- Reference.
- Quantity in.
- Quantity out.
- Unit price.
- Running balance.
- Actor.
- Store.
- Bin.
- Reason.
- Source type.
- Source ID.

Supported movement types include:

```text
Receipt
Issue
Return
Transfer-Out
Transfer-In
Adjustment
Disposal
```

### 6.2 Stock card

A stock card is a view of the transaction ledger for one item. It shows:

- Opening or prior balance.
- Receipts.
- Issues.
- Returns.
- Transfers.
- Adjustments.
- Disposals.
- Running balance.
- Unit price.
- Source reference.

Users should be able to follow:

```text
Stock Card
  -> Stock Transaction
      -> Source Document
          -> User and timestamp
```

### 6.3 FIFO cost layers

Each accepted receipt creates a cost layer in `stock_lots`.

For an issue, transfer-out, shortage adjustment, or disposal:

1. Lock available FIFO lots.
2. Start with the oldest lot.
3. Consume the required quantity.
4. Move to the next lot if necessary.
5. Calculate the weighted cost of the consumed quantity.
6. Record that cost on the posted transaction.

For a surplus adjustment or return, a new cost layer is added.

---

## 7. Bin Cards and Bin Transfers

### 7.1 Bin cards

A bin card represents physical stock at a bin. It stores the current balance for an item, store, and bin combination.

Every movement can also create a `bin_card_movements` record containing:

- Bin card.
- Item.
- Store.
- Date.
- Reference.
- Movement type.
- Quantity in.
- Quantity out.
- New balance.
- Actor.
- Reason.

### 7.2 Bin-to-bin transfer

The flow is:

```text
Select Item
  -> Select Source Bin
  -> Select Destination Bin
  -> Validate Quantity
  -> Decrease Source Bin
  -> Increase Destination Bin
  -> Record Transfer Reference
  -> Record Both Histories
  -> Commit
```

The backend checks:

- Source and destination bins are different.
- Quantity is positive.
- Source bin exists.
- Source bin has sufficient balance.

The operation occurs inside one PostgreSQL transaction, so the source and destination cannot become inconsistent due to a half-completed request.

---

## 8. Requisition Workflow

### 8.1 Creating a requisition

A Department Head or authorized requester enters:

- Department.
- Store.
- Request date.
- Requester.
- Requested items.
- Requested quantities.

The requisition is stored with a controlled status and line items.

### 8.2 Approval

The intended lifecycle is:

```text
Draft
  -> Submitted
  -> Pending Approval
  -> Approved / Partially Approved / Rejected
  -> Ready for Issue
  -> Partially Issued
  -> Fulfilled
```

Approval does not reduce stock.

The approver can approve full or partial quantities, but each approved quantity must be:

```text
0 <= approved quantity <= requested quantity
```

Each decision records:

- Decision.
- Approver.
- Timestamp.
- Comments.
- Approved quantities.

Department Heads are scoped to their own department/requested records by the backend.

---

## 9. SIV/ISIV and Stock Issue

### 9.1 Preliminary voucher

An issue voucher can be created only from an approved requisition.

The preliminary voucher contains:

- SIV or ISIV reference.
- Source requisition.
- Requesting department.
- Store.
- Item lines.
- Approved quantities.
- Preliminary status.

Creating a preliminary voucher does not reduce stock.

### 9.2 Amendment

Before posting, authorized users may amend eligible line quantities.

An amendment records:

- Previous quantity.
- New quantity.
- Item.
- Reason.
- User.
- Timestamp.

After amendment, the voucher returns to approval.

Posted vouchers cannot be amended through the normal amendment endpoint.

### 9.3 Voucher approval

An approver confirms the preliminary voucher. The voucher moves to `Approved`.

Approval does not reduce inventory.

### 9.4 Final posting

The final posting action performs these operations atomically:

1. Lock the voucher.
2. Confirm that it is approved.
3. Load voucher lines.
4. Lock each item.
5. Confirm sufficient available stock.
6. Consume FIFO cost layers.
7. Decrease item quantity on hand.
8. Update voucher line unit costs.
9. Create `Issue` stock transactions.
10. Decrease bin-card balances.
11. Mark the voucher as `Posted`.
12. Mark the requisition as `Fulfilled` where appropriate.
13. Record audit information.
14. Commit.

If stock is insufficient, no item is changed and the transaction is rolled back.

---

## 10. Material Returns and SRN

### 10.1 Return request

A return request contains:

- Department.
- Item.
- Quantity.
- Original SIV reference.
- Return reason.
- Condition.
- Return date.

The return begins without increasing stock.

### 10.2 Inspection and approval

The reviewer records:

- Approved quantity.
- Findings.
- Recommendation.
- Evaluator.
- Evaluation timestamp.

The backend validates that:

- Approved quantity is positive.
- Approved quantity does not exceed requested quantity.
- Approved quantity does not exceed the previously issued quantity for the department and item.

### 10.3 Return posting

Only an approved return increases inventory.

The posting operation:

1. Locks the return and item.
2. Adds the approved quantity to item stock.
3. Creates a return FIFO layer at the current item cost.
4. Creates a `Return` stock transaction.
5. Updates the bin card.
6. Marks the return `Returned to Stock`.
7. Records an audit event.
8. Commits.

Damaged, obsolete, or unusable material should not be returned to normal available stock without the applicable business decision.

---

## 11. Store-to-Store Transfers

### 11.1 Transfer request

A transfer request identifies:

- Source store.
- Destination store.
- Item.
- Quantity.
- Transfer date.
- Destination bin.

The backend validates that the item belongs to the source store and that the stores are different.

### 11.2 Transfer lifecycle

```text
Pending
  -> Approved
  -> Dispatched
  -> Received
  -> Completed
```

### 11.3 Dispatch

At dispatch:

1. Lock the transfer.
2. Lock the source item.
3. Validate source quantity.
4. Consume FIFO cost layers.
5. Decrease source stock.
6. Create `Transfer-Out` transaction.
7. Decrease source bin balance.
8. Store transfer cost.
9. Record dispatch actor and timestamp.
10. Move status to `Dispatched`.

### 11.4 Destination receipt

At receipt:

1. Lock the transfer.
2. Find or create the destination item identity.
3. Use the stored transfer cost.
4. Increase destination stock.
5. Create a destination FIFO lot.
6. Create `Transfer-In` transaction.
7. Increase the destination bin balance.
8. Record receiving actor and timestamp.
9. Move status to `Completed`.

Both sides use the same transfer reference for traceability.

---

## 12. Stock Taking and Reconciliation

### 12.1 Creating a session

A stock-taking session selects:

- Store.
- Count date.
- Items.
- Bins where available.
- Physical quantities.
- Count reason where applicable.

At creation, the backend takes a system quantity snapshot. The snapshot is not a direct rewrite of current inventory.

### 12.2 Variance calculation

For each counted item:

```text
Variance = Physical Quantity - System Quantity
```

Examples:

- Positive variance: physical surplus.
- Negative variance: physical shortage.
- Zero variance: records match.

### 12.3 Approval

The session must be submitted and approved before adjustment posting.

Approval records:

- Approver.
- Approval timestamp.
- Approved status.

### 12.4 Adjustment posting

The posting action:

1. Locks the approved session.
2. Loads all counted lines.
3. Requires a reason for each non-zero variance.
4. Locks each item.
5. For a positive variance, creates an additional FIFO lot.
6. For a negative variance, consumes FIFO lots.
7. Updates item quantity on hand.
8. Creates an `Adjustment` stock transaction.
9. Updates the bin card.
10. Stores the adjustment reference.
11. Closes the session.
12. Records an audit event.
13. Commits.

A closed session should not be silently edited.

### 12.5 Reconciliation report

The reconciliation report shows:

- Session reference.
- Store.
- Item.
- Bin.
- System quantity.
- Physical quantity.
- Variance.
- Reason.
- Adjustment reference.
- Session status.

---

## 13. Disposal Workflow

The intended disposal lifecycle is:

```text
Condition or Shelf-Life Alert
  -> Disposal Flag
  -> Disposal Request
  -> Review
  -> Approval
  -> Execution
  -> Inventory Removal
  -> Audit
```

Possible disposal reasons include:

- Expired.
- Obsolete.
- Damaged.
- Unsafe.
- Beyond economical repair.
- Unusable.

Approval and execution should be separate. Inventory should be removed only at execution, through a `Disposal` stock transaction.

Historical disposal records and stock transactions should remain traceable.

---

## 14. Gate-Pass Verification

Security verifies physical movement against a system document.

Supported documents may include:

- Goods receipts.
- Issue vouchers.
- Material transfers.

Before verification, the backend checks that:

- The document exists.
- The document has an eligible status.
- The document has not already been verified.

The verification transaction records:

- Security officer.
- Document reference.
- Verification time.
- Verification status.
- Audit event.

Security verification does not create or modify stock quantities.

---

## 15. Notifications

Notifications are relevant to workflow queues such as:

- Pending evaluation.
- Pending requisition approval.
- Pending transfer approval.
- Pending return review.
- Low stock.
- Expiry warnings.
- Disposal action.
- Stock-taking variance.
- Gate verification.

The frontend currently combines persisted notifications with derived notifications based on live records. Persisted notifications are user-scoped and can be marked as read.

A notification normally links to the relevant business page.

---

## 16. Business Rules Configuration

Administrators can configure selected system rules through the Business Rules page.

Examples include:

- Shelf-life warning days.
- Critical shelf-life days.
- Transfer stock timing.
- Whether partial issue is allowed.
- Whether a return inspection is required.
- Variance tolerance.
- Required variance reason.
- Gate-pass requirements.
- FIFO mode.
- System currency.

Rules are stored in the `business_rules` table and exposed through protected APIs.

The frontend Items page uses the configured shelf-life warning days and falls back to a default when the configuration endpoint is unavailable.

Business rules that depend on organizational policy should be confirmed by stakeholders before production use.

---

## 17. Audit Trail

Important operations create audit records.

Audit information may include:

- User ID.
- User name.
- User role.
- Action.
- Module.
- Entity type.
- Entity ID.
- Entity reference.
- Description.
- Outcome.
- Before data.
- After data.
- Changes.
- Metadata.
- Timestamp.

Examples:

```text
Created GRN
Approved evaluation
Generated GRN
Approved requisition
Created preliminary SIV
Amended SIV
Posted issue
Approved return
Completed transfer
Posted stock adjustment
Verified gate pass
Updated business rule
```

The audit log is intended to be append-only from the application. Users should not directly create, edit, or delete audit records.

---

## 18. Reporting

The frontend Reports page provides operational views such as:

- Current inventory balance.
- Stock card.
- Bin card.
- Low and reorder stock.
- Stock movement.
- Stock variance.
- Expiring items.
- Goods receipt status.
- GRN report.
- Material evaluation.
- Requisition status.
- SIV/ISIV status.
- Department consumption.
- Transfers.
- Returns.
- Fixed assets.
- Asset assignments.
- Disposal.
- Supplier transactions.
- Inventory valuation.
- FIFO valuation.

Reports are intended to be filtered, printed, and exported where supported.

Operational reports should be based on posted transactions and linked source documents rather than manually typed balances.

---

## 19. Error Handling and Rollback

### 19.1 Validation errors

Invalid requests should return a consistent error response, for example:

```json
{
  "message": "Quantity must be positive."
}
```

Typical validation failures include:

- Missing required fields.
- Unknown item.
- Unknown store.
- Invalid status transition.
- Negative quantity.
- Insufficient stock.
- Wrong source store.
- Duplicate GRN.
- Duplicate gate verification.
- Unauthorized action.

### 19.2 Database rollback

Stock operations use the following pattern:

```text
BEGIN
  Lock records
  Validate business rules
  Update inventory
  Insert ledger entries
  Update FIFO lots
  Update bins
  Insert audit record
COMMIT
```

If any statement throws an error:

```text
ROLLBACK
```

This prevents partial stock updates.

---

## 20. Database Setup

The backend contains:

- `schema.sql`: canonical database structure.
- `seed.sql`: synthetic demo data.
- Numbered migration files for additive changes.

Typical setup:

```powershell
cd backend
npm install
npm run db:schema
npm run db:seed
npm start
```

Environment variables should provide at least:

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
```

Migration scripts are available for individual additions such as:

```powershell
npm run db:migrate:locations
npm run db:migrate:master-data
npm run db:migrate:receiving
npm run db:migrate:issue-vouchers
npm run db:migrate:stock-history
npm run db:migrate:requisition-history
npm run db:migrate:returns
npm run db:migrate:transfers
npm run db:migrate:stock-taking
npm run db:migrate:business-rules
npm run db:migrate:notifications
npm run db:migrate:issue-amendments
```

The database must be backed up before applying migrations in a real environment.

---

## 21. Running the Frontend

Typical commands:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses:

```text
VITE_API_BASE_URL=http://localhost:4000/api
```

The browser application normally runs on the Vite development port, while the backend runs on port `4000`.

---

## 22. Important Current Implementation Notes

The system contains substantial workflow support, but the following areas should still be verified with a real PostgreSQL database and stakeholder testing before production:

- All migrations must be applied in order.
- Demo data must be checked against the latest schema.
- Supplier IDs should be used consistently by all receipt paths.
- Store and department ownership rules should be confirmed.
- Partial issue and transfer timing rules should be confirmed.
- Disposal approval and physical execution should remain separate.
- Security gate verification should be tested with approved and rejected documents.
- Persisted notifications should be generated by all required business events.
- Database integration tests should cover rollback behavior.
- Frontend unit and browser workflow tests should be added.

The frontend build and backend syntax tests are useful baseline checks, but they do not replace database integration tests or user acceptance testing.

---

## 23. End-to-End Demonstration Checklist

### Receiving

```text
Login as Storekeeper
  -> Create receipt
  -> Move receipt to evaluation
  -> Login as TEC
  -> Review and accept or partially accept
  -> Login as Store Head or authorized operator
  -> Generate GRN
  -> Verify inventory, FIFO lot, stock card, bin card, and audit
```

### Issue

```text
Login as Department Head
  -> Create requisition
  -> Submit requisition
  -> Login as approver
  -> Approve full or partial quantities
  -> Create preliminary SIV/ISIV
  -> Amend if required
  -> Approve voucher
  -> Post voucher
  -> Verify FIFO deduction and stock records
```

### Return

```text
Create SRN
  -> Link original SIV
  -> Inspect condition
  -> Enter approved quantity and findings
  -> Approve return
  -> Verify return transaction and stock increase
```

### Transfer

```text
Create transfer request
  -> Approve
  -> Dispatch from source store
  -> Verify source decrease
  -> Receive at destination store
  -> Verify destination increase
  -> Verify source and destination transaction references
```

### Stock Taking

```text
Create counting session
  -> Enter physical quantities
  -> Review variances
  -> Record reasons
  -> Approve session
  -> Post adjustments
  -> Verify adjustment ledger entries
  -> Review reconciliation report
```

### Gate Verification

```text
Open approved issue or transfer document
  -> Security verifies it
  -> System records officer and timestamp
  -> Verify that no stock quantity is independently changed
```

---

## 24. Definition of Correct Operation

The system is operating correctly when:

- Every user is authenticated.
- Every action is authorized on the backend.
- Every workflow follows valid status transitions.
- Receipts do not become available before acceptance and GRN posting.
- Issues cannot exceed approved quantities or available stock.
- Returns cannot exceed previously issued quantities.
- Transfers update source and destination records consistently.
- Stock-taking never overwrites balances directly.
- Every stock movement has a ledger entry.
- FIFO layers reflect real posted movements.
- Bin cards reflect physical location movement.
- Audit records identify who, what, when, where, why, and the source document.
- Failed transactions roll back completely.
- Reports reflect posted operational data.

This transaction-driven behavior is the foundation of the Stock Management System.
