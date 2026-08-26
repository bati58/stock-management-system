# 

## Objective

Use this document as the final operational reference for auditing and
refactoring the existing Stock Management System.

The system is already built with React + Node.js/Express + PostgreSQL.
Do **not** rebuild it from scratch. Inspect the current implementation,
preserve working functionality, and fix only gaps, conflicts, dead ends,
incorrect permissions, broken routes, missing CTAs, incomplete
workflows, and frontend/backend/database integration problems.

The final system must satisfy this rule:

> Every operational record must have a valid status, responsible actor,
> permitted next action, working CTA, real backend endpoint, correct
> PostgreSQL transaction, audit entry, notification where required, and
> clear next status.

------------------------------------------------------------------------

# 1. Core Actors

Use these operational actors:

1.  Administrator
2.  Property Administration Officer (PAO)
3.  Store Head
4.  Storekeeper
5.  Stock Clerk
6.  Technical Evaluation Committee (TEC)
7.  Department Head
8.  Accountant
9.  Security Officer

The Administrator may have broad system-management privileges, but Admin
actions must still pass through the same business rules, stock service,
transactions, audit trail, and workflow history. "Admin can do
everything" must never mean bypassing stock integrity or silently
changing posted history.

------------------------------------------------------------------------

# 2. Global Workflow Rule

For every workflow record, the UI and backend must be able to answer:


Current status:
Responsible actor:
What is waiting:
Allowed action:
CTA:
API endpoint:
Validation:
Database change:
Stock effect:
Audit:
Notification:
Next status:


There must be **no dead status**.

For example, `Draft` must normally have
`[Edit] [Submit] [Delete Draft]`.

`Pending Approval` must have actions for the authorized approver such as
`[Review] [Approve] [Reject] [Return for Correction]`.

`Approved` must expose the next operational action, such as
`[Generate]`, `[Post]`, `[Dispatch]`, `[Register]`, or `[Execute]`.

`Completed`/`Executed` should normally expose
`[View] [Print] [Trace Transaction] [Audit]`, not ordinary edit/delete.

------------------------------------------------------------------------

# 3. System-Wide Transaction Architecture

All stock-changing operations must follow:

React CTA
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
Business/service layer
  ↓
PostgreSQL transaction
  ↓
Inventory balance
  ↓
FIFO/cost layer where applicable
  ↓
Stock Card
  ↓
Bin Card
  ↓
Operational transaction
  ↓
Audit
  ↓
Notification
  ↓
API response
  ↓
