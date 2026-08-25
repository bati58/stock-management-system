Stock Management System — Final Amendment & Refactoring Prompt

ROLE

Act as a senior full-stack developer, business analyst, database engineer, QA engineer, and system architect.

You are working on the existing Stock Management System. Do NOT rebuild it from scratch. Preserve working architecture, UI, database, seed/demo data, and business logic unless a change is required to fix a documented gap.

Use the repository documents as the business baseline:

SRS

Mentor amendments/use cases

Stock Management Manual implementation/reference

Existing audit/implementation-plan documents

OBJECTIVE

Perform a complete end-to-end functional audit and corrective refactoring.

Verify the full chain:

Actor → Dashboard → Sidebar → Page → CTA → Frontend API → Backend Route → Controller/Service → PostgreSQL → Response → UI

Every operational module must actually function.

1. AUDIT FIRST

Before modifying code, inspect:

frontend source and routing

backend routes/controllers/services

PostgreSQL schema/migrations/seeds

authentication/RBAC

API contracts

dashboards

every sidebar item

every page and CTA

SRS/mentor/manual requirements

Classify every feature as:
Implemented correctly / Partial / Incorrect / Broken / Missing / Placeholder

Create a gap matrix before implementation.

Do NOT assume a component or route works merely because it exists.

2. ROUTING & SIDEBAR

Every sidebar item must open its own correct page.

Fix:

wrong redirects

unrelated dashboard redirects

missing routes

duplicate routes

wrong page components

incorrect actor navigation

For every actor verify:

Sidebar → correct URL → correct page → correct permission

No module may open an unrelated page.

3. ACTORS & RBAC

For every operational actor defined by the requirements verify:

login

dashboard

sidebar

page access

CRUD permissions

approval/post/execute/verify permissions

reports

notifications

Frontend visibility is not authorization. Backend must independently enforce RBAC and ownership/scoping.

Do not broaden permissions simply to make pages work.

4. DASHBOARDS

Each actor must see a role-appropriate dashboard.

Verify:

KPIs

pending tasks/approvals

stock alerts

recent transactions

workflow queues

notifications

quick actions

permitted reports

Dashboard data must come from backend/PostgreSQL, not hardcoded values.

Every CTA must navigate to the correct operational page.

5. EVERY PAGE

For every page verify:

READ

Real backend data, loading, empty, error, search/filter/pagination where applicable.

CREATE

CTA → form → validation → API → backend validation → PostgreSQL → UI refresh → notification.

UPDATE

Correct record, authorization, validation, persistence, refresh.

DELETE

Only where business rules allow it. Never delete posted operational history, audit history, financial/stock history merely to simplify CRUD.

ACTION CTAs

Every applicable:
Submit, Approve, Reject, Return, Post, Finalize, Execute, Verify, Receive, Dispatch, Complete, Cancel, Transfer, Reconcile, Generate, Print, Export

must actually work.

No dead buttons or placeholder actions.

6. REQUIRED WORKFLOW INTEGRITY

Receiving

Receipt → Submit → Document verification → Technical evaluation → Acceptance/rejection → GRN → Inventory posting → FIFO/cost layer → Stock/bin transaction → Audit → Notification.

Receipt creation must not incorrectly increase available stock before required acceptance/posting.

Requisition

Draft → Submitted → Pending Approval → Approved/Rejected/Partially Approved → Ready for Issue → Partially Issued → Fulfilled/Cancelled.

Enforce department ownership server-side.

SIV/ISIV / Issue

Approved requisition → Preliminary document → Approval/correction → Final document → Final posting → Stock deduction → FIFO → Stock/bin cards → Audit → Gate verification where required.

Do not deduct stock prematurely.

Returns

Issue reference → Return → Quantity validation → Inspection/evaluation → Approval → Condition classification → Stock posting when appropriate → Audit.

Never return more than previously issued. Damaged/obsolete material must not automatically become available stock.

Store Transfers

Request → Approval → Dispatch → Destination receipt → Completion.

Validate source/destination, quantity, authorization, stock timing, audit, and traceability.

Bin Transfers

Source bin → Validation → Transfer → Destination bin.

Update both balances atomically. Preserve history. Prevent unauthorized manual balance edits.

Stock Taking

Session → Physical count → Variance → Investigation → Approval → Adjustment → Reconciliation → Closure.

Physical count must never directly overwrite system stock.

Fixed Assets

Receipt → Asset registration → Serial/location/condition → Assignment → Movement/custody → Verification → Repair/disposal.

Preserve historical asset identity and movement history.

Disposal

Flag → Request → Review → Approval → Execution → Inventory removal → Disposal record → Audit.

Approval must NOT automatically execute disposal.

