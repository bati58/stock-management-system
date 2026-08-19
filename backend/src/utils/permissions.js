// =============================================================================
// Single source of truth for server-side authorization.
//
// This is a direct backend translation of the frontend's
// src/utils/permissions.js and Backend-SRS.docx Section 4. Keep both in
// sync if either changes — a role/resource pair should never be permitted
// on one side and blocked on the other.
//
// Every protected route calls requireRole(resource) (see
// middleware/authorize.js), which reads this matrix. There is no other
// place in the codebase that should contain a role check — if you find
// yourself writing `if (req.user.role === 'Administrator')` in a
// controller, that logic belongs here instead.
// =============================================================================

const ROLES = {
  ADMIN: 'Administrator',
  PAO: 'Property Administration Officer',
  STORE_HEAD: 'Store Head',
  STOREKEEPER: 'Storekeeper',
  STOCK_CLERK: 'Stock Clerk',
  TEC: 'Technical Evaluation Committee',
  DEPT_HEAD: 'Department Head',
  ACCOUNTANT: 'Accountant',
  SECURITY: 'Security Officer'
};

const { ADMIN, PAO, STORE_HEAD, STOREKEEPER, STOCK_CLERK, TEC, DEPT_HEAD, ACCOUNTANT, SECURITY } = ROLES;
const REPORT_READERS = [ADMIN, PAO, STORE_HEAD, STOCK_CLERK, TEC, DEPT_HEAD, ACCOUNTANT];

// Who can GET this resource. `null` = every authenticated role.
const READ_PERMISSIONS = {
  stores: [...REPORT_READERS, STOREKEEPER, STOCK_CLERK],
  categories: [...REPORT_READERS, STOREKEEPER, STOCK_CLERK],
  items: [...REPORT_READERS, STOREKEEPER, STOCK_CLERK],
  'goods-receipts': [...REPORT_READERS, STOREKEEPER, SECURITY],
  'stock-transactions': REPORT_READERS.concat(STOREKEEPER),
  'bin-cards': [...REPORT_READERS, STOREKEEPER],
  'bin-transfers': [ADMIN, PAO, STORE_HEAD, STOREKEEPER, STOCK_CLERK],
  requisitions: [...REPORT_READERS, STOREKEEPER],
  'issue-vouchers': [...REPORT_READERS, STOREKEEPER, SECURITY],
  'material-returns': [ADMIN, PAO, STORE_HEAD, STOREKEEPER, STOCK_CLERK, DEPT_HEAD, ACCOUNTANT],
  'material-transfers': [...REPORT_READERS, SECURITY],
  'fixed-assets': REPORT_READERS,
  disposals: REPORT_READERS,
  users: [ADMIN],
  'audit-logs': [ADMIN, PAO, ACCOUNTANT, SECURITY],
  reports: REPORT_READERS,
  'gate-pass': [ADMIN, SECURITY],
  'user-cards': [...REPORT_READERS, STOREKEEPER]
};

const ACTION_PERMISSIONS = {
  'goods-receipts': [ADMIN, STORE_HEAD, STOREKEEPER, TEC],
  requisitions: [ADMIN, PAO, STORE_HEAD, DEPT_HEAD],
  'material-returns': [ADMIN, STORE_HEAD, DEPT_HEAD],
  'material-transfers': [ADMIN, PAO, STORE_HEAD, DEPT_HEAD],
  disposals: [ADMIN, PAO, STORE_HEAD],
  'gate-pass': [ADMIN, SECURITY]
};

// Who can POST/PUT/DELETE this resource. If a resource has no entry here,
// every role in READ_PERMISSIONS for it may also write. If a resource's
// value here is an empty array, NO ONE writes directly — it only changes
// as the side effect of another action (see services/stockService.js).
const WRITE_PERMISSIONS = {
  stores: [ADMIN, PAO, STORE_HEAD],
  categories: [ADMIN, PAO, STORE_HEAD], // Stock Clerk: read-only
  items: [ADMIN, STORE_HEAD, STOREKEEPER], // PAO, Stock Clerk: read-only
  'goods-receipts': [ADMIN, STORE_HEAD, STOREKEEPER], // TEC writes only via the /evaluate action route
  'stock-transactions': [], // system-generated only
  'bin-cards': [ADMIN, PAO, STORE_HEAD, STOREKEEPER, STOCK_CLERK],
  requisitions: [ADMIN, PAO, STORE_HEAD, DEPT_HEAD],
  'issue-vouchers': [ADMIN, STORE_HEAD, STOREKEEPER],
  'material-returns': [ADMIN, STORE_HEAD, DEPT_HEAD],
  'material-transfers': [ADMIN, PAO, STORE_HEAD, DEPT_HEAD],
  'fixed-assets': [ADMIN, PAO, STORE_HEAD],
  disposals: [ADMIN, PAO, STORE_HEAD],
  users: [ADMIN],
  'audit-logs': [], // system-generated only
  reports: [],
  'gate-pass': [ADMIN, SECURITY],
  'user-cards': [ADMIN, STORE_HEAD, STOREKEEPER]
};

function canRead(resource, role) {
  const allowed = READ_PERMISSIONS[resource];
  if (allowed === undefined) return true; // resource not in the matrix = unrestricted
  return allowed.includes(role);
}

function canWrite(resource, role) {
  const readAllowed = READ_PERMISSIONS[resource];
  const writeAllowed = WRITE_PERMISSIONS[resource];
  if (writeAllowed === undefined) {
    // No explicit write rule -> defer to the read rule.
    if (readAllowed === undefined) return true;
    return readAllowed.includes(role);
  }
  return writeAllowed.includes(role);
}

function canAct(resource, role) {
  const allowed = ACTION_PERMISSIONS[resource];
  return allowed ? allowed.includes(role) : canWrite(resource, role);
}

module.exports = { ROLES, READ_PERMISSIONS, WRITE_PERMISSIONS, ACTION_PERMISSIONS, canRead, canWrite, canAct };