Frontend refresh
```

A failure at any required database step must rollback the complete stock
operation.

Never allow:

-   frontend success while DB failed
-   DB success while frontend reports failure
-   stock changed without stock-card/binary ledger trace
-   direct manual editing of posted stock balances
-   a workflow button that only changes frontend state
-   a button that calls an unrelated endpoint

------------------------------------------------------------------------

# 4. Workflow: Inventory Setup

## Stores

Actors: Administrator, PAO, Store Head where authorized.

Store types can include Main Store, Department Store, and other approved
organizational stores.

Actions:

-   Create
-   View
-   Edit
-   Activate/Deactivate
-   Manage Locations
-   View Inventory
-   View Transactions

Do not delete a store with operational history.

## Categories

Maintain categories and applicable store types.

Actions:

-   Create
-   View
-   Edit
-   Activate/Deactivate
-   Search/Filter

## Items

Item master must support receiving, issuing, returning, transferring,
shelf-life monitoring, asset registration, and stock control.

Actions:

-   Create
-   View
-   Edit
-   Activate/Deactivate
-   View Stock
-   View Stock Card
-   View Bins
-   View Transactions

Do not delete an item with historical transactions.

## Locations

Support the physical hierarchy where required:


Store → Section → Rack → Shelf → Bin


Actions:

-   Create
-   Edit
-   Activate/Deactivate
-   Assign
-   View Balance
-   View History

------------------------------------------------------------------------

# 5. Workflow: Supplier Management

Actors: PAO, Administrator, authorized Store Head.

Actions:

-   Create Supplier
-   View
-   Edit
-   Activate/Deactivate
-   View Supplier Receipts
-   View Supplier History

Goods receipts should reference a supplier master record where supplier
involvement applies.

------------------------------------------------------------------------

# 6. Workflow: Goods Receipt

### Example

A supplier delivers:


A4 Paper: 100 boxes
Dell Laptop: 10
PO: PO-2026-0012
Delivery Note: DN-2026-0088


### Step 1 --- Receive

Actor: Storekeeper.

CTA:

`Create Goods Receipt`

Status:

`Draft`

Capture:

-   supplier
-   purchase/donation reference
-   delivery document
-   items
-   quantities
-   condition
-   temporary location
-   documents

**Important:** creating a receipt does NOT increase available stock.

### Step 2 --- Submit

Storekeeper:

`Submit for Evaluation`

Backend:

-   validates
-   saves submission
-   changes status
-   audits
-   notifies next actor

### Step 3 --- Store Head review

Store Head sees:

`Pending Evaluation`

CTAs:

-   View
-   Verify Documents
-   Return for Correction
-   Send to TEC

`Send to TEC` → `Under Technical Evaluation`.

### Step 4 --- TEC evaluation

TEC sees the record and must have a real:

`Evaluate` CTA.

Record:

-   findings
-   accepted quantity
-   rejected quantity
-   condition
-   specification compliance
-   evidence
-   remarks
-   evaluator
-   date

Possible outcomes:

-   Approved
-   Rejected
-   Partially Approved
-   On Hold

Example:


Received = 100
Accepted = 95
Rejected = 5


Only 95 can proceed.

### Step 5 --- GRN

Authorized actor:

`Generate GRN / Model 19`

GRN must link to:

-   receipt
-   supplier
-   purchase/donation reference
-   evaluation
-   accepted quantities
-   store
-   locations

### Step 6 --- Post accepted stock

Authorized store actor:

`Post Stock`

Atomic update:

Inventory +95
FIFO layer +95
Stock Card IN +95
Bin Card IN +95
Receipt/GRN transaction
Audit
Notification


The receipt itself must never silently post inventory.

------------------------------------------------------------------------

# 7. Workflow: Technical Evaluation

Actor: TEC.

The evaluation page must not be view-only.

For each eligible receipt:


Pending
→ Start Evaluation
→ Record Findings
→ Decide


CTAs may include:

-   Start Evaluation
-   Approve
-   Reject
-   Partially Approve
-   On Hold
-   Return for Correction
-   View Evidence
-   View History

After decision:

-   receipt status changes
-   evaluation is saved
-   audit is created
-   next actor is notified

Evaluation history must remain traceable.

------------------------------------------------------------------------

# 8. Workflow: GRN Documents

GRN page must provide real actions according to status:


Accepted
→ Generate GRN
→ Review
→ Print/Download
→ Post Accepted Stock
→ Trace Receipt/Evaluation/Stock


No GRN may be generated from a rejected or unaccepted receipt.

------------------------------------------------------------------------

# 9. Workflow: Automatic Stock Card

Stock Cards are system-generated ledger records, not manually editable
balances.

Example:

Opening             0
GRN IN             +95
SIV OUT            -20
SRN IN              +5
Transfer OUT       -10
Adjustment OUT      -2
Closing             68


Each transaction should show:

-   date/time
-   reference
-   transaction type
-   quantity in/out
-   balance
-   store
-   location
-   actor
-   reason/source

CTAs:

-   View
-   Filter
-   Trace Source Document
-   Print
-   Export

No ordinary user should directly edit posted stock-card transactions.

------------------------------------------------------------------------

# 10. Workflow: Bin Card

Bin Cards represent location-specific perpetual inventory.

Example:

Bin MAIN-A-01
A4 Paper

GRN-001   IN   95
SIV-004   OUT  20
SRN-002   IN    5
TRF-003   OUT  10

Balance = 70
```

The system must automatically create/update bin records and transaction
history.

CTAs:

