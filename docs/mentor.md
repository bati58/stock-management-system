You are acting as a SENIOR BUSINESS ANALYST, SENIOR FRONTEND ARCHITECT,
UI/UX ENGINEER and ENTERPRISE STOCK MANAGEMENT SYSTEM DEVELOPER.

I already have an existing frontend-only Stock Management System project.

IMPORTANT:
DO NOT rebuild the application from scratch.

DO NOT replace the existing UI design.

DO NOT introduce a completely different visual style.

DO NOT redesign the sidebar, header, tables, cards, buttons, forms,
spacing, typography, colors, badges, navigation patterns or overall layout
unless a very small modification is absolutely necessary for functionality.

Your task is to ANALYZE THE EXISTING FRONTEND and EXTEND IT to fully represent
the operational stock-management workflows defined by the project mentor.

The existing frontend is the starting point and must remain visually
consistent throughout the implementation.

============================================================
1. PROJECT CONTEXT
============================================================

This is a university-style Stock Management System.

The system is designed for a university environment containing:

- Main Store
- Department Stores
- Engineering departments
- Applied sciences departments
- Pharmaceutical/laboratory-related departments
- Electrical and Computer Engineering
- Civil and Water Engineering
- Mechanical Engineering
- Chemical Engineering
- Other academic/administrative departments

The exact real institutional data is unknown.

Therefore:

USE REALISTIC DEMONSTRATION DATA.

Do not claim that the demo data represents actual institutional data.

Use realistic university stock-management examples such as:

- Laboratory equipment
- Electrical components
- Mechanical tools
- Chemical/laboratory materials
- Civil engineering materials
- Computer accessories
- Office supplies
- Safety equipment
- Spare parts
- Furniture
- Fixed assets
- Consumables

Use realistic Ethiopian-style currency where financial values are displayed,
but make all data clearly DEMO/MOCK data.

============================================================
2. CURRENT FRONTEND MUST BE PRESERVED
============================================================

The existing application already contains a working visual system.

The current design uses a professional enterprise dashboard style with:

- Left sidebar navigation
- Top header
- User/profile area
- Notification indicator
- Page title and description
- Primary action button
- Search controls
- Data tables
- Status badges
- Cards/statistics
- Modal/form patterns
- Pagination/table patterns
- Footer
- Role information
- Consistent spacing
- Consistent typography
- Existing color palette
- Existing icon system

PRESERVE ALL OF THESE.

Before modifying anything:

1. Inspect the entire source tree.
2. Identify the current routing architecture.
3. Identify reusable components.
4. Identify layout components.
5. Identify table components.
6. Identify form components.
7. Identify modal/dialog components.
8. Identify badge/status components.
9. Identify existing mock-data structures.
10. Identify current navigation structure.
11. Identify existing state-management approach.
12. Identify existing frontend conventions.

Reuse existing components wherever possible.

DO NOT duplicate components unnecessarily.

DO NOT create a second design system.

DO NOT introduce another CSS framework.

DO NOT migrate the project to another framework.

DO NOT change the existing stack unless absolutely required.

============================================================
3. PRIMARY OBJECTIVE
============================================================

Transform the current frontend from a collection of separate management
screens into a CONNECTED STOCK MANAGEMENT BUSINESS PROCESS.

Every major transaction must have a logical lifecycle.

For example:

GOODS RECEIPT
    ↓
TECHNICAL EVALUATION
    ↓
ACCEPT / REJECT
    ↓
GRN
    ↓
STOCK CARD UPDATE
    ↓
BIN CARD UPDATE
    ↓
AVAILABLE STOCK

Similarly:

STORE REQUISITION
    ↓
APPROVAL / REJECTION
    ↓
PRELIMINARY SIV / ISIV
    ↓
AMEND / APPROVE
    ↓
FINAL SIV / ISIV
    ↓
ISSUE MATERIAL
    ↓
STOCK CARD UPDATE
    ↓
BIN CARD UPDATE

RETURN:

ISSUED MATERIAL
    ↓
STORE RETURN REQUEST / SRN
    ↓
EVALUATION
    ↓
APPROVE / REJECT
    ↓
RETURN TO STOCK
    ↓
STOCK CARD UPDATE
    ↓
BIN CARD UPDATE

TRANSFER:

TRANSFER REQUEST
    ↓
APPROVAL / REJECTION
    ↓
SOURCE STORE DISPATCH
    ↓
DESTINATION STORE RECEIPT
    ↓
SOURCE STOCK DECREASE
    ↓
DESTINATION STOCK INCREASE
    ↓
BIN CARD UPDATE

DISPOSAL:

SHELF-LIFE / CONDITION MONITORING
    ↓