7. DATABASE & INVENTORY INTEGRITY

Verify all relationships and stock-changing operations.

Check:

inventory balances

stock transactions

FIFO layers

bin balances/history

stores/locations

suppliers

departments

assets

audit

notifications

source-document references

Every stock mutation must use the correct backend transaction/service.

A successful UI response is not enough; confirm PostgreSQL state.

8. API INTEGRATION

For every frontend API call verify:

URL

method

authentication

permission

request body

query parameters

response shape

error handling

For every backend endpoint verify:

Route → Middleware → Controller → Service → PostgreSQL → Response

Remove or repair broken/duplicated/mismatched endpoints safely.

No frontend-only fake functionality.

9. CRUD

Verify complete CRUD where appropriate for master data such as:

stores

departments

suppliers

categories

items

units

locations

sections/racks/shelves/bins

users

roles/permissions

assets

Transactional records must use controlled workflow actions instead of unrestricted CRUD.

10. SECURITY

Verify:

password hashing

JWT/session handling

logout/revocation where applicable

backend RBAC

ownership/scoping

input validation

SQL injection protection

CORS

security headers

rate limiting where appropriate

destructive-operation protection

audit integrity

Never trust frontend permissions.

11. AUDIT

Important mutations should record:

actor/user

role

action

module/entity

record/reference ID

timestamp

outcome

before/after state where appropriate

source document/reference

Posted operational history must remain traceable.

12. NOTIFICATIONS

Notifications must originate from real backend workflow events.

Verify relevant notifications for:

approvals

receipt evaluation

requisitions

SIV

transfers

stock-taking variance

disposal

low stock

expiry

gate verification

assigned tasks

Avoid browser-only fake notification logic.

13. REPORTS

Verify reports:

use real PostgreSQL data

respect actor permissions

support required filters/search/date ranges/pagination

calculate accurate totals

use posted transactions

preserve source-document traceability

export/print correctly where supported

14. UI/UX

Do not redesign the application.

Preserve existing visual style.

Only correct:

broken navigation

wrong pages

missing CTAs

broken forms

misleading labels

missing loading/error/empty states

broken responsive behavior

incorrect role visibility

15. DATA SAFETY

Before DB changes:

inspect current schema

use migrations

preserve existing data

preserve seed compatibility

do not reset PostgreSQL

do not drop tables/columns unless explicitly justified

preserve operational/audit history

16. TESTING

After corrections test:

Frontend

Build, routing, pages, forms, CTAs, actor navigation.

Backend

Startup, routes, validation, authorization, business rules.

Database

Insert/update, constraints, relationships, transactions, rollback, stock balances.

End-to-end

For each actor test representative authorized and unauthorized workflows.

Test both successful and rejected/invalid cases.

17. EXECUTION ORDER

Step 1

Audit the entire existing system.

Step 2

Produce:

Module

Requirement

Current State

Gap

Required Fix

Files

Step 3

Prioritize:

P0: security/data-integrity/broken functionality

P1: actor/workflow/API functionality

P2: reports/notifications/UX

P3: cleanup

Step 4

Implement P0/P1 first.

Step 5

After each change:

run tests

build frontend

verify backend

verify affected PostgreSQL data

verify affected actor workflow

Step 6

Run final regression audit.

SAFETY RULES

Do NOT rebuild from scratch.

Do NOT remove working features.

Do NOT reset PostgreSQL.

Do NOT delete existing operational data.

Do NOT weaken RBAC.

Do NOT create fake frontend-only features.

Do NOT mark a feature complete because a page exists.

Do NOT skip backend/database verification.

Do NOT modify unrelated working modules.

Before major changes, explain affected files and business reason.

FINAL ACCEPTANCE

The system is complete only when:

Every actor can log in.

Every actor sees the correct dashboard.

Every actor sees only authorized sidebar modules.

Every sidebar module opens its correct page.

Every page loads real data.

Applicable CRUD operations work.

Every CTA performs its intended action.

Workflows follow required status lifecycles.

Backend authorization prevents unauthorized actions.

Frontend/backend API contracts match.

Backend operations persist correctly in PostgreSQL.

Stock balances remain consistent.

FIFO/costing remains consistent.

Audit records are generated.

Notifications work where required.

Reports use real data.

No major placeholder/dead pages remain.

No unrelated redirects remain.

Existing working functionality is preserved.

Production builds succeed.

Regression testing passes.

FINAL REPORT

Provide:

Already-correct features

Broken features

Missing features

Modified features

Files changed

Database changes

API changes

RBAC/actor changes

Workflow changes

Remaining gaps

Tests and results

Completion percentage by module

Any unresolved business decisions

Do not stop at an audit. After identifying gaps, safely implement the required fixes and verify them.