import { ROLES, STATUS } from './constants'

/**
 * Role-Based Access Control (RBAC) aligned with SRS section 4.4.8.
 * Maps each actor to pages and actions they may perform in the system.
 */

export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: {
        name: 'Administrator',
        canAccessPages: [
            '/',
            '/settings',
            '/stores',
            '/categories',
            '/items',
            '/goods-receipt',
            '/goods-receipt/evaluation',
            '/grn-documents',
            '/stock-cards',
            '/bin-cards',
            '/stock-transfer',
            '/requisitions',
            '/issue-vouchers',
            '/material-return',
            '/material-transfer',
            '/fixed-assets',
            '/user-cards',
            '/disposal',
            '/users',
            '/reports',
            '/audit-log',
            '/gate-pass'
        ],
        canCreate: ['stores', 'categories', 'items', 'users', 'fixedAssets'],
        canEdit: ['stores', 'categories', 'items', 'users', 'fixedAssets'],
        canDelete: ['stores', 'categories', 'items', 'users'],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canVerifyGatePass: true,
        canAddUsers: true,
        canDeleteUsers: true,
        canViewAuditLog: true,
        canViewFifoValuation: true,
        sidebar: 'full'
    },

    [ROLES.PAO]: {
        name: 'Property Administration Officer',
        // SRS: approves requests and monitors inventory activities
        canAccessPages: [
            '/',
            '/settings',
            '/requisitions',
            '/material-transfer',
            '/fixed-assets',
            '/disposal',
            '/stock-transfer',
            '/stock-cards',
            '/bin-cards',
            '/goods-receipt',
            '/grn-documents',
            '/reports',
            '/audit-log'
        ],
        canCreate: ['disposals', 'stockTransfer'],
        canEdit: ['disposals', 'stockTransfer'],
        canDelete: [],
        canApprove: ['requisitions', 'disposals', 'stockTransfer', 'materialTransfers'],
        canReject: ['requisitions', 'disposals', 'stockTransfer', 'materialTransfers'],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
        canViewFifoValuation: false,
        sidebar: 'limited'
    },

    [ROLES.STORE_HEAD]: {
        name: 'Store Head',
        canAccessPages: [
            '/',
            '/settings',
            '/stores',
            '/items',
            '/goods-receipt',
            '/goods-receipt/evaluation',
            '/grn-documents',
            '/stock-cards',
            '/bin-cards',
            '/stock-transfer',
            '/requisitions',
            '/issue-vouchers',
            '/material-return',
            '/material-transfer',
            '/user-cards',
            '/reports'
        ],
        canCreate: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'stockTransfer', 'userCards'],
        canEdit: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'stockTransfer', 'userCards'],
        canDelete: [],
        canApprove: ['goodsReceipts', 'issueVouchers', 'materialReturns', 'materialTransfers'],
        canReject: ['goodsReceipts', 'issueVouchers', 'materialReturns', 'materialTransfers'],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        canViewFifoValuation: false,
        sidebar: 'limited'
    },

    [ROLES.STOREKEEPER]: {
        name: 'Storekeeper',
        // SRS: receives and issues stock, updates inventory records (bin cards)
        canAccessPages: ['/', '/settings', '/items', '/goods-receipt', '/grn-documents', '/stock-cards', '/bin-cards', '/issue-vouchers', '/stock-transfer', '/user-cards'],
        canCreate: ['goodsReceipts', 'issueVouchers', 'stockTransfer', 'binCards', 'userCards'],
        canEdit: ['binCards', 'goodsReceipts', 'userCards'],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        canViewFifoValuation: false,
        sidebar: 'minimal'
    },

    [ROLES.STOCK_CLERK]: {
        name: 'Stock Clerk',
        // SRS: maintains stock records, updates transactions, prepares reports
        canAccessPages: ['/', '/settings', '/items', '/stock-cards', '/bin-cards', '/stock-transfer', '/reports'],
        canCreate: ['binCards', 'stockTransfer'],
        canEdit: ['binCards', 'stockTransfer'],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        canViewFifoValuation: false,
        sidebar: 'minimal'
    },

    [ROLES.TEC]: {
        name: 'Technical Evaluation Committee',
        canAccessPages: ['/', '/settings', '/goods-receipt', '/goods-receipt/evaluation', '/grn-documents', '/material-return', '/reports'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: ['goodsReceipts'],
        canReject: ['goodsReceipts'],
        canEvaluate: ['goodsReceipts'],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        canViewFifoValuation: false,
        sidebar: 'minimal'
    },

    [ROLES.DEPT_HEAD]: {
        name: 'Department Head',
        // SRS: approves requisitions from their department
        canAccessPages: ['/', '/settings', '/requisitions', '/material-return', '/material-transfer', '/reports'],
        canCreate: ['requisitions', 'materialReturns', 'materialTransfers'],
        canEdit: ['requisitions', 'materialReturns', 'materialTransfers'],
        canDelete: [],
        canApprove: ['requisitions', 'materialReturns', 'materialTransfers'],
        canReject: ['requisitions', 'materialReturns'],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        canViewFifoValuation: false,
        sidebar: 'limited'
    },

    [ROLES.ACCOUNTANT]: {
        name: 'Accountant',
        // SRS: views financial reports and manages inventory valuation (FIFO)
        canAccessPages: ['/', '/settings', '/items', '/stock-cards', '/bin-cards', '/goods-receipt', '/grn-documents', '/issue-vouchers', '/material-return', '/material-transfer', '/reports', '/audit-log'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canVerifyGatePass: false,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
        canViewFifoValuation: true,
        sidebar: 'limited'
    },

    [ROLES.SECURITY]: {
        name: 'Security Officer',
        // SRS: monitors goods entering and leaving the organization
        canAccessPages: ['/', '/settings', '/gate-pass', '/goods-receipt', '/issue-vouchers', '/stock-transfer', '/audit-log'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canVerifyGatePass: true,
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
        canViewFifoValuation: false,
        sidebar: 'minimal'
    }
}

/**
 * Check if a user role can perform a specific action
 */
export function canPerformAction(userRole, action, entityType) {
    const perms = ROLE_PERMISSIONS[userRole]
    if (!perms) return false

    switch (action) {
        case 'create':
            return perms.canCreate.includes(entityType)
        case 'edit':
            return perms.canEdit.includes(entityType)
        case 'delete':
            return perms.canDelete.includes(entityType)
        case 'approve':
            return perms.canApprove.includes(entityType)
        case 'reject':
            return perms.canReject.includes(entityType)
        case 'evaluate':
            return perms.canEvaluate.includes(entityType)
        case 'verifyGatePass':
            return perms.canVerifyGatePass
        case 'addUser':
            return perms.canAddUsers
        case 'deleteUser':
            return perms.canDeleteUsers
        case 'viewAuditLog':
            return perms.canViewAuditLog
        case 'viewFifoValuation':
            return perms.canViewFifoValuation
        default:
            return false
    }
}

/**
 * Check if a user can access a specific page
 */
export function canAccessPage(userRole, pagePath) {
    const perms = ROLE_PERMISSIONS[userRole]
    if (!perms) return false
    return perms.canAccessPages.includes(pagePath)
}

/**
 * Get all pages a role can access
 */
export function getAccessiblePages(userRole) {
    const perms = ROLE_PERMISSIONS[userRole]
    if (!perms) return []
    return perms.canAccessPages
}

/**
 * Get sidebar view type for a role
 */
export function getSidebarType(userRole) {
    const perms = ROLE_PERMISSIONS[userRole]
    if (!perms) return 'none'
    return perms.sidebar
}

/**
 * Department heads may only approve requisitions raised for their department.
 */
export function canApproveRequisition(user, requisition) {
    if (!user || !requisition) return false
    if (!canPerformAction(user.role, 'approve', 'requisitions')) return false
    if (user.role === ROLES.DEPT_HEAD) {
        if (requisition.status !== STATUS.PENDING) return false
        const dept = user.department || ''
        return requisition.department === dept || requisition.requestedBy === user.name
    }
    return requisition.status === STATUS.PENDING
}

export function canRejectRequisition(user, requisition) {
    if (!user || !requisition) return false
    if (!canPerformAction(user.role, 'reject', 'requisitions')) return false
    if (requisition.status !== STATUS.PENDING) return false
    if (user.role === ROLES.DEPT_HEAD) {
        const dept = user.department || ''
        return requisition.department === dept || requisition.requestedBy === user.name
    }
    return true
}