DISPOSAL FLAG
    ↓
DISPOSAL REQUEST
    ↓
APPROVAL
    ↓
DISPOSAL WORKFLOW
    ↓
STOCK REMOVAL
    ↓
AUDIT RECORD

The frontend must visually and logically demonstrate these relationships.

============================================================
4. MENTOR'S OFFICIAL OPERATIONAL USE CASES
============================================================

Implement the following mentor-defined use cases.

These are NOT independent pages.

They must be connected into operational workflows.

------------------------------------------------------------
UC-01 — MANAGE STORE INFORMATION
------------------------------------------------------------

Manage:

- Main Store
- Department Stores
- Other authorized stores

Each store should have:

- Store code
- Store name
- Store type
- Department/organizational unit
- Location
- Store head
- Contact information
- Status
- Description

Supported frontend operations:

- View
- Create
- Edit
- Activate
- Deactivate
- Search
- Filter
- View details

Store types may include:

- Main Store
- Department Store
- Specialized Store
- Laboratory Store
- Other Store

------------------------------------------------------------
UC-02 — MAINTAIN ITEM CATEGORIES
------------------------------------------------------------

Allow administrators/authorized users to manage categories.

Examples:

- Office Supplies
- Laboratory Equipment
- Electrical Components
- Mechanical Tools
- Chemical Materials
- Civil Engineering Materials
- Computer Equipment
- Safety Equipment
- Spare Parts
- Furniture
- Consumables
- Fixed Assets

Each category should support:

- Category code
- Name
- Description
- Store applicability
- Active/inactive status

------------------------------------------------------------
UC-03 — MAINTAIN ITEM LOCATIONS
------------------------------------------------------------

Manage the physical location of materials.

Use a hierarchy such as:

Store
 → Section
 → Rack
 → Shelf
 → Bin

Example:

Main Store
 → Electrical Section
 → Rack E-03
 → Shelf 02
 → Bin E03-02-04

Allow users to:

- Create location
- Edit location
- Assign item to location
- Move item
- View occupied locations
- View available locations
- Search locations

------------------------------------------------------------
UC-04 — GOODS RECEIPT RECORD
------------------------------------------------------------

Create a goods receipt record for incoming materials.

Support:

- Purchase
- Donation
- Other approved source

Receipt information should include:

- Receipt reference
- Supplier/source
- Purchase/order reference
- Delivery date
- Store
- Received by
- Material
- Quantity
- Unit
- Condition
- Supporting document
- Fixed/non-fixed asset classification
- Notes
- Status

Possible statuses:

- Draft
- Submitted
- Pending Evaluation
- Under Evaluation
- Accepted
- Partially Accepted
- Rejected
- GRN Generated

Allow the Store Head to notify the Technical Evaluation Committee.

------------------------------------------------------------
UC-05 — EVALUATE MATERIALS FOR ACCEPTANCE
------------------------------------------------------------

Technical Evaluation Committee users must be able to:

- View pending receipts
- Inspect material
- Review specifications
- Record findings
- Approve
- Reject
- Partially approve
- Add remarks
- Attach evaluation information

Evaluation status:

- Pending
- Under Review
- Approved
- Rejected
- Partially Approved

After evaluation:

Receipt status must update.

Property Registration Officer should receive a notification when
material is accepted.

------------------------------------------------------------
UC-06 — GENERATE GOODS RECEIVING NOTE (GRN)
------------------------------------------------------------

For approved materials:

Generate a GRN / Model 19 representation.

The frontend should display:

- GRN number
- Date
- Store
- Supplier
- Source document
- Receipt reference
- Material lines
- Quantity
- Unit
- Unit price
- Total
- Acceptance status
- Store Head
- Technical Evaluation status
- Authorized personnel

Actions:

- View
- Print
- Export/download representation
- Generate GRN
- View linked receipt
- View evaluation

The GRN must be linked visually to the original Goods Receipt.

------------------------------------------------------------
UC-07 — AUTO-UPDATE STOCK CARD
------------------------------------------------------------

Stock Card must NOT be an isolated static page.

It must represent the material transaction history.

Whenever a relevant transaction occurs:

Receipt
Issue
Return
Transfer
Adjustment

the frontend mock state must demonstrate the stock balance changing.

Stock Card should display:

- Item
- Item code
- Store
- Date
- Transaction reference
- Transaction type
- Quantity In
- Quantity Out
- Balance
- Supporting document

Example transaction types:

GRN
SIV
ISIV
SRN
Transfer
Adjustment

------------------------------------------------------------
UC-08 — VIEW STOCK CARD
------------------------------------------------------------

Users can:

- Search item
- Filter by store
- Filter by date
- Filter by transaction
- View current quantity
- View transaction history
- View opening balance
- View closing balance