-   View
-   Transfer
-   Trace Source
-   Print/Export

No direct manual balance editing.

------------------------------------------------------------------------

# 11. Workflow: Bin-to-Bin Transfer

Example:


Source Bin = A
Destination Bin = B
Quantity = 20
```

Flow:


Draft
→ Submit
→ Approval if required
→ Execute Transfer
→ Completed
```

Validate:

-   source bin exists
-   destination bin exists
-   source != destination
-   item matches
-   sufficient quantity

Atomic update:


Source Bin -20
Destination Bin +20
Stock/location transaction
Stock Card
Bin Card
Audit
```

A pending record must identify exactly who is responsible for the next
action.

------------------------------------------------------------------------

# 12. Workflow: Store Requisition

Example:

Electrical Engineering requests:


A4 Paper = 20
Laptop = 2
```

### Requester


Draft
→ Edit
→ Submit
```

### Department Head

Pending Approval
→ Review
→ Approve
→ Reject
→ Return for Correction
→ Partially Approve
```

Example:

A4 Paper requested 20 → approved 15
Laptop requested 2 → approved 1
```

Approved requisition becomes:

`Ready for Issue`.

**Approval must not reduce stock.**

------------------------------------------------------------------------

# 13. Workflow: Preliminary SIV / ISIV Model 20

After an approved requisition:

Actor: Storekeeper/authorized issuer.

CTA:

`Create Preliminary SIV`

Status:

`Draft`

Actions:

-   Edit
-   Validate
-   Submit for Approval

Approver:

-   Review
-   Approve
-   Reject
-   Return for Correction
-   Amend/Request Amendment

Creating a preliminary SIV must NOT reduce stock.

------------------------------------------------------------------------

# 14. Workflow: Final SIV / ISIV Model 22

After SIV approval:


Approved
→ Generate Final SIV
→ Verify quantities
→ Post Issue
→ Issued/Completed
```

Only `Post Issue` reduces stock.

Validate:

-   approved requisition
-   approved SIV
-   valid recipient
-   authorized issuer
-   sufficient stock
-   valid store/location
-   valid quantity

Atomic update:


Inventory -Q
FIFO consumed
Stock Card OUT
Bin Card OUT
Issue transaction
Audit
Notification
```

------------------------------------------------------------------------

# 15. Workflow: Gate Pass Verification

Actor: Security Officer.

Security does not create the stock issue. Security verifies authorized
physical movement.

Example:


SIV-2026-0031
Laptop ×1
Recipient: Employee A
```

Security sees:

`Pending Gate Verification`

CTAs:

-   View SIV
-   Verify Document
-   Verify Item/Quantity
-   Verify Recipient
-   Verify Authorization
-   Approve Gate Pass
-   Reject/Hold

Successful verification:

`Gate Verified`.

The CTA must call a real backend endpoint and persist the verification.

------------------------------------------------------------------------

# 16. Workflow: User Material Card

Example:


Employee: Tesfaye
Asset: Dell Latitude 5420
Serial: DL-001
Source: SIV-2026-0031
Status: In Custody
```

Actions:

-   View
-   Assign
-   Transfer Custody
-   Return
-   View History
-   Print

The user card must be linked to actual issue/assignment/return
transactions.

------------------------------------------------------------------------

# 17. Workflow: Material Return / SRN 

Example:

Employee returns:


Laptop ×1
Reason: Defective
```

Flow:


Draft
→ Submit Return
→ Pending Inspection
→ Inspect
→ Technical Evaluation if required
→ Approve/Reject
→ Determine Condition
→ Post Approved Reusable Quantity
→ Completed
```

Possible condition:

-   Reusable
-   Damaged
-   Repair Required
-   Obsolete
-   Disposal Recommended

Only approved reusable material enters available stock.

Example:


Returned = 1
Reusable = 1
Stock +1
```

Damaged material must not automatically become available stock.

Returned quantity must never exceed previously issued quantity.

------------------------------------------------------------------------

# 18. Workflow: Material Transfer Between Stores

Example:

Main Store transfers:


A4 Paper ×50
```

to Department Store.

Flow:

Draft
→ Submit
→ Pending Approval
→ Approve/Reject/Return
→ Approved
→ Dispatch
→ In Transit
→ Destination Receive
→ Completed
```

Actors:

-   source store staff initiate/dispatch
-   authorized approver approves
-   destination storekeeper receives

At dispatch, follow the approved stock-timing rule.

At destination receipt, record destination stock.

Every source and destination transaction must share the same transfer
reference.

CTAs must change according to status:

### Pending Approval


[Review] [Approve] [Reject] [Return]
```

### Approved


[View] [Dispatch]
```

### In Transit


[View] [Receive]
```

### Completed


[View] [Trace] [Print]
```

A `Pending` record with only a View icon is incomplete unless the
responsible actor is explicitly external/not assigned.

------------------------------------------------------------------------

# 19. Workflow: Shelf-Life Monitoring

System monitors:

-   expiry
-   remaining shelf life
-   slow-moving stock
-   dormant stock
-   overstock
-   damaged/obsolete/quarantine stock

Dashboard should show:

Expiring Soon
Expired
Slow Moving
Dormant
Overstock
```

Actions:

-   Review
-   Flag
-   Quarantine
-   Transfer
-   Initiate Disposal

Thresholds should be configurable where required.

------------------------------------------------------------------------

# 20. Workflow: Disposal Management

This is a critical area to refactor.

A record such as:


DSP-2026-0003
A4 Paper
Qty 3
Status: Executed
```

must not be a dead-end modal.

### Step 1 --- Flag

Authorized store staff:

`Flag for Disposal`

Status:

`Flagged`

### Step 2 --- Create disposal request

CTA:

`Create Disposal Request`

Status:

`Pending Review`.

### Step 3 --- Review

Responsible reviewer:

-   Review
-   Approve for Request
-   Reject
-   Return for Correction

### Step 4 --- Approval

Authorized PAO/approver:

Approve
Reject
Return for Correction
```

Approval should normally NOT immediately remove stock.

### Step 5 --- Execution

Authorized executor:


Execute Disposal
```

Capture:

-   execution date
-   method
-   quantity
-   witnesses/committee information if required
-   remarks
-   evidence/document

CTA:

`Confirm Execution`

Only execution removes inventory:


Inventory OUT
Stock Card OUT
Bin Card OUT
Disposal Transaction
Audit
Notification
```

### Step 6 --- Completion


Completed
```

Historical record remains permanently traceable.

Executed/completed records should provide:

-   View
-   Print
-   Trace Stock Transaction
-   View Approval
-   View Audit
-   View Execution Evidence

Do not delete disposal history.

------------------------------------------------------------------------

# 21. Workflow: Stock Taking

Flow:


Create Session
→ Start
→ Physical Count
→ Compare System vs Physical
→ Investigate Variance
→ Recount if required
→ Verify
→ Approve Adjustment
→ Post Adjustment
→ Close
```

Example:

System = 100
Physical = 96
Variance = -4
```

Physical count must NOT overwrite inventory directly.

After approval:


Adjustment -4
Stock Card adjustment
Audit
```

Closed sessions cannot be silently edited.

------------------------------------------------------------------------

# 22. Workflow: Reconciliation

Example:

System = 100
Physical = 96
Variance = -4
Approved Adjustment = -4
Final = 96
```

Pending reconciliation should have:

-   Review
-   Investigate
-   Request Recount
-   Approve Adjustment
-   Reject

Approved reconciliation:

-   Post Adjustment

Posted reconciliation:

-   View
-   Trace Stock Transaction
-   Print

If the page is only a report but the business process requires
approval/posting, the page is incomplete.

------------------------------------------------------------------------

# 23. Workflow: Fixed Assets

Accepted fixed-asset receipt:

GRN
→ Asset Registration
→ Register Asset
→ Assign Custodian
→ User Material Card
```

Register:

-   asset number
-   serial number
-   acquisition date/value
-   location
-   condition
-   department
-   custodian

Do not delete an asset record because it was disposed.

Asset history must remain.

------------------------------------------------------------------------

# 24. Workflow: Asset Movement / Custody

Example:

Laptop ASTU-LT-001
Employee A
```

Transfer custody:

Employee A
→ Transfer Custody
→ Employee B
→ Approve/Verify where required
→ History
```

Keep:

-   old custodian
-   new custodian
-   old location
-   new location
-   date
-   reason
-   authorizer

------------------------------------------------------------------------

# 25. Workflow: Reports

Reports must use real posted backend data.

Main reports:

-   Inventory
-   Stock Movement
-   Stock Card
-   Bin Card
-   Goods Receipt
-   GRN
-   Requisitions
-   Issues
-   Returns
-   Transfers
-   Stock Taking
-   Reconciliation
-   Fixed Assets
-   User Material Cards
-   Disposal
-   Shelf-Life
-   Valuation
-   Audit

Where appropriate:

-   date filters
-   store filters
-   department
-   item
-   status
-   actor
-   search
-   pagination
-   export
-   print
-   source-document links

------------------------------------------------------------------------

# 26. Notifications

Notifications must originate from real backend workflow events.

Examples:


Receipt submitted
→ Store Head/TEC notification

Evaluation completed
→ PAO/Store Head notification

Requisition submitted
→ Department Head notification

Requisition approved
→ Storekeeper notification

SIV submitted
→ Approver notification

Transfer approved
→ Source/Destination notification

Disposal approved
→ Disposal Executor notification

Stock-taking variance
→ Store Head/Approver notification
```

Notification CTA must open the correct page and record.

No fake browser-only notification state for critical workflow events.

------------------------------------------------------------------------

# 27. Dashboard Requirements

Each actor should see role-specific work queues.

## Storekeeper

-   pending receipts
-   accepted receipts
-   items awaiting put-away
-   stock levels
-   low stock
-   pending issues
-   returns
-   transfers
-   stock-taking tasks

Quick actions:

-   New Goods Receipt
-   Process Issue
-   Process Return
-   Bin Transfer
-   Receive Transfer

## Store Head

-   receipts awaiting review
-   TEC evaluation status
-   GRNs
-   requisitions
-   issues
-   returns
-   transfers
-   stock-taking
-   disposal
-   stock alerts

Quick actions must lead to actual operations.

## TEC

-   receipts awaiting evaluation
-   returns awaiting technical evaluation
-   evaluation history

CTA:

`Start Evaluation`.

## PAO

-   approvals
-   GRNs
-   SIV approvals
-   transfers
-   disposals
-   stock-taking approvals
-   asset registration
-   audit/compliance

Every KPI should link to the actual queue.

------------------------------------------------------------------------

# 28. Sidebar Integrity

Every sidebar element must open its corresponding page.

Required test:

