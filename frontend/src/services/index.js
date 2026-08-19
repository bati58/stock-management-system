import { createEntityService } from './entityService'
import { exportAuditCsv, normalizeAuditRecord } from './auditService'
import { api } from './apiClient'

export const storeService = createEntityService('stores')
export const categoryService = createEntityService('categories')
export const itemService = createEntityService('items')
export const goodsReceiptService = createEntityService('goodsReceipts')
export const stockTransactionService = createEntityService('stockTransactions')
export const binCardService = createEntityService('binCards')
export const requisitionService = createEntityService('requisitions')
export const issueVoucherService = createEntityService('issueVouchers')
export const fixedAssetService = createEntityService('fixedAssets')
export const userService = createEntityService('users')
export const materialReturnService = createEntityService('materialReturns')
export const materialTransferService = createEntityService('materialTransfers')
export const disposalService = createEntityService('disposals')
export const binTransferService = createEntityService('binTransfers')
export const userCardService = createEntityService('userCards')
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