Provide a detailed Stock Card view.

------------------------------------------------------------
UC-09 — MANAGE BIN CARD
------------------------------------------------------------

Bin Cards must represent inventory at physical bin level.

A Bin Card should contain:

- Bin number
- Store
- Section
- Rack
- Shelf
- Item
- Item code
- Transaction date
- Transaction reference
- In
- Out
- Balance
- Location
- Supporting document

The system should demonstrate automatic balance calculation.

If a material enters a previously unused bin:

Create a Bin Card.

If material moves to another bin:

Create/update the appropriate Bin Card.

------------------------------------------------------------
UC-10 — STOCK TRANSFER BETWEEN BINS
------------------------------------------------------------

Allow authorized store users to move materials:

Bin A
    ↓
Bin B

Record:

- Item
- Quantity
- Source bin
- Destination bin
- Date
- User
- Reason
- Transfer reference

The UI should show:

Source balance decreases.

Destination balance increases.

Both bin histories are updated.

------------------------------------------------------------
UC-11 — MANAGE STORE REQUISITION
------------------------------------------------------------

Departments request materials from stores.

Store Requisition should include:

- Requisition number
- Requesting department
- Requester
- Store
- Date
- Required date
- Priority
- Items
- Quantity requested
- Purpose
- Remarks
- Status

Statuses:

- Draft
- Submitted
- Pending Approval
- Approved
- Rejected
- Partially Approved
- Fulfilled
- Cancelled

------------------------------------------------------------
UC-12 — APPROVE / REJECT STORE REQUISITION
------------------------------------------------------------

Authorized approvers should be able to:

- Review requisition
- Review requested quantities
- Check stock availability
- Approve
- Reject
- Partially approve
- Add comments

Approval history must be visible.

------------------------------------------------------------
UC-13 — CREATE PRELIMINARY SIV / ISIV
------------------------------------------------------------

After approved requisition:

Create preliminary:

- SIV
- ISIV

Model 20 representation.

Show:

- Voucher number
- Requisition
- Store
- Requesting department
- Items
- Requested quantity
- Approved quantity
- Issued quantity
- Status

------------------------------------------------------------
UC-14 — APPROVE AND AMEND SIV / ISIV
------------------------------------------------------------

Authorized personnel must be able to:

- Review voucher
- Amend quantities
- Add/remove eligible lines
- Approve
- Reject
- Return for correction

Maintain amendment history.

Do not silently overwrite previous values.

------------------------------------------------------------
UC-15 — GENERATE FINAL SIV / ISIV
------------------------------------------------------------

After approval:

Generate final voucher representation.

Show:

- Voucher number
- Type
- Department
- Store
- Items
- Quantities
- Authorized personnel
- Date
- Reference requisition

Actions:

- View
- Print
- Export/download representation

After issue:

Update mock inventory state.

------------------------------------------------------------
UC-16 — MANAGE FIXED ASSET REGISTRATION
------------------------------------------------------------

For materials classified as fixed assets:

Create asset records.

Fields:

- Asset tag
- Asset name
- Category
- Serial number
- Acquisition date
- Acquisition value
- Source
- Store
- Assigned department
- Assigned person/location
- Condition
- Status

Statuses:

- Registered
- In Store
- Assigned
- In Use
- Under Maintenance
- Lost
- Damaged
- Disposed

------------------------------------------------------------
UC-17 — MANAGE USER-CARD
------------------------------------------------------------

Create and manage user/material responsibility cards.

A User Card may track materials/assets assigned to a person.

Show:

- User
- Department
- Position
- Assigned item
- Asset tag/item code
- Quantity
- Date issued
- Return date
- Condition
- Status
- Supporting voucher

Provide:

- Issue
- Return
- View history
- Print/view card

------------------------------------------------------------
UC-18 — CREATE MATERIAL RETURN REQUEST / SRN
------------------------------------------------------------

Allow departments/users to return materials.

Store Return Note:

SRN

Include:

- SRN reference
- Department
- Requester
- Material
- Quantity
- Reason
- Condition
- Original issue reference
- Return date
- Status

Statuses:

- Draft
- Submitted
- Pending Review
- Approved
- Rejected
- Returned to Stock

------------------------------------------------------------
UC-19 — RECORD TECHNICAL EVALUATION RESULT
------------------------------------------------------------

For returned/damaged/questionable materials:

Record technical evaluation.

Possible result:

- Good / reusable
- Repair required
- Damaged
- Obsolete
- Scrap
- Return to stock
- Recommend disposal

Record:

- Evaluator
- Date
- Findings
- Recommendation
- Remarks
- Status

