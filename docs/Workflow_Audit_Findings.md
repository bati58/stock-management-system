# Stock Management System — Consolidated Workflow Audit (Step 1 Deliverable)

Audit of the existing React + Express + PostgreSQL system against
`Stock_Management_System_Final_End_to_End_Workflow_Refactoring_Master_Prompt.md`.
Read-only audit; no code changed to produce this. Evidence is `file:line`.

## Executive summary

The system has a **strong foundation**: a central workflow state machine
(`backend/src/utils/workflow.js`), a centralized front+back RBAC matrix, and a
fully transactional stock service (FIFO + stock card + bin card, atomic under
`withTransaction`). Creating receipts/requisitions/SIVs correctly does **not**
move stock; posting/execution does. Sidebar routes all resolve; unauthorized API
calls return 403.

The failures cluster around **one systemic root cause** plus a set of
separation-of-duties holes, a few stock-integrity bugs, and missing
features. The single highest-leverage issue is:

> **Status-vocabulary mismatch** — controllers *create* records with one status
> while the frontend *gates CTAs* on a different status. Result: brand-new
> records dead-end with only a `[View]` button — exactly the §34 symptom.

## CRITICAL (stock integrity / security / core workflow broken)

| # | Area | Gap | Evidence | Spec |
|---|------|-----|----------|------|
| C1 | Workflow (systemic) | Create-status ≠ CTA-gating status → dead-end records. Requisition created `Draft`, UI approves only `Pending`. Transfer created `Pending`, UI/`remove()` key off `Pending Approval`. Goods receipt created `Pending`, advance CTA gated on `Submitted`. Gate pass filters `Issued` but post sets `Posted`. | requisitions.controller.js:86 vs RequisitionList.jsx:256; materialTransfers.controller.js:47 vs MaterialTransferList.jsx:164,237; goodsReceipts.controller.js:60 vs GoodsReceiptList.jsx:141; GatePassVerification.jsx:65 vs stockService.js:252 | §34, §30 |
| C2 | RBAC / SoD | `ACTION_PERMISSIONS['goods-receipts']=[ADMIN,STORE_HEAD,STOREKEEPER,TEC]` gates **both** `/evaluate` and `/generate-grn`. So Storekeeper can evaluate its own receipt, and **TEC can post stock** via `/generate-grn`→`generateGrnAndPost`. | permissions.js:59; routes/index.js:110-111 | §32 |
| C3 | Reports | `Reports.jsx` never calls `reportService`; it fetches raw list endpoints and recomputes every report + KPIs client-side, including a JS re-implementation of FIFO. All 12 backend report endpoints + `/reports/export-csv` are dead code. | Reports.jsx:121-141,174-211; services/index.js:67-82 | §25 |
| C4 | Stock integrity | `postStockTaking` does `newQty = current qty_on_hand + stored variance`. Variance is snapshotted at create; any receipt/issue before posting corrupts the adjustment (final ≠ physical count). | stockService.js:541,551 | §21 |
| C5 | Stock integrity | `decideMaterialReturn` on Approve adds qty to stock + FIFO + bin card **without reading `condition`** → Damaged/Obsolete returns auto-enter available stock. | stockService.js:300-347 | §17 |
| C6 | Receiving | `generateGrnAndPost` creates the GRN **and** posts inventory in one call, setting `GRN Generated`. Spec wants separate `Generate GRN`(→Generated) then `Post Stock`(→Posted). No `Generated`/`Posted` states exist. | stockService.js:133-161; schema.sql:144 | §6, §8, §29 |

## HIGH

| Area | Gap | Evidence | Spec |
|------|-----|----------|------|
| Workflow | No **Return for Correction** anywhere (requisition, transfer, disposal, issue voucher, goods receipt). | requisitions.controller.js:148; workflow.js; materialTransfers | §2,§34 |
| Receiving | Store Head review stage (Verify Docs / Return / Send to TEC) absent; TEC **On Hold** / **Return for Correction** decisions absent. | goodsReceipts.controller.js:94,137; workflow.js:4-10 | §6,§7 |
| Issue Voucher | `amend` moves voucher to `Pending Approval`, which then shows **no** Approve/Post CTA → dead status. No reject/return/submit endpoints. | IssueVoucherList.jsx:138; stockService.js:231; routes:151-153 | §13 |
| Notifications | No backend `notify` for: requisition approved→Storekeeper, SIV submitted→approver, transfer approved→source/dest, disposal approved→executor. Masked by **browser-only** fake notifications (localStorage). | requisitions/issueVouchers/materialTransfers/disposals controllers; buildNotifications.js | §26 |
| RBAC | Stock Clerk can `/stock-taking/:id/post` (posts balances). Storekeeper can approve own transfer. `reports` READ excludes Storekeeper/Security but frontend shows Reports → 403. | permissions.js:69,62; permissions.js:53 vs navConfig.js:117,155 | §32 |
| Disposal | No two-step Review→PAO approval; `execute` captures no date/method/qty/witnesses/remarks/evidence (no columns); executed rows show only `[View]`; 4 dead statuses. | disposals.controller.js:75-94; stockService.js:575-618; DisposalList.jsx:168-180 | §20,§34 |
| Fixed Assets | No register-from-GRN; missing serial/location/condition/department/custodian; no Assign-Custodian→User-Card; no custody-transfer workflow/history; hard delete of disposed assets. | fixedAssets.controller.js; schema.sql:337-350 | §23,§24 |
| User Cards | Not linked to real SIV/asset; only Edit/Delete; missing View/Assign/Transfer/Return/History/Print; no `In Custody`. | userCards.controller.js; UserCardList.jsx:100 | §16 |
| Shelf-Life | Entire feature absent — no controller/endpoint/page/nav; only a static client-side "Expiring Items" block in Reports. | routes/index.js; App.jsx; navConfig.js | §19 |
| Reconciliation | Page is report-only (Export CSV); no Review/Investigate/Recount/Approve/Reject actions. | ReconciliationList.jsx:100-106; routes:127 | §22 |
| Master data | `items` has no `active` column → cannot deactivate, only hard delete. | schema.sql:58-83; items.controller.js | §4 |
| Reports | Missing endpoints: shelf-life, per-item stock-card, bin-card, user-cards, stock-taking. | reports.controller.js | §25 |
| Stock/Bin cards | No Trace Source / Print / Export CTAs; ledger omits store/actor/reason/source columns. | StockCardList.jsx; BinCardList.jsx | §9,§10 |

