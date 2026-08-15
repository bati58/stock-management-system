import { ROLES } from './constants'

/**
 * Role-Based Access Control (RBAC) system.
 * Defines permissions for each role across pages and actions.
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
            '/stock-cards',
            '/bin-cards',
            '/stock-transfer',
            '/requisitions',
            '/issue-vouchers',
            '/material-return',
            '/material-transfer',
            '/fixed-assets',
            '/disposal',
            '/users',
            '/reports',
            '/audit-log'
        ],
        canCreate: [
            'stores',
            'categories',
            'items',
            'goodsReceipts',
            'binCards',
            'stockTransfer',
            'requisitions',
            'issueVouchers',
            'materialReturns',
            'materialTransfers',
            'fixedAssets',
            'disposals',
            'users'
        ],
        canEdit: ['stores', 'categories', 'items', 'users', 'fixedAssets'],
        canDelete: ['stores', 'categories', 'items', 'users'],
        canApprove: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'disposals'],
        canReject: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'disposals'],
        canEvaluate: ['goodsReceipts'],
        canAddUsers: true,
        canDeleteUsers: true,
        canViewAuditLog: true,
        sidebar: 'full'
    },

    [ROLES.PAO]: {
        name: 'Property Administration Officer',
        canAccessPages: ['/', '/settings', '/fixed-assets', '/disposal', '/reports', '/audit-log'],
        canCreate: ['fixedAssets', 'disposals'],
        canEdit: ['fixedAssets', 'disposals'],
        canDelete: [],
        canApprove: ['disposals'],
        canReject: ['disposals'],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
        sidebar: 'minimal'
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
            '/stock-cards',
            '/bin-cards',
            '/stock-transfer',
            '/requisitions',
            '/issue-vouchers',
            '/material-return',
            '/material-transfer',
            '/reports'
        ],
        canCreate: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'stockTransfer'],
        canEdit: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers', 'stockTransfer'],
        canDelete: [],
        canApprove: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers'],
        canReject: ['goodsReceipts', 'requisitions', 'issueVouchers', 'materialReturns', 'materialTransfers'],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        sidebar: 'limited'
    },

    [ROLES.STOREKEEPER]: {
        name: 'Storekeeper',
        canAccessPages: ['/', '/settings', '/items', '/goods-receipt', '/stock-cards', '/bin-cards', '/issue-vouchers', '/stock-transfer'],
        canCreate: ['goodsReceipts', 'issueVouchers', 'stockTransfer'],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        sidebar: 'minimal'
    },

    [ROLES.STOCK_CLERK]: {
        name: 'Stock Clerk',
        canAccessPages: ['/', '/settings', '/items', '/stock-cards', '/bin-cards', '/stock-transfer'],
        canCreate: ['binCards', 'stockTransfer'],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        sidebar: 'minimal'
    },

    [ROLES.TEC]: {
        name: 'Technical Evaluation Committee',
        canAccessPages: ['/', '/settings', '/goods-receipt', '/goods-receipt/evaluation', '/reports'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: ['goodsReceipts'],
        canReject: ['goodsReceipts'],
        canEvaluate: ['goodsReceipts'],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        sidebar: 'minimal'
    },

    [ROLES.DEPT_HEAD]: {
        name: 'Department Head',
        canAccessPages: ['/', '/settings', '/requisitions', '/issue-vouchers', '/material-return', '/material-transfer', '/reports'],
        canCreate: ['requisitions', 'materialReturns', 'materialTransfers'],
        canEdit: ['requisitions', 'materialReturns', 'materialTransfers'],
        canDelete: [],
        canApprove: ['requisitions', 'materialReturns', 'materialTransfers'],
        canReject: [],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: false,
        sidebar: 'limited'
    },

    [ROLES.ACCOUNTANT]: {
        name: 'Accountant',
        canAccessPages: ['/', '/settings', '/reports', '/audit-log'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
        sidebar: 'minimal'
    },

    [ROLES.SECURITY]: {
        name: 'Security Officer',
        canAccessPages: ['/', '/settings', '/audit-log'],
        canCreate: [],
        canEdit: [],
        canDelete: [],
        canApprove: [],
        canReject: [],
        canEvaluate: [],
        canAddUsers: false,
        canDeleteUsers: false,
        canViewAuditLog: true,
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
        case 'addUser':
            return perms.canAddUsers
        case 'deleteUser':
            return perms.canDeleteUsers
        case 'viewAuditLog':
            return perms.canViewAuditLog
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