------------------------------------------------------------
UC-20 — APPROVE / REJECT STORE RETURN
------------------------------------------------------------

Authorized personnel review SRN.

Actions:

- Approve
- Reject
- Request clarification

If approved:

Material is returned to appropriate inventory/bin.

Stock Card and Bin Card must reflect the return.

------------------------------------------------------------
UC-21 — INITIATE MATERIAL TRANSFER REQUEST
------------------------------------------------------------

Allow transfer requests between stores.

Example:

Main Store
→ Electrical Engineering Store

or:

Mechanical Engineering Store
→ Chemical Engineering Store

Request fields:

- Transfer reference
- Source store
- Destination store
- Requested by
- Item
- Quantity
- Reason
- Date
- Priority

------------------------------------------------------------
UC-22 — APPROVE / REJECT MATERIAL TRANSFER
------------------------------------------------------------

Authorized users review transfer.

Actions:

- Approve
- Reject
- Partially approve
- Request amendment

Show approval history.

After approval:

Transfer becomes eligible for dispatch.

------------------------------------------------------------
UC-23 — AUTO-MONITOR SHELF LIFE AND STATUS
------------------------------------------------------------

The frontend must demonstrate monitoring.

For applicable materials show:

- Expiry date
- Days remaining
- Batch
- Condition
- Shelf-life status

Status examples:

- Normal
- Expiring Soon
- Expired
- Damaged
- Obsolete
- Quarantine

Dashboard should show alerts.

Examples:

"5 items expiring within 30 days"

"3 expired materials"

"2 damaged materials"

------------------------------------------------------------
UC-24 — FLAG ITEMS FOR DISPOSAL
------------------------------------------------------------

Authorized personnel can flag items.

Reasons:

- Expired
- Obsolete
- Damaged
- Beyond economical repair
- Unsafe
- Unusable

Show:

- Disposal reference
- Item
- Quantity
- Store
- Reason
- Date flagged
- Flagged by
- Status

------------------------------------------------------------
UC-25 — MANAGE DISPOSAL REQUEST
------------------------------------------------------------

Create disposal requests from flagged materials.

Include:

- Disposal request number
- Item
- Quantity
- Reason
- Supporting information
- Requested by
- Date
- Status

Statuses:

- Draft
- Submitted
- Under Review
- Approved
- Rejected
- Completed

------------------------------------------------------------
UC-26 — MANAGE DISPOSAL WORKFLOW
------------------------------------------------------------

Represent the full disposal lifecycle:

Flag
 ↓
Disposal Request
 ↓
Review
 ↓
Approval
 ↓
Execution
 ↓
Inventory Removal
 ↓
Audit Record

Do not simply change the status manually without showing the workflow.

============================================================
5. ADDITIONAL NECESSARY OPERATIONAL USE CASES
============================================================

Where necessary, introduce supporting use cases required to make the
mentor's workflows complete.

Examples:

- Login / Authentication
- Role Management
- Notification Management
- Dashboard Monitoring
- Inventory Search
- Inventory Adjustment
- Stock Reconciliation
- Physical Stock Taking
- Supplier Management
- Report Management
- Audit Trail
- Document/Reference Management
- Approval History
- Transaction History

Do NOT add random features.

Only add supporting functionality that logically belongs to the
stock-management workflow.

============================================================
6. ROLE-BASED FRONTEND BEHAVIOR
============================================================

The frontend must demonstrate role-based access.

Create realistic demo roles such as:

1. Administrator
2. Store Head
3. Storekeeper
4. Stock Clerk
5. Property Administration Officer
6. Technical Evaluation Committee Member
7. Department Head
8. Department Requester
9. Asset/Property Officer
10. Auditor / Security Officer

Each role should see appropriate actions.

Example:

STOREKEEPER:
- Goods Receipt
- Stock Cards
- Bin Cards
- Issues
- Returns
- Transfers

STORE HEAD:
- Goods Receipt approval workflow
- Requisitions
- SIV/ISIV
- Transfers
- Returns
- Stock monitoring

TEC MEMBER:
- Technical Evaluation
- Acceptance decisions
- Evaluation history

DEPARTMENT HEAD:
- Store Requisitions
- Approvals
- Material transfers
- Returns

PROPERTY OFFICER:
- GRN
- Fixed Assets
- User Cards
- Asset registration

ADMINISTRATOR:
- Users
- Roles
- Stores
- Categories
- Locations
- System configuration
- Audit log

AUDITOR:
- Reports
- Audit Log
- Transaction history
- Approval history

IMPORTANT:

This is frontend-only.

Therefore role-based access may be simulated through frontend mock
authentication/state.

Do NOT pretend this is secure backend authorization.

