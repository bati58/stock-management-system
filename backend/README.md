# Stock Management System — Backend

Node.js / Express / PostgreSQL REST API implementing `Backend-SRS.docx` in
full: every entity, endpoint, role permission, and stock-quantity business
rule (FIFO valuation, GRN→evaluation, requisition→issue, returns,
transfers, disposal) described in that document.

This is built to match the already-existing frontend's expected API
contract exactly — connect it and the frontend needs zero code changes.

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running locally, or a connection string to a hosted instance)

## 2. Setup

```bash
cd sms-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/sms_db
JWT_SECRET=<replace with a long random string>
```

Create the database (if it doesn't exist yet):

```bash
createdb sms_db
# or, from the psql shell: CREATE DATABASE sms_db;
```

Build the schema and load demo data:

```bash
npm run db:schema
npm run db:seed
```

## 3. Run it

```bash
npm run dev
```

API is live at `http://localhost:4000`. Check `http://localhost:4000/health`
for a quick liveness check.

## 4. Demo login

Every seeded user's password is **`sms1234`**:

```
admin | pao | storehead | storekeeper | clerk | tec | depthead | accountant
```

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sms1234"}'
```

## 5. Connect the frontend

In the frontend project, create `.env`:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

Then, per the frontend's own README ("Connecting to the real backend"),
switch `src/services/entityService.js` to call `apiClient.js`'s
`api.list/get/create/update/remove` instead of the mock `localDb.js`, and
switch `AuthContext.jsx`'s `login()` to call `api.login()`. No other
frontend file needs to change — every field name in this API's JSON
responses matches the frontend's existing field names exactly.

## 6. Project structure

```
src/
  app.js, server.js        Express app setup and entry point
  config/db.js             PostgreSQL pool + withTransaction() helper
  db/
    schema.sql             Full DDL for all 20 tables
    seed.sql                Demo data matching the frontend's seed.js
    runSql.js               Runs a .sql file against DATABASE_URL
  middleware/
    auth.js                 JWT verification
    authorize.js             Role permission enforcement (requireRole)
    errorHandler.js          Consistent { message } error responses
  utils/
    permissions.js           THE role x resource matrix (Backend-SRS §4)
    refGenerator.js           Safe concurrent GRN-2026-0001 style numbering
    audit.js                  logAudit() helper, called by every mutation
    AppError.js, asyncHandler.js
  services/
    stockService.js           ALL quantity-mutating business logic (§6):
                               FIFO consumption, GRN approval, issue
                               voucher generation, returns, transfers,
                               disposal — each wrapped in one DB transaction
  controllers/                One file per resource; _helpers.js holds
                               shared name<->ID resolution and DB row ->
                               camelCase JSON mappers
  routes/index.js             Every endpoint, each wrapped in
                               requireAuth + requireRole(resource)
```

## 7. Design notes worth knowing before you modify this

- **`stockService.js` is the only place that changes `items.qty_on_hand`.**
  Every workflow (GRN approval, issue voucher creation, return approval,
  transfer approval, disposal approval, bin transfer) goes through it. If
  you add a new way for stock to move, put the logic there, not in a
  controller — this is what keeps `stock_transactions`, `bin_cards`, and
  `items.qty_on_hand` from ever drifting out of sync with each other.
- **Every multi-step mutation runs inside `withTransaction()`.** A half-
  completed GRN approval (stock updated but the ledger row failed to
  insert, for example) is worse than one that fails cleanly and can be
  retried — that's why every service function takes a transaction
  `client`, never the plain pool.
- **FIFO is real**, not a single `unitPrice` field. `stock_lots` tracks
  each receipt as its own priced lot; `consumeFifo()` walks lots oldest-
  first on every issue, transfer, and disposal, per MoFED manual §5.4.
- **Reference numbers (`GRN-2026-0004` etc.) are generated server-side**
  with row-level locking (`ref_sequences` + `FOR UPDATE` semantics via the
  upsert in `refGenerator.js`), specifically because a client-generated
  number can't be trusted not to collide under concurrent users.
- **Authorization lives in exactly one file** (`utils/permissions.js`).
  Every route in `routes/index.js` is wrapped in `requireRole(resource)`,
  which reads that file. Don't add `if (req.user.role === ...)` checks
  inside controllers — extend the matrix instead, so the frontend's
  `permissions.js` and this file can be kept in sync by inspection.

## 8. Known gaps (carried over from Backend-SRS §10)

- No `store_id` on `users` yet — a true "Store Head sees only their store"
  scoping isn't implemented in `dashboard-summary`. Add the column and a
  `WHERE store_id = ...` filter once that association is confirmed.
- `material_returns.department` is free text, not validated against the
  submitting user — same caveat as above for the Department Head dashboard
  filtering.
- No `expiryDate` on `items` — shelf-life monitoring (original use case 23)
  isn't implemented.
