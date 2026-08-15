# Stock Management System — Frontend

A clean, responsive, professional frontend for a university Stock Management
System, built to satisfy the use cases in the project SRS (store setup, item
classification, goods receipt & technical evaluation, stock cards/bin cards,
requisitions & issue vouchers, fixed assets, returns, transfers, disposal,
reports and audit logging).

Stack: **React 18 + Vite + React Router + Tailwind CSS + lucide-react**.

The app runs fully standalone right now against an in-browser mock database
(`localStorage`), pre-seeded with realistic demo data, so you can develop and
demo every screen before the backend exists. See "Connecting to the real
backend" below for the two files you touch once the Node/Express API is
ready.

## 1. Prerequisites

- Node.js 18+ and npm (check with `node -v` and `npm -v`)
- VS Code (recommended extensions: **ES7+ React/Redux/React-Native
  snippets**, **Tailwind CSS IntelliSense**, **Prettier**)

## 2. Setup

Open a terminal in this folder (`sms-frontend`) and run:

```bash
npm install
npm run dev
```

Vite will start a dev server (default `http://localhost:5173`) and open it
in your browser automatically.

### Demo login

Any seeded username below works with any password of 4+ characters:

```
admin | pao | storehead | storekeeper | clerk | tec | depthead | accountant
```

### Other scripts

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm run lint      # eslint (add an eslint config first if you want this wired up)
```

## 3. Project structure

```
src/
  components/
    ui/            reusable UI kit (Button, Input, Table, Modal, ...)
    layout/         Sidebar, Topbar, DashboardLayout, nav config
    crud/           generic config-driven CrudPage used by simpler modules
  context/          AuthContext, ToastContext
  pages/            one folder per module, mirrors the sidebar navigation
  router/           ProtectedRoute guard
  services/         entityService factory + localDb (mock) + apiClient (real API, ready to wire in)
  utils/            constants.js (roles/status/units), formatters.js
```

## 4. How the module pages map to the SRS use cases

| Page | Route | SRS Use Case(s) |
|---|---|---|
| Stores | `/stores` | UC1 Manage Store Information |
| Item Categories | `/categories` | UC2 Maintain Items Category |
| Items & Locations | `/items` | UC3 Maintain Items Location |
| Goods Receipt | `/goods-receipt` | UC4 Goods Receipt Record |
| Technical Evaluation | `/goods-receipt/evaluation` | UC5 Evaluate Materials, UC6 Generate GRN |
| Stock Cards | `/stock-cards` | UC7 Auto-Update Stock Card, UC8 View Stock Card |
| Bin Cards | `/bin-cards` | UC9 Manage Bin Card |
| Stock Transfer | `/stock-transfer` | UC10 Stock Transfer Between Bins |
| Store Requisitions | `/requisitions` | UC11 Manage Requisition, UC12 Approve/Reject SR |
| Issue Vouchers | `/issue-vouchers` | UC13-15 SIV/ISIV create, approve, generate |
| Fixed Assets | `/fixed-assets` | UC16 Manage Fixed Assets Registration |
| Users | `/users` | UC17 Manage User-Card |
| Material Returns | `/material-return` | UC18-20 SRN create, technical eval, approve/reject |
| Material Transfers | `/material-transfer` | UC21-22 Initiate/Approve Transfer |
| Disposal | `/disposal` | UC23-26 Shelf-life monitor, flag, manage disposal |
| Reports | `/reports` | Report Management (inventory, low-stock, movement, GRN & SR status) |
| Audit Log | `/audit-log` | Audit Management |

The full Frontend SRS (architecture, component contracts, state/data flow,
non-functional requirements, and the BA review of the 26 use cases) is in
`Frontend-SRS.docx`, delivered alongside this project.

## 5. Connecting to the real backend

Everything currently reads/writes through `src/services/index.js`, which
exports one service per entity (`storeService`, `itemService`, ...). Each is
built by `createEntityService()` in `src/services/entityService.js`, which
currently calls the mock database in `src/services/localDb.js`.

To switch to the real Express + PostgreSQL API:

1. Set `VITE_API_BASE_URL` in a `.env` file (copy `.env.example`).
2. In `src/services/entityService.js`, change the five functions to call
   `api.list/get/create/update/remove` from `src/services/apiClient.js`
   instead of `db.list/get/create/update/remove`.
3. In `src/context/AuthContext.jsx`, replace the body of `login()` with
   `api.login({ username, password })` and store the returned JWT
   (`localStorage.setItem('sms_token', token)` — `apiClient.js` already reads
   this key and attaches it as a Bearer token).

No page or component needs to change — they only ever call the service
functions, never `localDb` or `apiClient` directly.

## 6. Design notes

- Tailwind theme (`tailwind.config.js`) defines a `brand` (blue) and `ink`
  (slate) palette used consistently across the UI kit — change those two
  scales to re-skin the whole app.
- The sidebar/nav is entirely config-driven from
  `src/components/layout/navConfig.js` — add a module by adding one entry
  there plus a route in `src/App.jsx`.
- Every list page follows the same shape: search box, table with pagination,
  a modal form for create/edit, and a confirm dialog for delete — this keeps
  the UI predictable for end users across 15+ modules.
- Status vocabulary (`Draft/Pending/Under Evaluation/Approved/Rejected/...`)
  and its colors are centralized in `src/utils/constants.js` so every module
  (GRN, Requisition, SIV, SRN, Transfer, Disposal) renders status consistently
  via `<StatusBadge />`.

## 7. Known gaps / suggested next steps

- Role-based **route guarding** is scaffolded (`hasRole()` in
  `AuthContext`) but not yet enforced per-route — currently any
  authenticated user can reach any page. Once the backend defines the final
  permission matrix, wrap the relevant `<Route>` elements with a
  role check.
- Print views are currently `window.print()` on the on-screen modal; for
  pixel-accurate Model 19/20/22 form printing, build dedicated print-only
  templates matching the manual's paper forms.
- No automated tests yet (Vitest + React Testing Library recommended).
- Real-time low-stock notifications, file/photo attachments on GRN, and
  barcode scanning were explicitly excluded per SRS section 1.6.2
  (Limitations) — revisit for v2.