============================================================
7. CONNECT THE EXISTING SIDEBAR
============================================================

Do not destroy the existing sidebar.

Improve it only where necessary.

Organize the navigation logically.

Recommended structure:

DASHBOARD

INVENTORY SETUP
  - Stores
  - Item Categories
  - Items & Locations

STOCK RECEIVING
  - Goods Receipt (GRN)
  - Technical Evaluation
  - GRN Documents

STOCK RECORDS
  - Stock Cards
  - Bin Cards
  - Stock Transfer Between Bins
  - Inventory Monitoring

REQUISITIONS & ISSUES
  - Store Requisitions
  - Issue Vouchers (SIV / ISIV)

RETURNS & TRANSFERS
  - Material Returns (SRN)
  - Material Transfers
  - Transfer Approvals

ASSETS & DISPOSAL
  - Fixed Assets
  - User Cards
  - Disposal Management

REPORTS

ADMINISTRATION
  - Users
  - Roles
  - Audit Log
  - Settings

Only change the navigation where needed to expose mentor-required
functionality.

============================================================
8. WORKFLOW LINKING
============================================================

THIS IS ONE OF THE MOST IMPORTANT REQUIREMENTS.

Every related record must be clickable and traceable.

Example:

GRN-2026-0001

should allow:

GRN
 → Goods Receipt
 → Technical Evaluation
 → Stock Card
 → Bin Card

Similarly:

SR-2026-0040
 → Approval
 → SIV-2026-0011
 → Stock Card
 → Bin Card

Similarly:

SRN-2026-0011
 → Technical Evaluation
 → Return Approval
 → Stock Card
 → Bin Card

Similarly:

TRF-2026-0007
 → Transfer Approval
 → Source Store
 → Destination Store
 → Stock Cards
 → Bin Cards

Similarly:

DSP-2026-0003
 → Disposal Request
 → Approval
 → Disposal Execution
 → Inventory adjustment
 → Audit Log

Use clickable references, detail drawers, modals or detail pages while
preserving the current UI pattern.

============================================================
9. STATUS WORKFLOW ENGINE
============================================================

Do not use arbitrary statuses.

Define controlled status transitions.

Example:

Goods Receipt:

DRAFT
→ SUBMITTED
→ PENDING_EVALUATION
→ UNDER_EVALUATION
→ ACCEPTED / REJECTED
→ GRN_GENERATED

Requisition:

DRAFT
→ SUBMITTED
→ PENDING_APPROVAL
→ APPROVED / REJECTED
→ FULFILLED

SIV:

DRAFT
→ PRELIMINARY
→ PENDING_APPROVAL
→ AMENDMENT_REQUIRED
→ APPROVED
→ ISSUED

Transfer:

DRAFT
→ SUBMITTED
→ PENDING_APPROVAL
→ APPROVED
→ DISPATCHED
→ RECEIVED
→ COMPLETED

Return:

DRAFT
→ SUBMITTED
→ UNDER_REVIEW
→ EVALUATION
→ APPROVED / REJECTED
→ RETURNED_TO_STOCK

Disposal:

FLAGGED
→ REQUESTED
→ UNDER_REVIEW
→ APPROVED
→ EXECUTED
→ COMPLETED

The UI should prevent impossible transitions.

For example:

A rejected requisition should not directly generate a final SIV.

A receipt awaiting technical evaluation should not generate a final GRN.

A pending transfer should not immediately reduce stock.

============================================================
10. REALISTIC MOCK DATA
============================================================

Create a centralized mock-data layer.

Do not scatter hardcoded records throughout components.

Create realistic demo records.

Example stores:

- Main Store
- Electrical Engineering Department Store
- Mechanical Engineering Department Store
- Chemical Engineering Department Store
- Civil and Water Engineering Department Store
- Applied Sciences Department Store
- Pharmaceutical/Laboratory Store
- Computing Laboratory Store

Example items:

- A4 Photocopy Paper
- Digital Multimeter
- Arduino Uno R3
- Oscilloscope
- HP LaserJet Printer
- Laboratory Glassware
- PPE Safety Gloves
- Chemical Storage Container
- Welding Electrode
- Ballpoint Pen
- Network Switch
- Desktop Computer
- Electrical Cable
- Mechanical Bearing
- Steel Measuring Tape
- Laboratory Balance

Use realistic quantities and prices.

Create enough records to demonstrate:

- Empty state
- Normal state
- Low stock
- Pending approval
- Approved
- Rejected
- Expiring
- Expired
- Damaged
- Disposal pending
- Completed transactions

============================================================
11. DASHBOARD
============================================================

Improve the existing dashboard without redesigning it.

Display useful operational KPIs:

- Total Items
- Total Stores
- Total Stock Value
- Low Stock Items
- Pending Requisitions
- Pending Goods Receipts
- Pending Evaluations
- Pending Transfers
- Pending Returns
- Expiring Items
- Disposal Pending
- Fixed Assets

Include recent activity.

Examples:

"GRN-2026-0001 generated"

"Store Requisition SR-2026-0040 approved"

"Transfer TRF-2026-0007 approved"

"3 items approaching expiry"

"Disposal request DSP-2026-0003 pending approval"

============================================================
12. NOTIFICATIONS
============================================================

Use the existing notification UI.

Generate realistic notifications based on workflow state.

Examples:

- New goods receipt awaiting evaluation
- Requisition awaiting approval
- Transfer awaiting approval
- Material return awaiting review
- Item approaching expiry
- Item below reorder level
- Disposal request awaiting approval
- GRN generated
- SIV ready for approval

Notifications should link to the relevant module.

============================================================
13. AUDIT LOG
============================================================

Preserve the existing Audit Log page.

Expand it to show meaningful operational activity.

Columns:

- Timestamp
- User
- Role
- Module
- Action
- Reference
- Previous Status
- New Status

Examples:

Storekeeper
Created GRN-2026-0001

TEC Member
Approved technical evaluation for GRN-2026-0001

Store Head
Approved SR-2026-0040

Property Officer
Registered asset FA-2026-0102

Storekeeper
Issued SIV-2026-0011

Administrator
Created user account

The audit trail should demonstrate that important workflow transitions
are traceable.

============================================================
14. REPORTS
============================================================

Preserve the current Reports design.

Provide frontend report views such as:

- Inventory Summary
- Stock Balance Report
- Stock Card Report
- Bin Card Report
- Goods Receipt Report
- GRN Report
- Issue Voucher Report
- Requisition Report
- Return Report
- Transfer Report
- Fixed Asset Report
- Disposal Report
- Low Stock Report
- Expiry Report
- Transaction History Report

Support:

- Search
- Filter
- Date range
- Store filter
- Department filter
- Item filter
- Status filter
- Print-friendly view
- CSV-style export simulation if already supported

============================================================
15. FORMS AND VALIDATION
============================================================

Every important action must use proper forms.

Do not allow obviously invalid data.

Examples:

Quantity must be greater than zero.

Transfer quantity cannot exceed available source quantity.

Issue quantity cannot exceed available stock.

Required fields cannot be empty.

Expiry date must be logically valid.

A disposal quantity cannot exceed available quantity.

A GRN cannot be generated before acceptance.

A final SIV cannot be generated before approval.

Use the project's existing validation/UI patterns.

============================================================
16. MODALS / DETAIL VIEWS
============================================================

Use the existing UI pattern.

When a user clicks:

View
Edit
Approve
Reject
Generate
Evaluate
Transfer
Return
Dispose

show an appropriate modal, drawer or detail view.

Do not create unnecessary new page types.

Keep interaction consistent with the current application.

============================================================
17. FRONTEND STATE
============================================================

Because this implementation is frontend-only:

Create a clean mock state architecture.

Actions should visibly update the application.

Example:

Approve Requisition
→ status changes to APPROVED

Generate SIV
→ SIV appears in Issue Vouchers

Issue SIV
→ stock quantity decreases

Stock Card
→ new OUT transaction appears

Bin Card
→ new OUT transaction appears

Approve SRN
→ stock quantity increases

Transfer
→ source quantity decreases
→ destination quantity increases

Dispose
→ available quantity decreases
→ disposal transaction appears
→ audit event appears

The user should be able to demonstrate the entire business process
without a backend.

Use local state/context/localStorage or the project's existing state
architecture as appropriate.

Do not add a backend.

============================================================
18. DATA RELATIONSHIPS
============================================================

Create frontend mock relationships between entities.

Example:

Store
  ├── Items
  ├── Locations
  ├── Bins
  ├── Stock Cards
  └── Bin Cards

Goods Receipt
  ├── Receipt Items
  ├── Technical Evaluation
  └── GRN

GRN
  ├── Stock Card Transaction
  └── Bin Card Transaction

Requisition
  └── SIV/ISIV

SIV/ISIV
  ├── Stock Card Transaction
  └── Bin Card Transaction

SRN
  ├── Evaluation
  └── Stock Return Transaction

Transfer
  ├── Source Store
  ├── Destination Store
  ├── Source Bin
  └── Destination Bin

Fixed Asset
  └── User Card / Assignment

Disposal
  ├── Flag
  ├── Request
  ├── Approval
  └── Execution

============================================================
19. UI QUALITY REQUIREMENTS
============================================================

The final system must look like ONE professionally designed application.

