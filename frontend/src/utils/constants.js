// Central place for roles, statuses and navigation permissions.
// Adjust ROLES to match whatever the backend team finalizes for auth claims.

export const ROLES = {
  ADMIN: 'Administrator',
  PAO: 'Property Administration Officer',
  STORE_HEAD: 'Store Head',
  STOREKEEPER: 'Storekeeper',
  STOCK_CLERK: 'Stock Clerk',
  TEC: 'Technical Evaluation Committee',
  DEPT_HEAD: 'Department Head',
  ACCOUNTANT: 'Accountant',
  SECURITY: 'Security Officer'
}

export const ALL_ROLES = Object.values(ROLES)

// Generic status vocabulary shared across GRN, Requisition, SIV, SRN, Transfer, Disposal
export const STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  UNDER_EVALUATION: 'Under Evaluation',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ISSUED: 'Issued',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export const STATUS_COLOR = {
  [STATUS.DRAFT]: 'bg-ink-100 text-ink-500',
  [STATUS.PENDING]: 'bg-warning-50 text-warning-700',
  [STATUS.UNDER_EVALUATION]: 'bg-info-50 text-info-700',
  [STATUS.APPROVED]: 'bg-success-50 text-success-700',
  [STATUS.REJECTED]: 'bg-danger-50 text-danger-700',
  [STATUS.ISSUED]: 'bg-info-50 text-info-700',
  [STATUS.COMPLETED]: 'bg-success-50 text-success-700',
  [STATUS.CANCELLED]: 'bg-ink-200 text-ink-600'
}

export const UNITS = ['pcs', 'box', 'carton', 'kg', 'litre', 'meter', 'ream', 'roll', 'set']