Click Sidebar
→ Correct URL
→ Correct component
→ Correct page title
→ Correct API request
→ Correct backend endpoint
→ Correct database data
→ Correct permissions
→ Correct CTAs
```

No sidebar item may:

-   redirect to dashboard unexpectedly
-   open an unrelated module
-   show a blank page
-   show a page with no data
-   show a page with no valid actions
-   contain non-functional buttons

------------------------------------------------------------------------

# 29. CTA Audit Matrix

For every operational page create a matrix like:

  ----------------------------------------------------------------------------------------------------
  Module           Status      Actor            CTA          Backend      DB/Stock      Next Status
                                                                          Effect        
  ---------------- ----------- ---------------- ------------ ------------ ------------- --------------
  Goods Receipt    Draft       Storekeeper      Submit       submit       status        Pending
                                                             receipt                    Evaluation

  Evaluation       Pending     TEC              Start        start        evaluation    Under Review
                                                Evaluation   evaluation                 

  Evaluation       Under       TEC              Approve      decision     evaluation    Accepted
                   Review                                                               

  GRN              Accepted    PAO/authorized   Generate     create GRN   GRN           Generated

  GRN              Generated   Storekeeper      Post Stock   post stock   inventory +   Posted
                                                                          ledger        

  Requisition      Draft       Requester        Submit       submit SR    status        Pending
                                                                                        Approval

  Requisition      Pending     Dept Head        Approve      approve SR   approval      Approved

  SIV              Draft       Storekeeper      Submit       submit SIV   status        Pending
                                                                                        Approval

  SIV              Approved    Authorized       Post Issue   issue stock  inventory OUT Issued
                               issuer                                                   

  Return           Draft       Store            Submit       submit       status        Pending
                                                             return                     Inspection

  Return           Pending     Reviewer         Inspect      inspect      inspection    Under Review
                                                             return                     

  Disposal         Approved    Executor         Execute      execute      inventory OUT Executed
                                                             disposal                   

  Stock Taking     In Progress Clerk            Submit Count count        physical      Pending
                                                                          count         Verification

  Reconciliation   Pending     Approver         Approve      approve      approval      Ready to Post
                                                             variance                   

  Transfer         Pending     Approver         Approve      approve      status        Approved
                                                             transfer                   

  Transfer         Approved    Source Store     Dispatch     dispatch     source stock  In Transit
                                                                          effect        

  Transfer         In Transit  Destination      Receive      receive      destination   Completed
                                                                          stock         
  ----------------------------------------------------------------------------------------------------

Use the existing project's actual endpoint names rather than inventing
endpoints.

------------------------------------------------------------------------

# 30. No Dead Status Audit

Search the whole project for statuses such as:

-   Draft
-   Pending
-   Submitted
-   Under Review
-   Approved
-   Rejected
-   In Progress
-   In Transit
-   Ready
-   Executed
-   Completed

For each occurrence determine:

Who owns it?
Why is it there?
What is the next action?
Which CTA exposes that action?
Which endpoint handles it?
Which DB rows change?
Which notification is generated?
What is the next status?
```

If a status has no valid answer, refactor it.

------------------------------------------------------------------------

# 31. Page-Level Audit

For every page check:

## Route

-   sidebar route correct
-   direct URL works
-   protected route works
-   role authorization works

## Data

-   real API
-   loading state
-   empty state
-   error state
-   pagination/filtering where needed

## Actions

-   correct actor sees CTA
-   unauthorized actor does not
-   CTA calls real endpoint
-   backend validates permission
-   operation persists
-   UI refreshes

## Workflow

-   status correct
-   next actor clear
-   next action clear
-   history available
-   notification generated

## CRUD

Master-data pages:

-   Create
-   Read
-   Update
-   Activate/Deactivate
-   Search
-   Filter

Workflow pages:

-   Create Draft
-   View
-   Submit
-   Approve
-   Reject
-   Return for Correction
-   Execute/Post
-   Complete
-   Print
-   Trace

Do not expose ordinary Delete on posted/immutable operational records.

------------------------------------------------------------------------

# 32. Role/Permission Audit

Frontend role filtering is not sufficient.

For every operation verify both:


Frontend permission
+
Backend authorization
```

Examples:

-   Storekeeper can prepare operational records but cannot approve their
    own approval stage unless policy explicitly allows it.
-   TEC evaluates technical acceptance, not stock posting.
-   Department Head approves departmental requisitions.
-   PAO handles organizational/property approvals assigned to that role.
-   Security verifies gate movement, not inventory posting.
-   Accountant receives financial/reporting visibility appropriate to
    the system.
-   Clerk performs assigned stock-record/counting operations but should
    not directly alter posted balances.
-   Admin can administer the system while preserving business controls.

------------------------------------------------------------------------

# 33. Database Integrity Audit

For each stock-changing operation verify:

### Goods Receipt

``` text
Receipt
Evaluation
GRN
Inventory
FIFO
Stock Card
Bin Card
Audit
Notification
```

### Issue


Requisition
SIV
Inventory OUT
FIFO
Stock Card
Bin Card
User Material Card where applicable
Audit
Notification
```

### Return