DO NOT create:

- random colors
- inconsistent buttons
- different table designs
- different typography
- different modal styles
- inconsistent spacing
- unnecessary animations
- oversized cards
- unrelated dashboards
- unrelated icons

Maintain the existing visual language.

When a new page is necessary:

COPY THE EXISTING DESIGN PATTERN.

For example, if the current list pages use:

Page Title
Description
Primary Action
Search
Table
Status Badge
Actions

then new pages must follow that pattern.

============================================================
20. RESPONSIVENESS
============================================================

Do not break the current desktop layout.

Also ensure that:

- tables can scroll horizontally
- sidebar remains usable
- forms adapt to screen size
- modals remain usable
- cards wrap correctly

Do not redesign the desktop interface just to achieve responsiveness.

============================================================
21. ACCESSIBILITY
============================================================

Use:

- meaningful button labels
- accessible form labels
- keyboard-friendly controls
- appropriate contrast
- clear status indicators
- confirmation before destructive operations

Do not rely on color alone to communicate status.

============================================================
22. DESTRUCTIVE ACTIONS
============================================================

For:

- Delete
- Reject
- Dispose
- Cancel
- Remove

use confirmation dialogs.

Show clear consequences.

Example:

"Are you sure you want to reject this Store Requisition?
This action will prevent it from generating an issue voucher."

============================================================
23. DO NOT FAKE BACKEND FEATURES
============================================================

This is a FRONTEND implementation.

Do not create fake API calls pretending a real backend exists.

If API integration is not present:

Use mock services/data.

Clearly structure the code so that a future backend can replace the
mock service layer.

Example:

services/
  mock/
    storeService
    itemService
    receiptService
    requisitionService
    issueService
    transferService
    returnService
    assetService
    disposalService

The UI should not need to be completely rewritten when the backend
is later connected.

============================================================
24. CODE QUALITY
============================================================

Before modifying code:

UNDERSTAND the existing architecture.

Then:

- Reuse components
- Avoid duplication
- Keep modules organized
- Use meaningful names
- Keep business logic separate from UI where practical
- Centralize mock data
- Centralize status definitions
- Centralize role definitions
- Centralize navigation configuration
- Keep forms maintainable
- Keep tables reusable

Do not create giant monolithic components.

============================================================
25. IMPLEMENTATION ORDER
============================================================

Do NOT implement everything randomly.

Implement in this order:

PHASE 1 — FOUNDATION

1. Inspect existing codebase.
2. Identify existing pages/components.
3. Identify existing navigation.
4. Identify existing mock state/data.
5. Identify reusable components.
6. Create/organize shared domain types/constants if appropriate.

PHASE 2 — INVENTORY SETUP

7. Stores
8. Item Categories
9. Items & Locations
10. Bin/location management

PHASE 3 — RECEIVING

11. Goods Receipt
12. Technical Evaluation
13. Acceptance/Rejection
14. GRN generation
15. Stock Card integration
16. Bin Card integration

PHASE 4 — ISSUE PROCESS

17. Store Requisition
18. Requisition approval
19. Preliminary SIV/ISIV
20. SIV/ISIV amendment
21. SIV/ISIV approval
22. Final voucher
23. Stock update
24. Bin update

PHASE 5 — RETURNS

25. SRN
26. Technical evaluation
27. Return approval
28. Return to stock
29. Stock Card update
30. Bin Card update

PHASE 6 — TRANSFERS

31. Transfer request
32. Transfer approval
33. Bin-to-bin transfer
34. Store-to-store transfer
35. Dispatch
36. Receive
37. Stock synchronization

PHASE 7 — ASSETS

38. Fixed Assets
39. User Cards
40. Asset assignment
41. Asset history

PHASE 8 — MONITORING

42. Shelf-life monitoring
43. Expiry alerts
44. Low-stock alerts
45. Damaged/obsolete monitoring

PHASE 9 — DISPOSAL

46. Disposal flag
47. Disposal request
48. Disposal approval
49. Disposal execution
50. Inventory removal
51. Audit trail

PHASE 10 — ADMINISTRATION

52. Users
53. Roles
54. Notifications
55. Audit Log
56. Settings

PHASE 11 — REPORTING

57. Inventory reports
58. Transaction reports
59. Stock reports
60. Asset reports
61. Disposal reports

PHASE 12 — FINAL INTEGRATION

62. Dashboard
63. Notifications
64. Cross-module navigation
65. Workflow validation
66. Demo data consistency
67. Empty states
68. Loading states
69. Error states
70. Final UI consistency review

============================================================
26. IMPORTANT: DO NOT MODIFY EXISTING STYLING
============================================================

This is a HARD REQUIREMENT.