## MED / LOW (traceability & polish)

- No per-record **workflow-history timeline**; `/audit-logs` is a global dump with no `entityType`/`entityId` filter. Many `logAudit` calls omit ids/entity refs. (§35)
- Stock-taking not in the state machine; has dead statuses (`Pending Approval`,`Posted`,`Rejected` unused); no Verify/Recount/Investigate/Reject actions; approved session with unreasoned variance can never post. (§21)
- Goods-receipt drops `type`/`docRef`/`condition` from the UI; partial-acceptance qty never reaches the printed GRN. (§6)
- Bin transfer has no lifecycle/status and doesn't validate destination bin exists. (§11)
- Category delete uses FK `ON DELETE SET NULL` → orphans items' `category_id`. (§4)
- Notification CTA routes to `/requisitions/:id` etc. which have no detail route → NotFound. (§26)
- Wrong-actor / mistimed notifications on goods receipt (TEC notified at creation, PAO on evaluate). (§26)

## What already works (do NOT re-fix)

- Stock mutations are atomic and system-generated only; `stock_transactions`/FIFO
  lots/bin cards are never directly writable. Negative-balance guards present.
- Create receipt / approve requisition / create preliminary SIV do **not** move stock.
- GRN blocked from rejected receipts; double-GRN prevented.
- Return qty ≤ previously-issued qty enforced; transfer both legs share one ref;
  transfer dispatch guards source stock.
- Backend `requireRole` enforces authorization independently (403); sidebar links
  all resolve to protected routes.
- Deactivate exists for stores/categories/locations/suppliers/departments.

## Proposed phased plan (maps to Master Prompt §36)

- **Phase 1 — Workflow foundation:** reconcile status vocabulary across
  schema CHECK ↔ `workflow.js` ↔ controllers ↔ frontend gating; add
  `Return for Correction`; put stock-taking in the state machine. *(fixes C1 + several High)*
- **Phase 2 — RBAC separation of duties:** split goods-receipt `evaluate` vs
  `post` action keys (TEC evaluates, Store Head posts); remove Storekeeper from
  transfer-approve, Stock Clerk from stock-taking-post; reconcile `reports` READ. *(C2)*
- **Phase 3 — Receiving:** split Generate GRN vs Post Stock (+`Generated`/`Posted`);
  Store Head review; TEC On-Hold/Return; capture type/docRef/condition. *(C6)*
- **Phase 4 — Stock-integrity bugs:** fix `postStockTaking` stale variance (C4);
  gate material-return posting on Reusable condition (C5).
- **Phase 5 — Notifications:** backend `notify` for all critical events; demote
  browser-only notifications to cosmetic. *(fixes notifications High)*
- **Phase 6 — Reports:** wire `Reports.jsx` to backend `reportService`; add
  missing report endpoints. *(C3)*
- **Phase 7 — Disposal:** two-step Review→PAO approval, execution-evidence
  capture, executed-record drill-downs, `Completed` end state.
- **Phase 8 — Assets & custody:** register-from-GRN, custody fields, Assign
  Custodian→User Card, transfer-custody workflow + history; user-card lifecycle.
- **Phase 9 — Shelf-life module:** dashboard + Review/Flag/Quarantine/Transfer/
  Initiate-Disposal + configurable thresholds.
- **Phase 10 — Traceability & polish:** stock/bin-card Trace/Print/Export,
  reconciliation actions, per-record workflow-history timeline, `items.active`,
  delete guards, notification detail routes.

Phases 1–6 cover every Critical + the core workflow/RBAC/notification/report
integrity the spec centers on. Phases 7–10 are larger, partly net-new features.
