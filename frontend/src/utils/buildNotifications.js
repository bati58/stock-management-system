import { ROLES, STATUS } from './constants'

/**
 * Build role-relevant notifications from live inventory data (SRS-aligned).
 * Each notification uses a stable `id` so read/dismiss state can persist.
 */
export function buildNotifications(user, data) {
  if (!user) return []

  const {
    items = [],
    grns = [],
    reqs = [],
    returns = [],
    transfers = [],
    disposals = [],
    vouchers = []
  } = data

  const notes = []
  const userStore = user.store || user.assignedStore || user.departmentStore
  const userDept = user.department

  const lowStock = items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel))
  const pendingReqs = reqs.filter((r) => r.status === STATUS.PENDING)
  const pendingGrns = grns.filter((g) => [STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status))
  const pendingDisposals = disposals.filter((d) => [STATUS.PENDING, STATUS.APPROVED].includes(d.status))
  const pendingTransfers = transfers.filter((t) => ![STATUS.COMPLETED, STATUS.CANCELLED, STATUS.REJECTED].includes(t.status))
  const pendingReturns = returns.filter((r) => [STATUS.SUBMITTED, STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(r.status))
  const approvedAwaitingIssue = reqs.filter((r) => r.status === STATUS.APPROVED)
  const pendingGateIn = grns.filter((g) => !g.gateVerified && [STATUS.APPROVED, STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status))
  const pendingGateOut = [
    ...vouchers.filter((v) => v.status === STATUS.ISSUED && !v.gateVerified),
    ...transfers.filter((t) => [STATUS.APPROVED, STATUS.COMPLETED].includes(t.status) && !t.gateVerified)
  ]

  function push(id, title, message, type, route, timestamp) {
    notes.push({ id, title, message, type, route, timestamp: timestamp || new Date(), read: false })
  }

  switch (user.role) {
    case ROLES.ADMIN:
    case ROLES.STORE_HEAD:
      lowStock.slice(0, 5).forEach((item) => {
        push(
          `lowstock-${item.id}`,
          'Low Stock Alert',
          `${item.name} at ${item.store} is at ${item.qtyOnHand} ${item.unit} (reorder: ${item.reorderLevel})`,
          'warning',
          '/items',
          item.updatedAt
        )
      })
      pendingGrns.slice(0, 5).forEach((g) => {
        push(
          `grn-${g.id}`,
          'Goods Receipt Pending',
          `${g.grnRef} from ${g.supplier} — ${g.status}`,
          'info',
          '/goods-receipt',
          g.receivedDate
        )
      })
      pendingReqs.slice(0, 5).forEach((r) => {
        push(
          `req-${r.id}`,
          'Requisition Pending',
          `${r.srRef} from ${r.department} awaiting approval`,
          'warning',
          '/requisitions',
          r.date
        )
      })
      break

    case ROLES.PAO:
      pendingReqs.slice(0, 8).forEach((r) => {
        push(
          `req-${r.id}`,
          'Approval Required',
          `${r.srRef} from ${r.department} needs your approval`,
          'warning',
          '/requisitions',
          r.date
        )
      })
      pendingTransfers.slice(0, 5).forEach((t) => {
        push(
          `transfer-${t.id}`,
          'Transfer Pending',
          `${t.transferRef}: ${t.fromStore} → ${t.toStore}`,
          'info',
          '/material-transfer',
          t.date
        )
      })
      pendingDisposals.slice(0, 5).forEach((d) => {
        push(
          `disposal-${d.id}`,
          'Disposal Request',
          `${d.disposalRef} for ${d.item} requires action`,
          'warning',
          '/disposal',
          d.dateFlagged
        )
      })
      break

    case ROLES.STOREKEEPER:
      pendingGrns.slice(0, 6).forEach((g) => {
        push(
          `grn-${g.id}`,
          'Record Receipt',
          `${g.grnRef} at ${g.store} needs processing`,
          'info',
          '/goods-receipt',
          g.receivedDate
        )
      })
      approvedAwaitingIssue.slice(0, 6).forEach((r) => {
        push(
          `issue-${r.id}`,
          'Issue Approved Requisition',
          `${r.srRef} approved — generate issue voucher`,
          'success',
          '/issue-vouchers',
          r.date
        )
      })
      pendingReturns.slice(0, 6).forEach((r) => {
        push(
          `eval-return-${r.id}`,
          'Return Review Required',
          `${r.srnRef} from ${r.department} needs store review`,
          'info',
          '/material-return',
          r.date
        )
      })
      break

    case ROLES.STOCK_CLERK:
      lowStock.slice(0, 6).forEach((item) => {
        push(
          `lowstock-${item.id}`,
          'Reorder Watch',
          `${item.name} (${item.qtyOnHand} ${item.unit}) at ${item.store}`,
          'warning',
          '/stock-cards',
          null
        )
      })
      break

    case ROLES.TEC:
      grns.filter((g) => g.status === STATUS.UNDER_EVALUATION).slice(0, 6).forEach((g) => {
        push(
          `eval-grn-${g.id}`,
          'Technical Evaluation',
          `${g.grnRef} at ${g.store} awaiting evaluation`,
          'info',
          '/goods-receipt/evaluation',
          g.receivedDate
        )
      })
      break

    case ROLES.DEPT_HEAD:
      reqs
        .filter((r) => r.status === STATUS.PENDING && r.department === userDept && r.requestedBy !== user.name)
        .slice(0, 6)
        .forEach((r) => {
          push(
            `dept-approve-${r.id}`,
            'Department Approval',
            `${r.srRef} from ${r.requestedBy} needs your approval`,
            'warning',
            '/requisitions',
            r.date
          )
        })
      reqs
        .filter((r) => r.requestedBy === user.name && r.status === STATUS.APPROVED)
        .slice(0, 4)
        .forEach((r) => {
          push(
            `dept-approved-${r.id}`,
            'Requisition Approved',
            `${r.srRef} approved — awaiting store issue`,
            'success',
            '/requisitions',
            r.date
          )
        })
      break

    case ROLES.ACCOUNTANT:
      if (lowStock.length > 0) {
        push(
          'accountant-reorder-risk',
          'Inventory at Reorder Risk',
          `${lowStock.length} item(s) at or below reorder level — review valuation impact`,
          'warning',
          '/reports',
          null
        )
      }
      push(
        'accountant-fifo',
        'FIFO Valuation Available',
        'Run the FIFO inventory valuation report for financial records',
        'info',
        '/reports',
        null
      )
      break

    case ROLES.SECURITY:
      pendingGateIn.slice(0, 6).forEach((g) => {
        push(
          `gate-in-${g.id}`,
          'Incoming Delivery',
          `${g.grnRef} from ${g.supplier} — verify at gate`,
          'info',
          '/gate-pass',
          g.receivedDate
        )
      })
      pendingGateOut.slice(0, 6).forEach((r, idx) => {
        const ref = r.sivRef || r.transferRef
        push(
          `gate-out-${r.id || idx}`,
          'Outgoing Material',
          `${ref} requires exit clearance`,
          'warning',
          '/gate-pass',
          r.date
        )
      })
      break

    default:
      break
  }

  // Store-scoped filter for store head
  if (user.role === ROLES.STORE_HEAD && userStore) {
    return notes.filter((n) => {
      if (n.id.startsWith('lowstock-')) {
        const item = items.find((i) => `lowstock-${i.id}` === n.id)
        return item?.store === userStore
      }
      if (n.id.startsWith('grn-')) {
        const grn = grns.find((g) => `grn-${g.id}` === n.id)
        return grn?.store === userStore
      }
      return true
    })
  }

  return notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}
