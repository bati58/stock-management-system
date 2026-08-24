import { createEntityService } from './entityService'
import { exportAuditCsv, normalizeAuditRecord } from './auditService'
import { api } from './apiClient'

export const storeService = createEntityService('stores')
export const categoryService = createEntityService('categories')
export const itemService = createEntityService('items')
export const goodsReceiptService = createEntityService('goodsReceipts')
export const stockTransactionService = createEntityService('stockTransactions')
export const binCardService = {
    ...createEntityService('binCards'),
    movements: (id) => api.nestedList('binCards', id, 'movements')
}
export const requisitionService = createEntityService('requisitions')
export const issueVoucherService = createEntityService('issueVouchers')
export const fixedAssetService = createEntityService('fixedAssets')
export const userService = createEntityService('users')
export const materialReturnService = createEntityService('materialReturns')
export const materialTransferService = createEntityService('materialTransfers')
export const disposalService = createEntityService('disposals')
export const binTransferService = createEntityService('binTransfers')
export const userCardService = createEntityService('userCards')
export const locationService = createEntityService('locations')
export const supplierService = createEntityService('suppliers')
export const departmentService = createEntityService('departments')
export const auditService = {
    list: async () => (await api.list('auditLogs')).map((row) => normalizeAuditRecord(row)),
    get: async (id) => {
        const rows = await auditService.list()
        return rows.find((row) => String(row.id) === String(id)) || null
    },
    create: async () => {
        throw new Error('Audit records are created by backend transactions and cannot be created directly.')
    },
    update: async () => {
        throw new Error('Audit records are immutable and cannot be edited.')
    },
    remove: async () => {
        throw new Error('Audit records cannot be deleted from the application.')
    },
    exportCsv: exportAuditCsv
}

export const auditLogService = auditService
export const stockTakingService = createEntityService('stock-taking')
export const reconciliationService = {
    list: () => api.list('reconciliation')
}
export const notificationService = {
    list: () => api.list('notifications'),
    markRead: (id) => api.action('notifications', id, 'read', {})
}

export const businessRulesService = {
    list: () => api.list('business-rules'),
    getByCategory: (category) => api.raw(`/business-rules/category/${encodeURIComponent(category)}`),
    getRule: (ruleName) => api.raw(`/business-rules/rule/${encodeURIComponent(ruleName)}`),
    updateRule: (ruleName, ruleValue, description) =>
        api.raw(`/business-rules/rule/${encodeURIComponent(ruleName)}`, { method: 'PUT', body: JSON.stringify({ ruleValue, description }) }),
    getCategories: () => api.raw('/business-rules/categories'),
    getAllRules: () => api.raw('/business-rules/all')
}
export const reportService = {
    inventorySummary: () => api.raw('/reports/inventory-summary'),
    lowStock: () => api.raw('/reports/low-stock'),
    stockMovement: (params) => api.raw(`/reports/stock-movement?${new URLSearchParams(params).toString()}`),
    grnStatus: () => api.raw('/reports/grn-status'),
    requisitionStatus: () => api.raw('/reports/requisition-status'),
    issueStatus: () => api.raw('/reports/issue-status'),
    returnStatus: () => api.raw('/reports/return-status'),
    transferStatus: () => api.raw('/reports/transfer-status'),
    assetSummary: () => api.raw('/reports/asset-summary'),
    disposalStatus: () => api.raw('/reports/disposal-status'),
    fifoValuation: () => api.raw('/reports/fifo-valuation'),
    dashboardSummary: () => api.raw('/reports/dashboard-summary'),
    exportCsv: (reportName) => {
        const token = localStorage.getItem('sms_token')
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
        const url = `${base}/reports/export-csv?report=${encodeURIComponent(reportName)}`
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (!res.ok) throw new Error('Export failed')
                return res.blob()
            })
            .then((blob) => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(a.href)
            })
    }
}
