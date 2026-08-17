import { createEntityService } from './entityService'
import { logAuditEvent, exportAuditCsv, normalizeAuditRecord } from './auditService'

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

const normalizeStoredAuditRows = (rows = []) =>
    [...rows].map((row) => normalizeAuditRecord(row)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

export const auditService = {
    list: async () => {
        const rows = JSON.parse(localStorage.getItem('sms_v1_auditLogs') || '[]')
        return normalizeStoredAuditRows(rows)
    },
    get: async (id) => {
        const rows = await auditService.list()
        return rows.find((row) => String(row.id) === String(id)) || null
    },
    create: async (record) => logAuditEvent(record),
    update: async () => {
        throw new Error('Audit records are immutable and cannot be edited.')
    },
    remove: async () => {
        throw new Error('Audit records cannot be deleted from the application.')
    },
    log: logAuditEvent,
    exportCsv: exportAuditCsv
}

export const auditLogService = auditService
