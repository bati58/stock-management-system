# Technical Audit — Institutional Stock Management System

> **Audit date:** 2026-08-25
> **Auditor role:** Senior full-stack architect / codebase auditor
> **Method:** Full-repository static analysis (read-only). No production code was modified. The only command executed was a **read-only** `bcrypt.compareSync` check (touched no project files) to confirm the seed-credential finding.
> **Verdict:** Well-architected **advanced prototype**, not production-ready. The stock engine is genuinely strong, but two P0 defects make a freshly-seeded system unusable and its core invariant violable. **Overall production-readiness: 57/100.**

---

## Table of Contents
- [A. Executive Summary](#a-executive-summary)
- [B. Architecture Overview & Data Flow](#b-architecture-overview--data-flow)
- [C. Technology Stack](#c-technology-stack)
- [D. Database Analysis](#d-database-analysis)
- [E. Feature Inventory](#e-feature-inventory)
- [F. Workflow Traces](#f-workflow-traces)
- [G. Security Audit](#g-security-audit)
- [H. Code Quality Audit](#h-code-quality-audit)
- [I. Findings Register (prioritized)](#i-findings-register-prioritized-with-paths)
- [J. Production-Readiness Scores](#j-production-readiness-scores-0100)
- [K. Gap Analysis](#k-gap-analysis)
- [L. Missing Institutional Features](#l-missing-institutional-features)
- [M. Recommended Refactoring Plan & Scope](#m-recommended-refactoring-plan--estimated-scope)

---

## A. Executive Summary

A React 18 + Vite SPA over a Node/Express + PostgreSQL (raw `pg`, no ORM) backend implementing an institutional store workflow: goods receipt → technical evaluation → GRN → requisition → issue voucher → returns/transfers/disposals, plus bin cards, FIFO valuation, stock-taking, fixed assets, gate-pass, audit log, and role-based dashboards for 9 actors.

### Biggest strengths
- **`services/stockService.js` is the standout.** Every mutation runs inside `withTransaction`, takes pessimistic `SELECT … FOR UPDATE` locks on items/lots/bin-cards/document rows, performs **real FIFO** (`consumeFifo`, oldest-first), and checks non-negativity *before* consuming. Concurrent oversell and double-posting are correctly prevented.
- Concurrency-safe server-side reference numbering (`refGenerator.js`, atomic upsert).
- Centralized workflow state machine (`utils/workflow.js`), rich audit schema, login lockout + rate limiting + helmet + CORS allowlist + bcrypt, and a clean, config-driven frontend.

### Biggest problems
- **P0 — Seeded logins are broken.** The shared bcrypt hash in `seed.sql` does **not** match `sms1234` (verified: `bcrypt.compare → false`). After `npm run db:reset`, **no user can log in**, including `admin`. No self-registration + no bootstrap path = total lockout.
- **P0 — Stock-truth invariant is violable.** `items.controller.js` writes `qty_on_hand` directly (create, update) outside the stock service — no lock, no ledger, no FIFO, no bin card, no audit. Reachable from the Items UI and by 3 roles via the API.
- **P1 cluster:** negative-quantity documents *increase* stock; indefinite JWT refresh defeats session expiry; issue-voucher over-issue (duplicate vouchers + unbounded amend); stock-taking applies stale variances; CSV formula injection; fail-open authorization for unknown resources.
- **Near-zero automated testing** (one backend state-machine test; no frontend tests).

---

## B. Architecture Overview & Data Flow

**Shape:** Classic 3-tier SPA.

```
┌─────────────────────── Browser (React 18 + Vite SPA) ───────────────────────┐
│  main.jsx: ErrorBoundary > BrowserRouter > Toast > Auth > Notification > App  │
│  App.jsx: flat route table, all pages behind ProtectedRoute → DashboardLayout │
│  Pages ──► services/*.js (entityService factory) ──► services/apiClient.js    │
│  Client-side RBAC: utils/rolePermissions.js  (advisory; gates UI + routes)    │
│  Auth state: AuthContext (localStorage: sms_token JWT + sms_session_user)     │
└───────────────────────────────────┬──────────────────────────────────────────┘
                     fetch, Bearer JWT │ (auto-refresh on 401)
┌───────────────────────────────────▼──────────────────────────────────────────┐
│ Express API (app.js → routes/index.js)                                        │
│  helmet · CORS allowlist · express.json · rate-limit(login) · /health         │
│  requireAuth (JWT verify) ──► requireRole(resource[, 'action'])               │
│                                    │ reads utils/permissions.js (server RBAC)  │
│  Controllers (thin) ──► services/stockService.js (ALL stock mutations)        │
│                    └──► utils/{refGenerator,audit,notify,workflow}, _helpers   │
│  errorHandler (maps PG codes) · notFoundHandler                               │
└───────────────────────────────────┬──────────────────────────────────────────┘
                     pg Pool (withTransaction) │
┌───────────────────────────────────▼──────────────────────────────────────────┐
│ PostgreSQL — schema.sql + migrations/001_operational_extensions.sql           │
│  Stock truth kept in FOUR synchronized places (see §D)                        │
└────────────────────────────────────────────────────────────────────────────┘
```

**Representative data flow (stock-out / issue voucher):** Requisition approved → `POST /issue-vouchers` (`createPreliminaryIssueVoucher`) → approve → `POST /issue-vouchers/:id/post` → `postIssueVoucher` opens a transaction, locks the item row, checks `qty_on_hand ≥ issueQty`, runs `consumeFifo`, decrements `items.qty_on_hand`, writes a `stock_transactions` ledger row + `bin_cards` movement, marks the voucher `Posted` and the requisition `Fulfilled` — all atomically.

### Key architectural observations
1. **Thin controllers, fat service** for stock — good separation. Non-stock CRUD is direct SQL in controllers.
2. **Two independent RBAC matrices** (`backend/utils/permissions.js` + `frontend/utils/rolePermissions.js`), coupled only by role **string literals**, already drifted (see §G).
3. **Name-based denormalization** throughout: the API speaks names (store name, department name, item name), resolved to IDs via `_helpers.resolve*Id`. Simplifies the client contract but is fragile (collisions, renames).
4. **No shared types / OpenAPI / validation schema** between tiers.

---

## C. Technology Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite 5, react-router-dom 6, Tailwind 3, lucide-react, recharts |
| Backend | Node.js, Express 4 (CommonJS), `pg` 8 (raw SQL, no ORM) |
| Auth | jsonwebtoken 9 (JWT, 8h), bcryptjs 2 |
| Hardening | helmet 8, cors 2, express-rate-limit 7 |
| DB | PostgreSQL (schema.sql + one additive migration) |
| Tests | `node --test` (1 file); no frontend test runner |
| Dead/unused | `zod` (dependency, **never imported**); duplicate npm script (`package.json:11-12`); frontend `lint` script but **no eslint installed/configured** |

---

## D. Database Analysis

**~40 tables.** Integer `SERIAL` PKs throughout. FKs are declared with explicit `ON DELETE RESTRICT / SET NULL / CASCADE`. Good use of `CHECK` constraints and targeted indexes.

### Core entities & relationships (selected)

| Table | PK | Key FKs | Notable constraints |
|---|---|---|---|
| `users` | id | department_id→departments (SET NULL) | `role` is free **TEXT** (no FK, no enum); lockout fields |
| `stores` | id | — | `head_of_store` is **TEXT** (joined to users by name) |
| `items` | id | category_id, store_id, location_id | **`qty_on_hand NUMERIC(14,2) CHECK (qty_on_hand >= 0)`**; `UNIQUE(code, store_id)` |
| `stock_lots` | id | item_id | FIFO layers: `qty_received`, `qty_remaining` |
| `stock_transactions` | id | item_id, store_id | append-only ledger; stores `balance` snapshot per row |
| `bin_cards` | id | store_id, item_id | `UNIQUE(bin, store_id, item_id)`, running `balance` |
| `goods_receipts`→`goods_receipt_items`→`grns`→`grn_items` | id | supplier_id, store_id, item_id | evaluation fields; `grns.goods_receipt_id UNIQUE` |
| `requisitions`→`requisition_items`/`_approvals` | id | department_id, item_id | approval qty tracking |
| `issue_vouchers`→`_items`/`_amendments` | id | item_id | `status` default `'Issued'` (see below) |
| `material_returns` / `material_transfers` / `disposals` | id | item_id, store_id | workflow status per doc |
| `stock_taking_sessions`→`_items` | id | store_id, item_id | `UNIQUE(session_id,item_id,bin)` |
| `audit_logs` | id | — | rich: `before_data`/`after_data`/`changes` JSONB, IP, outcome |
| `business_rules`, `notifications`, `user_cards`, `bin_transfers`, `fixed_assets`, `locations`, `suppliers`, `departments`, `ref_sequences` | id | various | — |

**No `roles`/`permissions` tables** — authorization is entirely code-defined (see §G).

### How inventory quantity is calculated & updated — four parallel representations
`stockService.js` keeps all four in lockstep inside one transaction:
1. **`items.qty_on_hand`** — authoritative aggregate; read-modify-write under `FOR UPDATE`.
2. **`stock_transactions.balance`** — per-row balance snapshot (ledger).
3. **`stock_lots.qty_remaining`** — FIFO layers; `addStockLot` / `consumeFifo`.
4. **`bin_cards.balance`** — per-(bin,store,item) running balance + `bin_card_movements` history.

**Assessment:** Sophisticated and, on the service path, correct and race-safe.

**Risks:**
- On-hand is **stored in four places**, not derived from one ledger. Any writer that skips the service desynchronizes them — which `items.controller.js` does (P0-2). There is **no reconciliation/rebuild routine** to detect or repair drift.
- **Model inconsistencies:** `issue_vouchers.status` **defaults to `'Issued'`** in DDL, but the workflow machine starts at `'Preliminary'` and has no `'Issued'` state; `postIssueVoucher` sets `requisitions.status='Fulfilled'` (a status absent from `workflow.js`); `'Ready for Issue'` and issue-voucher `'Rejected'` are dead statuses.
- Heavy denormalization (`supplier` TEXT **and** `supplier_id`; `department` TEXT **and** `department_id`; actor names as TEXT) invites divergence.

---

## E. Feature Inventory

| # | Feature | Status | Notes (file:line) |
|---|---|---|---|
| 1 | Authentication / login | **BROKEN (as seeded)** | Logic sound; seeded hash invalid → nobody can log in (`seed.sql:12-22`) |
| 2 | Goods Receipt → Evaluation → GRN | **NEEDS IMPROVEMENT** | Fresh `Pending` receipt can't be evaluated w/o manual status bump (`stockService.js:113` vs `workflow.js:7`); posting works |
| 3 | Requisition + approval | **COMPLETE** | Range-checked approve; minor `Fulfilled` outside machine |
| 4 | Issue Voucher (stock-out) | **BROKEN / NEEDS IMPROVEMENT** | FIFO decrement correct & race-safe, but no duplicate-voucher guard (`stockService.js:167`) and amend has no upper bound (`:222`) → over-issue |
| 5 | Material Return | **COMPLETE** | Validates vs previously-issued qty; ledger row omits store/bin (`:330-338`) |
| 6 | Material Transfer (store→store) | **COMPLETE** | Dispatch/receive dual update, auto-creates dest item |
| 7 | Bin Transfer (intra-store) | **COMPLETE** | Bin-balance guard under lock |
| 8 | Disposal | **COMPLETE (weak controls)** | Works; **no approver/executor segregation** (`routes:190-191`) |
| 9 | Stock-Taking / variance posting | **NEEDS IMPROVEMENT** | Applies **stale** variance as delta (`:551`); open-session guard wrong (`stockTaking.controller.js:73-79`) |
| 10 | Item master CRUD | **NEEDS IMPROVEMENT (unsafe)** | Direct `qty_on_hand` write bypass (P0-2); weak validation; no pagination |
| 11 | Stores/Categories/Locations/Suppliers/Departments | **PARTIAL** | Suppliers/Departments/Locations have **no DELETE** endpoint |
| 12 | Fixed Assets | **NEEDS IMPROVEMENT** | CRUD works; `status`/`value` unvalidated |
| 13 | Gate Pass verification | **COMPLETE** | Transactional, idempotent, fully audited — best-implemented module |
| 14 | Reports (12 handlers) + CSV | **NEEDS IMPROVEMENT** | Dashboard `pendingReturns` inflated/unscoped (`reports:128-133`); CSV formula injection; INNER-JOIN drops store-less items; no LIMIT |
| 15 | Audit log | **NEEDS IMPROVEMENT** | Rich schema, thin/inconsistent usage; `user-cards` unaudited; hard `LIMIT 500` |
| 16 | Notifications | **COMPLETE (scope)** | User-scoped list + markRead |
| 17 | Business Rules config | **PARTIAL / MISLEADING** | Editable & validated, but **not enforced** in any workflow (only `SHELF_LIFE_WARNING_DAYS` read for a UI badge) |
| 18 | User & role management | **NEEDS IMPROVEMENT (unsafe)** | No role-enum validation, no last-admin/self guards, default pw `sms1234` |
| 19 | Dashboards / role home | **COMPLETE** | Role-aware summary |
| 20 | Reconciliation view | **COMPLETE** | Read-only |

**MISSING (institutional expectations):** password reset/forgot flow; email/SMS notifications; purchase orders / supplier price history / weighted-avg option; budget/GL integration; barcode/QR; attachment storage for evidence; report scheduling/PDF; multi-year period close; data export/import; soft-delete + retention; DB-backed roles/permissions admin UI.

---

## F. Workflow Traces

**1) Login.** `Login.jsx` → `AuthContext.login` → `POST /auth/login`. Backend validates presence, looks up user (LEFT JOIN store by head name), checks `active` + `locked_until`, `bcrypt.compare`, tracks failed attempts (lock after 5 for 15 min), audits with IP, signs JWT (8h) → client stores token + user in `localStorage`. Session rehydrates via `api.me()` with a 5s abort guard. **Broken as seeded** (P0-1): every seeded password fails.

**2) Add item.** `ItemList` form (incl. a **Quantity on Hand** field, `:283`) → `POST /items`. `items.controller.create` inserts `qty_on_hand` from the body directly (`:39`), bypassing the stock service — the opening balance never creates a `stock_lot`, ledger row, or bin card. So a newly-added item's on-hand is invisible to FIFO/valuation until a real receipt posts.

**3) Stock-in (receipt).** `POST /goods-receipts` → evaluate (`recordGoodsReceiptEvaluation`) → `generate-grn` (`generateGrnAndPost`): increments `qty_on_hand`, adds a FIFO lot, writes ledger + bin card, creates `grn_items` — atomic and correct. (Caveat: last-price overwrite of `unit_price`, not weighted average; evaluate-from-`Pending` gap.)

**4) Stock-out (issue) — is invalid stock prevented?** **On the service path, yes.** `postIssueVoucher` (`:244`) checks `qty_on_hand ≥ issueQty` under a row lock, and `consumeFifo` throws if lots are short (`:55`). Same guards on transfers (`:370`) and disposals (`:582`); bin transfers check bin balance (`:502`); `bin_cards` refuses to go negative (`:93`); DB `CHECK(qty_on_hand >= 0)` is the backstop. **But three bypasses defeat it:**
   - (a) `items.controller` direct write (P0-2);
   - (b) **negative document quantities** — missing positive-validation at creation means a negative disposal/transfer qty passes the `<` check, `consumeFifo` no-ops on a negative (`:43-44`), and `newQty = onHand − (negative)` **increases** stock (P1);
   - (c) issue over-issue via duplicate voucher / unbounded amend (P1).

**5) User & role management.** Admin-only (`WRITE_PERMISSIONS.users=[ADMIN]`). `users.controller` create/update/remove: **no validation that `role` is one of the 9**, default password `sms1234`, **no guard against deleting/deactivating the last admin or oneself**. Roles exist only in code (no DB table, no admin UI to manage permissions).

---

## G. Security Audit

**Positives:** parameterized SQL everywhere (**no SQL injection** — the only string-interpolated SQL is a hard-coded status-fragment at `stockService.js:481` and whitelisted identifiers at `gatePass.controller.js`, both safe); bcrypt hashing; login lockout; login rate-limit; helmet; CORS allowlist; `mapUser` strips `password_hash`; no mass-assignment (fixed field destructuring).

### Vulnerabilities & weaknesses

| Sev | Issue | Location |
|---|---|---|
| **P0** | **Seeded credentials invalid** → fresh DB fully locked out (verified `bcrypt.compare=false`) | `seed.sql:12-22` |
| **P0** | **Direct `qty_on_hand` write** bypasses ledger/FIFO/locks/audit; exploitable by Admin/Store Head/Storekeeper | `items.controller.js:39,63` |
| **P1** | **Indefinite session renewal** — `/auth/refresh` uses `ignoreExpiration:true`; client auto-refreshes on 401. 8h expiry is meaningless | `auth.controller.js:150` + `apiClient.js:38-59` |
| **P1** | **Deactivation latency** — `requireAuth` never re-checks `active`; a deactivated user keeps access until token expiry | `middleware/auth.js:15` |
| **P1** | **Negative-qty documents corrupt stock** (missing positive validation) | `disposals/materialTransfers/…controller.js` create |
| **P1** | **CSV formula injection** — leading `= + - @` not neutralized | `reports.controller.js:253`; `auditService.js:117` |
| **P2** | **Fail-open authorization** — unknown resource → `canRead` returns `true` | `permissions.js:108` |
| **P2** | **RBAC drift** — `items` write = `[ADMIN,STORE_HEAD,STOREKEEPER]` (backend) vs Admin-only (frontend) | `permissions.js:80` vs `rolePermissions.js:121,139` |
| **P2** | **No last-admin / self-delete guard**; no role-enum validation; default pw `sms1234` | `users.controller.js:20,24,66` |
| **P2** | **Error message leakage** — raw `err.message` on unmapped errors (500s) | `errorHandler.js:7-9` |
| **P2** | **Weak secrets / config** — weak `JWT_SECRET`; unencoded `@` in `DATABASE_URL` password; no `.env.example` | `backend/.env` |
| **P2** | No password strength policy (change/set) | `auth.controller.js:117`, `users.controller.js:24` |
| **P3** | A few business-rules GET routes lack `requireRole` (config read leak) | `routes/index.js:224,226,227` |
| **P3** | Login page ships demo-account picker w/ known password | `Login.jsx:7-17,45` |

Token is in `localStorage` (XSS-exfiltration risk vs httpOnly cookie) — acceptable for an SPA but worth noting alongside the (present) helmet defaults.

---

## H. Code Quality Audit

**Strengths:** consistent structure; `asyncHandler` wrapping; centralized error handler with PG-code mapping; centralized workflow machine; concurrency-safe ref generator; clean frontend service layer (`entityService` factory); config-driven `CrudPage`; `ErrorBoundary`; defensive session rehydrate.

**Weaknesses:**
- **No validation library** despite `zod` being installed — all validation manual, presence-only, with almost no type/range/enum checks (except `businessRules`).
- **No pagination anywhere** — every list/report is a full-table read; the frontend loads all rows and filters in memory (`CrudPage.jsx:68`, `ItemList.jsx:87`). `audit-logs` hard-capped at `LIMIT 500`.
- **N+1 queries** in list controllers (`goodsReceipts`, `issueVouchers`, `requisitions`, `stockTaking`).
- **Inconsistencies:** `businessRules` returns a `{success,data}` envelope vs bare bodies elsewhere; `req.user.username` vs `req.user.name`; inline mappers in `suppliers`/`departments` vs shared `_helpers`.
- **Audit governance:** non-transactional audit for simple CRUD (committed action can survive a failed audit insert); thin context (actor id/role/entity often NULL); `user-cards` entirely unaudited.
- **Dead code / config:** `zod` unused; duplicate npm script; frontend `lint` script with no eslint; `auditService.js` dead localStorage writer (`logAuditEvent`); dead workflow statuses.
- **Resilience:** `config/db.js` `pool.on('error', ()=>process.exit(1))` crashes the process on a transient pool error.
- **Frontend nit:** `ProtectedRoute` renders "Access Denied" **and** a simultaneous redirect (message can never be read).

---

## I. Findings Register (prioritized, with paths)

### P0 — Blockers
1. Invalid seed password hash → no working logins on a fresh DB. `backend/src/db/seed.sql:12-22`.
2. `qty_on_hand` writable outside the stock service (no lock/ledger/FIFO/audit). `backend/src/controllers/items.controller.js:39,63`; UI vector `frontend/src/pages/items/ItemList.jsx:283,122`.

### P1 — High (correctness/security)
3. Negative-qty documents increase/garble stock. Create handlers in `disposals`/`materialTransfers`/`goodsReceipts`/`requisitions`/`materialReturns` controllers; root cause `stockService.js:43-44,587`.
4. Indefinite JWT refresh. `auth.controller.js:150` + `apiClient.js:38-59`.
5. Deactivated user retains access. `middleware/auth.js:15`.
6. Issue-voucher over-issue: no duplicate-voucher guard (`stockService.js:167`) + unbounded amend (`:222`).
7. Stock-taking applies stale variance as delta; wrong open-session guard. `stockService.js:551`, `stockTaking.controller.js:73-79`.
8. CSV formula injection. `reports.controller.js:253`, `frontend/services/auditService.js:117`.

### P2 — Medium
9. Fail-open authz for unknown resource (`permissions.js:108`).
10. RBAC duplicated across two matrices and already drifted (`permissions.js:80` vs `rolePermissions.js`).
11. No last-admin/self-delete guard; no role-enum validation (`users.controller.js`).
12. GRN evaluate blocked from fresh `Pending` (`stockService.js:113` vs `workflow.js:7`).
13. Disposal has no segregation of duties (`routes/index.js:190-191`).
14. Dashboard `pendingReturns` inflated + unscoped (`reports.controller.js:128-133`).
15. `inventorySummary`/`lowStock` INNER JOIN drops store-less items (`reports.controller.js:10,29`).
16. No pagination; `audit-logs` LIMIT 500 (many files).
17. Manual/absent validation; error-message leakage (`errorHandler.js:7`).
18. Audit gaps + non-transactional CRUD audit; `user-cards` unaudited.
19. `resolveItemId` by name only, no store scope (`_helpers.js`).
20. `business_rules` stored/editable but not enforced.
21. Weak `JWT_SECRET`, unencoded `@` in `DATABASE_URL`, no `.env.example`.

### P3 — Low / nits
Missing DELETE endpoints (suppliers/departments/locations); `businessRules` envelope + `username`/`name` inconsistency; dead statuses/deps/scripts; `ProtectedRoute` message flash; `pool.exit(1)`; no CSV UTF-8 BOM; demo-account picker on login; `disposals.update` non-transactional.

---

## J. Production-Readiness Scores (0–100)

| Area | Score | Rationale |
|---|---:|---|
| Frontend | 62 | Clean, consistent, reusable components; but no pagination, duplicated RBAC, dead code, no tests |
| Backend | 68 | Strong service layer & transactions; weak validation, some correctness bugs, no pagination |
| Database | 74 | Solid schema, good constraints/indexes/FKs, real FIFO ledger; 4-way qty duplication + no reconciliation + denormalization |
| Auth & Security | 46 | Good primitives (bcrypt/lockout/rate-limit) undone by broken seed login, indefinite refresh, fail-open authz, weak secret |
| Stock/Inventory logic | 70 | Engine is excellent; dragged down by the controller bypass, negative-qty & stale-variance bugs, no drift repair |
| API design | 66 | RESTful & mostly consistent; envelope inconsistency, no pagination, a few open routes |
| UI/UX | 61 | Polished login, consistent tables/modals; no pagination UX, access-denied flash, limited validation feedback |
| Error handling | 56 | Good central handler + PG mapping; message leakage, swallowed export errors, `process.exit` |
| Testing | 8 | One backend state-machine test; zero frontend/integration/e2e |
| **Overall** | **57** | Strong core, not production-ready due to P0s + thin validation/testing |

---

## K. Gap Analysis

| Area | Current | Status | Key Problems | Required Work | Priority |
|---|---|---|---|---|---|
| Bootstrap auth | Seed hash invalid | Broken | Fresh DB unusable | Generate real bcrypt hashes at seed time; add idempotent bootstrap admin | **P0** |
| Stock integrity | Direct qty writes | Broken invariant | Bypasses ledger/FIFO | Remove qty from item write path; adjust only via service; add reconciliation job | **P0** |
| Input validation | Manual, sparse | Needs work | Negative/typed values corrupt data & 500s | Adopt `zod` (already installed) at every write; enforce positive qty | **P1** |
| Session mgmt | Indefinite refresh | Insecure | Expiry meaningless; deactivation lag | Bound refresh (rotation/max-age); re-check `active` per request | **P1** |
| Issue controls | Over-issue possible | Needs work | Duplicate vouchers, unbounded amend | One-voucher-per-requisition guard; cap amend ≤ approved | **P1** |
| Stock-taking | Stale-variance delta | Needs work | Wrong on-hand under concurrency | Recompute variance vs live qty at post; freeze session on submit | **P1** |
| Reporting/exports | Full scans, CSV inj. | Needs work | Injection, wrong counts, unbounded | Sanitize CSV; fix dashboard query; LEFT JOINs; paginate | **P1–P2** |
| Authorization | Dual matrices, fail-open | Needs work | Drift; unknown→allow | Single source of truth (ideally DB-backed); default-deny | **P2** |
| User admin | No safeguards | Needs work | Lockout risk; bad roles | Role enum, last-admin/self guards, password policy | **P2** |
| Pagination | None | Missing | Scales poorly | Server-side pagination/filtering + UI | **P2** |
| Business rules | Not enforced | Missing behavior | Config is decorative | Wire rules into workflows or remove | **P2** |
| Testing/CI | ~1 test | Missing | No safety net | Unit (stock service) + integration + a few e2e; CI + eslint | **P2** |
| Observability/config | exit-on-error, weak secrets | Needs work | Fragile, insecure defaults | Strong secrets, `.env.example`, structured logging, health/DB checks | **P2–P3** |

---

## L. Missing Institutional Features

Password reset/forgot; email/SMS notifications; purchase orders + supplier price history + weighted-average valuation option; budget/GL integration; barcode/QR scanning; attachment/evidence storage; scheduled & PDF reports; fiscal-period close; bulk import/export; soft-delete + retention policy; DB-backed role/permission administration UI; multi-store scoping of data per user.

---

## M. Recommended Refactoring Plan & Estimated Scope

**Phase 0 — Unblock (P0), ~0.5–1 day [Small].**
Fix seed hashes (generate real `bcrypt("sms1234")` or a documented password) + idempotent bootstrap admin; remove `qty_on_hand`/`unit_price` from `items` create/update, routing opening balances through an "opening stock" service call that writes lot+ledger+bin card.

**Phase 1 — Correctness & Security (P1), ~1–2 weeks [Medium].**
Introduce `zod` validation on every write (positive-qty enforced); bound/rotate refresh tokens and add per-request `active` re-check; issue-voucher one-per-requisition + amend ceiling; stock-taking live-variance recompute + session freeze; CSV sanitization; fix dashboard/report queries.

**Phase 2 — Hardening & Consistency (P2), ~2–4 weeks [Large].**
Consolidate authorization to a single (ideally DB-backed) source with default-deny; user-admin safeguards + password policy; server-side pagination/filtering end-to-end; wire or remove business rules; complete audit coverage (transactional); strong secrets + `.env.example` + logging + resilient pool; remove dead code/deps.

**Phase 3 — Test & Institutional Features (P2–P3), ~4–8 weeks [Very Large].**
Unit tests for `stockService` (FIFO, locks, guards), integration tests per workflow, a few e2e; CI + eslint; then the institutional feature backlog (password reset, POs/valuation options, notifications, barcode, attachments, reporting, period close) prioritized with stakeholders.

**Total to production-ready core (Phases 0–2): ~4–7 weeks.**
Full institutional parity (incl. Phase 3): **Very Large (2–3+ months).**

---

*End of audit. This document is analysis only; no application code was modified in producing it.*