Before adding or modifying a page, inspect an existing page that has the
same pattern.

For example:

New approval page
→ copy the design language of existing table pages.

New detail page
→ copy the existing detail/modal pattern.

New form
→ copy existing form components.

New report
→ copy existing Reports page.

New workflow
→ use existing badges/buttons/modals.

DO NOT redesign.

DO NOT replace Tailwind/Bootstrap/custom CSS with another styling system.

DO NOT change the global theme.

============================================================
27. DEMO SCENARIO
============================================================

The finished application must support a complete demonstration scenario.

SCENARIO:

1. A department requests Digital Multimeters.

2. Department creates:
   SR-2026-0040

3. Store Head reviews and approves it.

4. System creates:
   SIV-2026-0011

5. Storekeeper prepares the issue.

6. Storekeeper issues the materials.

7. Inventory decreases.

8. Stock Card records OUT transaction.

9. Bin Card records OUT transaction.

10. Later, two unused multimeters are returned.

11. Department creates:
    SRN-2026-0011

12. Return is evaluated.

13. Return is approved.

14. Inventory increases.

15. Stock Card records RETURN.

16. Bin Card records IN transaction.

17. Another department requests material transfer.

18. Transfer is approved.

19. Source store quantity decreases.

20. Destination store quantity increases.

21. Dashboard reflects updated quantities.

22. Audit Log records all important actions.

This complete demonstration must work using frontend mock state.

============================================================
28. ACCEPTANCE CRITERIA
============================================================

The implementation is considered successful only if:

1. Existing UI style remains intact.

2. Existing pages continue working.

3. Mentor's 26 use cases are represented.

4. Use cases are connected into workflows.

5. Status transitions are logical.

6. Roles influence available actions.

7. Mock data is realistic.

8. Transactions visibly affect stock.

9. Stock Cards reflect transactions.

10. Bin Cards reflect transactions.

11. GRNs are connected to receipts/evaluations.

12. SIVs are connected to requisitions.

13. SRNs are connected to returns/evaluations.

14. Transfers are connected to source/destination stores.

15. Fixed assets can be registered and assigned.

16. User Cards can show assigned materials/assets.

17. Shelf-life alerts are visible.

18. Disposal has a complete workflow.

19. Notifications correspond to pending actions.

20. Audit Log records important actions.

21. Reports reflect mock data.

22. Search/filter functionality remains consistent.

23. Forms contain validation.

24. Destructive actions require confirmation.

25. No backend is required.

26. No fake API implementation is introduced.

27. The application remains maintainable.

28. The entire frontend can be demonstrated as one coherent
    university stock-management system.

============================================================
29. HOW YOU MUST WORK
============================================================

DO NOT immediately generate hundreds of files.

First:

STEP 1:
Analyze the existing project.

STEP 2:
Produce a concise implementation map showing:

- Existing pages
- Existing components
- Existing routes
- Existing reusable components
- Existing mock data
- Missing mentor functionality
- Components that can be reused
- Components that need extension
- New components actually required

STEP 3:
Identify conflicts between existing implementation and mentor workflows.

STEP 4:
Create a phased implementation plan.

STEP 5:
Implement one coherent module/workflow at a time.

STEP 6:
After each major workflow, verify that existing pages have not been
visually or functionally broken.

STEP 7:
Run the application and check all routes.

STEP 8:
Fix errors.

STEP 9:
Perform a final workflow consistency review.

IMPORTANT:

Do not stop after creating pages.

The objective is not the NUMBER OF PAGES.

The objective is a CONNECTED OPERATIONAL STOCK MANAGEMENT FRONTEND.

============================================================
30. FINAL BUSINESS-ANALYST RULE
============================================================

When a requirement is ambiguous, do not randomly invent behavior.

Use standard university/institutional stock-management business logic.

Prefer:

- clear approval stages
- traceability
- separation of duties
- transaction history
- document references
- stock integrity
- auditability
- controlled status transitions
- realistic operational workflows

If clarification is genuinely required, document the assumption in code
comments or an implementation-notes file rather than silently implementing
contradictory behavior.

The mentor explicitly stated that adjustments and clarification may be
required during implementation.

Therefore the architecture must remain flexible enough to accommodate
reasonable business-rule changes later.

FINAL INSTRUCTION:

START BY ANALYZING MY EXISTING FRONTEND.

DO NOT START CODING YET.

FIRST SHOW ME:

A. Existing frontend modules discovered
B. Existing routes discovered
C. Existing reusable components discovered
D. Existing mentor use cases already covered
E. Mentor use cases partially covered
F. Mentor use cases missing
G. Required workflow connections
H. Proposed implementation order

Then wait for implementation approval before making large structural
changes.