SRN
Inspection
Evaluation
Approval
Inventory IN only for approved reusable quantity
Stock Card
Bin Card
Audit
```

### Transfer


Transfer Request
Approval
Dispatch
Source transaction
Destination receipt
Destination transaction
Stock Cards
Bin Cards
Audit
```

### Disposal


Flag
Request
Approval
Execution
Inventory OUT
Stock Card
Bin Card
Disposal record
Audit
```

### Stock Taking


Session
Physical Count
Variance
Verification
Approval
Adjustment
Stock Card
Audit
Reconciliation
```

------------------------------------------------------------------------

# 34. Critical UI Problems to Correct

The supplied screenshots demonstrate a common issue:

A record is visible with a status such as `Pending`, `Draft`, or
`Executed`, but the modal/page exposes only a View icon.

This must be corrected.

## Example: Transfer

Instead of:


Status: Pending
[View]
```

show:


Status: Pending Approval
Responsible: PAO

[Review]
[Approve]
[Reject]
[Return for Correction]
```

If pending dispatch:


Status: Approved
Responsible: Source Storekeeper

[View]
[Dispatch]
```

If in transit:


Status: In Transit
Responsible: Destination Storekeeper

[View]
[Receive]
```

## Example: Requisition

Draft:

[Edit]
[Submit]
[Delete Draft]
```

Pending approval:

[Review]
[Approve]
[Reject]
[Return for Correction]
```

Approved:


[View]
[Prepare SIV]
```

## Example: Disposal

Approved:


[View Approval]
[Execute Disposal]
```

Executed:


[View]
[Print]
[Trace Stock Transaction]
[Audit]
```

------------------------------------------------------------------------

# 35. Workflow History

Every major workflow should display a timeline:

Created
↓
Submitted
↓
Reviewed
↓
Approved / Rejected
↓
Document Generated
↓
Posted / Executed
↓
Completed
```

Each event should show:

-   actor
-   role
-   date/time
-   previous status
-   new status
-   action
-   comment/reason
-   reference

------------------------------------------------------------------------

# 36. Refactoring Procedure

Do not blindly modify the whole application.

Use this sequence:

### Step 1 --- Audit

Produce:

-   route matrix
-   sidebar matrix
-   actor matrix
-   status matrix
-   CTA matrix
-   API matrix
-   DB table matrix
-   stock movement matrix

### Step 2 --- Fix workflow foundation

-   central statuses
-   transition validation
-   authorization
-   audit
-   transaction handling

### Step 3 --- Fix receiving

-   receipt
-   evaluation
-   GRN
-   stock posting

### Step 4 --- Fix stock records

-   stock cards
-   bin cards
-   locations
-   FIFO

### Step 5 --- Fix requisition/issue

-   requisition lifecycle
-   approval
-   SIV Model 20
-   amendment
-   final SIV Model 22
-   posting

### Step 6 --- Fix returns

-   SRN
-   inspection
-   evaluation
-   approval
-   stock return

### Step 7 --- Fix transfers

-   request
-   approval
-   dispatch
-   transit
-   receipt
-   completion

### Step 8 --- Fix stock taking/reconciliation

-   count
-   variance
-   investigation
-   approval
-   adjustment
-   closure

### Step 9 --- Fix assets

-   registration
-   assignment
-   custody
-   movement

### Step 10 --- Fix shelf-life/disposal

-   monitoring
-   flagging
-   request
-   approval
-   execution
-   completion

### Step 11 --- Fix notifications/reports

### Step 12 --- Full regression

Test all actors, all sidebars, all pages, all CTAs, all API routes, and
all stock operations.

------------------------------------------------------------------------

# 37. Mandatory End-to-End Test Scenarios

## Scenario A --- New Goods

Storekeeper
→ Create Receipt
→ Submit
→ Store Head Review
→ Send to TEC
→ TEC Evaluate
→ Accept/Partial Accept
→ Generate GRN
→ Post Stock
→ Inventory Updated
→ Stock Card Updated
→ Bin Card Updated
→ Audit
→ Notification
```

## Scenario B --- Requisition to Issue


Requester
→ Draft Requisition
→ Submit
→ Department Head
→ Approve
→ Storekeeper
→ Preliminary SIV
→ Submit
→ Approver
→ Approve
→ Generate Final SIV
→ Post Issue
→ Inventory OUT
→ Stock Card OUT
→ Bin Card OUT
→ User Material Card
→ Security Gate Verification
→ Completed
```

## Scenario C --- Return


Return Request
→ Submit
→ Inspection
→ TEC if required
→ Approve
→ Determine Condition
→ Reusable → Stock IN
→ Damaged → Quarantine/Repair/Disposal
→ Audit
→ Notification
```

## Scenario D --- Store Transfer


Transfer Request
→ Approval
→ Dispatch
→ In Transit
→ Destination Receive
→ Destination Stock IN
→ Source/Destination Stock Cards
→ Bin Updates
→ Completed
```

## Scenario E --- Disposal


Flag
→ Disposal Request
→ Review
→ Approval
→ Execute
→ Inventory OUT
→ Stock Card OUT
→ Bin Card OUT
→ Disposal Transaction
→ Audit
→ Completed
```

## Scenario F --- Stock Taking


Create Session
→ Physical Count
→ Variance
→ Investigation
→ Verification
→ Approval
→ Adjustment Posting
→ Reconciliation
→ Close
```

------------------------------------------------------------------------

# 38. Final Definition of Done

Do not declare the system complete merely because it builds.

It is complete only when:

### Navigation

-   every sidebar item opens its own page
-   no incorrect dashboard redirects
-   no blank/dead routes

### UI

-   every operational status has appropriate CTAs
-   buttons work
-   forms validate
-   modals show complete operational information
-   current actor and next action are clear

### RBAC

-   actors see only permitted modules/actions
-   backend independently enforces authorization
-   unauthorized operations return 403

### Backend

-   every CTA maps to a real endpoint
-   validation is server-side
-   business rules are enforced
-   errors are meaningful

### Database

-   every operation persists
-   stock changes are atomic
-   rollback works
-   posted records remain traceable
-   history is preserved

### Stock

Every movement is traceable:


Source Document
→ Operational Transaction
→ Inventory Balance
→ Stock Card
→ Bin Card
→ Audit
```

### Workflow

Every operational record has:


Status
→ Responsible Actor
→ CTA
→ Backend Action
→ Database Change
→ Audit
→ Notification
→ Next Status
```

### Reports

Reports reflect posted backend transactions rather than cosmetic
frontend totals.

------------------------------------------------------------------------

# 39. MASTER COMMAND FOR THE CODING AGENT

Act as a senior full-stack engineer, business analyst, inventory
workflow architect, PostgreSQL architect, QA engineer, and security
engineer.

Audit the existing Stock Management System against this specification
and the project's existing SRS, manual, and mentor requirements.

Do not rewrite working modules unnecessarily.

For each module inspect:

1.  frontend route/page
2.  sidebar visibility
3.  actor permissions
4.  status model
5.  CTAs
6.  API endpoint
7.  controller
8.  service/business logic
9.  PostgreSQL tables
10. transaction behavior
11. stock effects
12. audit
13. notifications
14. workflow history
15. next status

First report the gaps. Then implement/refactor the gaps in controlled
phases.

Never create fake CTAs.

Never allow frontend-only business rules.

Never bypass the stock service.

Never allow premature stock posting.

Never allow unauthorized approval.

Never allow deletion of posted operational history.

Never leave Draft/Pending/Approved/Executed records without a valid next
action or a clearly documented reason for waiting.

After each phase run appropriate tests before proceeding.

At the end report:

-   fixed modules
-   fixed routes
-   fixed CTAs
-   actor/permission changes
-   backend endpoints changed
-   database/migrations changed
-   stock integrity changes
-   notifications changed
-   tests passed
-   remaining gaps
-   known risks

The final goal is a completely connected operational system where a
transaction can be followed from initiation through approval, execution,
stock posting, audit, notification, and completion without dead-end
pages.
