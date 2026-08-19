import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Send,
  ShieldCheck,
  TrendingUp
} from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import {
  disposalService,
  goodsReceiptService,
  itemService,
  materialReturnService,
  materialTransferService,
  requisitionService,
  issueVoucherService,
  stockTransactionService
} from '../../services'
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters'
import { ROLES, STATUS } from '../../utils/constants'

const MAX_APPROVAL_ROWS = 6

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => new Date(b.date || b.receivedDate || b.createdAt || 0) - new Date(a.date || a.receivedDate || a.createdAt || 0))
}

function getUserStoreName(user) {
  return user?.store || user?.assignedStore || user?.departmentStore || null
}

function getRoleSubtext(user, storeName) {
  switch (user?.role) {
    case ROLES.ADMIN:
      return "Here's what's happening across your stores today."
    case ROLES.PAO:
      return "Here's what needs your approval today."
    case ROLES.STORE_HEAD:
      return storeName ? `Here's what's happening at ${storeName} today.` : "Store association is not yet linked to this account, so this view shows the current company overview until that data is updated."
    case ROLES.STOREKEEPER:
      return "Here's your task list for today."
    case ROLES.STOCK_CLERK:
      return "Here's the latest stock activity."
    case ROLES.TEC:
      return 'Materials waiting for your evaluation.'
    case ROLES.DEPT_HEAD:
      return "Here's the status of your requests."
    case ROLES.ACCOUNTANT:
      return "Here's the current financial position of inventory."
    case ROLES.SECURITY:
      return 'Verify gate passes for materials entering and leaving the premises.'
    default:
      return "Here's what's happening across your stores today."
  }
}

function renderValueBar(item, maxValue) {
  const pct = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0
  return (
    <div key={item.label}>
      <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
        <span className="truncate">{item.label}</span>
        <span>{formatCurrency(item.value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function renderStatCardLink(to, label, value, icon, tone, hint) {
  return (
    <Link key={label} to={to} className="block">
      <StatCard label={label} value={value} icon={icon} tone={tone} hint={hint} />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [grns, setGrns] = useState([])
  const [reqs, setReqs] = useState([])
  const [returns, setReturns] = useState([])
  const [transfers, setTransfers] = useState([])
  const [disposals, setDisposals] = useState([])
  const [transactions, setTransactions] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      itemService.list(),
      goodsReceiptService.list(),
      requisitionService.list(),
      materialReturnService.list(),
      materialTransferService.list(),
      disposalService.list(),
      stockTransactionService.list(),
      issueVoucherService.list()
    ]).then(([i, g, r, ret, tr, d, t, v]) => {
      setItems(i)
      setGrns(g)
      setReqs(r)
      setReturns(ret)
      setTransfers(tr)
      setDisposals(d)
      setTransactions(t)
      setVouchers(v)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const userStore = getUserStoreName(user)
  const isStoreScoped = Boolean(userStore)

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qtyOnHand || 0) * Number(item.unitPrice || 0), 0),
    [items]
  )

  const lowStock = useMemo(
    () => items.filter((item) => Number(item.qtyOnHand || 0) <= Number(item.reorderLevel || 0)),
    [items]
  )

  const pendingGrns = useMemo(
    () => grns.filter((g) => [STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status)),
    [grns]
  )

  const pendingReqs = useMemo(
    () => reqs.filter((r) => r.status === STATUS.PENDING),
    [reqs]
  )

  const pendingReturns = useMemo(
    () => returns.filter((r) => [STATUS.PENDING, STATUS.APPROVED].includes(r.status)),
    [returns]
  )

  const pendingTransfers = useMemo(
    () => transfers.filter((t) => ![STATUS.COMPLETED, STATUS.CANCELLED, STATUS.REJECTED].includes(t.status)),
    [transfers]
  )

  const pendingDisposals = useMemo(
    () => disposals.filter((d) => [STATUS.PENDING, STATUS.APPROVED].includes(d.status)),
    [disposals]
  )

  const pendingEvaluationGrns = pendingGrns.filter((g) => g.status === STATUS.UNDER_EVALUATION || g.status === STATUS.PENDING)
  const pendingEvaluationReturns = returns.filter((r) => [STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(r.status))

  const categoryTotals = useMemo(() => {
    const map = {}
    items.forEach((item) => {
      const value = Number(item.qtyOnHand || 0) * Number(item.unitPrice || 0)
      map[item.category] = (map[item.category] || 0) + value
    })
    const values = Object.values(map)
    const max = Math.max(1, ...values)
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: Math.round((value / max) * 100) }))
  }, [items])

  const valueAtReorderRisk = useMemo(
    () => items
      .filter((item) => Number(item.qtyOnHand || 0) <= Number(item.reorderLevel || 0))
      .reduce((sum, item) => sum + Number(item.qtyOnHand || 0) * Number(item.unitPrice || 0), 0),
    [items]
  )

  const storeFilteredItems = useMemo(
    () => (userStore ? items.filter((item) => item.store === userStore) : items),
    [items, userStore]
  )

  const storeFilteredLowStock = useMemo(
    () => (userStore ? lowStock.filter((item) => item.store === userStore) : lowStock),
    [lowStock, userStore]
  )

  const storeFilteredGrns = useMemo(
    () => (userStore ? grns.filter((g) => g.store === userStore) : grns),
    [grns, userStore]
  )

  const storeFilteredTransactions = useMemo(
    () => (userStore ? transactions.filter((t) => storeFilteredItems.some((item) => item.name === t.item && item.store === userStore)) : transactions),
    [transactions, storeFilteredItems, userStore]
  )

  const myDeptReqs = useMemo(
    () => reqs.filter((r) => r.requestedBy === user?.name || r.department === user?.department),
    [reqs, user]
  )

  const pendingDeptApprovals = useMemo(
    () =>
      reqs.filter(
        (r) =>
          r.status === STATUS.PENDING &&
          r.department === user?.department &&
          r.requestedBy !== user?.name
      ),
    [reqs, user]
  )

  const pendingGateIncoming = useMemo(
    () => grns.filter((g) => !g.gateVerified && [STATUS.APPROVED, STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status)).length,
    [grns]
  )

  const pendingGateOutgoing = useMemo(() => {
    const pendingVouchers = vouchers.filter((v) => v.status === STATUS.ISSUED && !v.gateVerified).length
    const pendingTransfers = transfers.filter((t) => [STATUS.APPROVED, STATUS.COMPLETED].includes(t.status) && !t.gateVerified).length
    return pendingVouchers + pendingTransfers
  }, [vouchers, transfers])

  const myDeptReturns = useMemo(
    () => returns.filter((r) => r.department === user?.department || r.requestedBy === user?.name),
    [returns, user]
  )

  const approvedReqsAwaitingIssue = useMemo(
    () => reqs.filter((r) => r.status === STATUS.APPROVED && (!r.issueVoucherRef || !r.issueVoucherRef.trim())),
    [reqs]
  )

  const pendingIssueActionRows = useMemo(() => {
    const receipts = grns
      .filter((g) => [STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status))
      .map((g) => ({
        id: `grn-${g.id}`,
        ref: g.grnRef,
        type: 'GRN',
        label: 'Record receipt',
        route: '/goods-receipt',
        date: g.receivedDate,
        meta: g.store || 'Store'
      }))

    const vouchers = reqs
      .filter((r) => r.status === STATUS.APPROVED && (!r.issueVoucherRef || !r.issueVoucherRef.trim()))
      .map((r) => ({
        id: `sr-${r.id}`,
        ref: r.srRef,
        type: 'Requisition',
        label: 'Generate voucher',
        route: '/issue-vouchers',
        date: r.date,
        meta: r.department || 'Department'
      }))

    return [...receipts, ...vouchers].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [grns, reqs])

  const approvalRows = useMemo(() => {
    const reqRows = pendingReqs.map((r) => ({
      id: `req-${r.id}`,
      type: 'Requisition',
      ref: r.srRef,
      date: r.date,
      dept: r.department,
      route: '/requisitions'
    }))

    const transferRows = pendingTransfers.map((t) => ({
      id: `tr-${t.id}`,
      type: 'Transfer',
      ref: t.transferRef,
      date: t.date,
      dept: t.fromStore || 'Store',
      route: '/material-transfer'
    }))

    return sortNewestFirst([...reqRows, ...transferRows]).slice(0, MAX_APPROVAL_ROWS)
  }, [pendingReqs, pendingTransfers])

  const renderAdmin = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Inventory Value" value={loading ? '—' : formatCurrency(totalValue)} icon={Boxes} tone="brand" />
        <StatCard label="Items at Reorder Level" value={loading ? '—' : lowStock.length} icon={AlertTriangle} tone="warning" hint="Needs replenishment" />
        <StatCard label="Pending Goods Receipts" value={loading ? '—' : pendingGrns.length} icon={PackageCheck} tone="info" hint="Awaiting evaluation" />
        <StatCard label="Pending Requisitions" value={loading ? '—' : pendingReqs.length} icon={FileText} tone="success" hint="Awaiting PAO approval" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Low-Stock Alerts" subtitle="Items at or below their reorder level" className="lg:col-span-1">
          {lowStock.length === 0 ? (
            <EmptyState title="No low-stock alerts" message="All inventory is comfortably above reorder levels." />
          ) : (
            <ul className="space-y-3">
              {lowStock.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{item.name}</p>
                    <p className="text-xs text-ink-400">{item.store}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
                    {formatNumber(item.qtyOnHand)} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Transactions" subtitle="Latest receipts and issues" className="lg:col-span-1">
          {transactions.length === 0 ? (
            <EmptyState title="No recent transactions" message="Transactions will appear here as stock moves through the system." />
          ) : (
            <ul className="space-y-3">
              {transactions.slice(0, 6).map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{transaction.item}</p>
                    <p className="text-xs text-ink-400">{transaction.ref} · {formatDate(transaction.date)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${transaction.type === 'Receipt' ? 'text-success-500' : 'text-danger-500'}`}>
                    {transaction.type === 'Receipt' ? `+${transaction.qtyIn}` : `-${transaction.qtyOut}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Inventory Value by Category" subtitle="Share of current stock value" className="lg:col-span-1">
          {categoryTotals.length === 0 ? (
            <EmptyState title="No category values yet" message="Add items to see a category value breakdown." />
          ) : (
            <div className="space-y-3">
              {categoryTotals.map((item) => renderValueBar(item, Math.max(...categoryTotals.map((entry) => entry.value), 1)))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent Goods Receipts" className="mt-6" actions={<TrendingUp size={16} className="text-ink-400" />}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-ink-500">
              <tr>
                <th className="py-2 pr-4">GRN Ref</th>
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Store</th>
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {grns.slice(0, 5).map((g) => (
                <tr key={g.id} className="border-t border-ink-100">
                  <td className="py-2 pr-4 font-medium text-ink-800">{g.grnRef}</td>
                  <td className="py-2 pr-4">{g.supplier}</td>
                  <td className="py-2 pr-4">{g.store}</td>
                  <td className="py-2 pr-4">{formatDate(g.receivedDate)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )

  const renderPao = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {renderStatCardLink('/requisitions', 'Pending Requisitions', pendingReqs.length, FileText, 'warning', 'Needs review')}
        {renderStatCardLink('/material-transfer', 'Pending Material Transfers', pendingTransfers.length, PackageCheck, 'info', 'Awaiting approval')}
        {renderStatCardLink('/disposal', 'Pending Disposal Requests', pendingDisposals.length, AlertTriangle, 'danger', 'Requires action')}
        <StatCard label="Total Inventory Value" value={loading ? '—' : formatCurrency(totalValue)} icon={Boxes} tone="brand" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Awaiting Your Approval" subtitle="Newest items first" className="lg:col-span-1">
          {approvalRows.length === 0 ? (
            <EmptyState title="Nothing awaiting approval" message="Everything is clear across the approval queue." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-ink-500">
                  <tr>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalRows.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100 align-top">
                      <td className="py-2 pr-4"><StatusBadge status={row.type === 'Requisition' ? STATUS.PENDING : STATUS.APPROVED} /></td>
                      <td className="py-2 pr-4"><Link to={row.route} className="font-medium text-brand-600 hover:text-brand-700">{row.ref}</Link></td>
                      <td className="py-2 pr-4 text-ink-500">{formatDate(row.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {approvalRows.length >= MAX_APPROVAL_ROWS && (
            <div className="mt-4 text-right">
              <Link to="/requisitions" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
            </div>
          )}
        </Card>

        <Card title="Inventory Value by Category" subtitle="Current stock value by category" className="lg:col-span-1">
          {categoryTotals.length === 0 ? (
            <EmptyState title="No category data" message="There are no category totals to summarize yet." />
          ) : (
            <div className="space-y-3">
              {categoryTotals.map((item) => renderValueBar(item, Math.max(...categoryTotals.map((entry) => entry.value), 1)))}
            </div>
          )}
        </Card>
      </div>
    </>
  )

  const renderStoreHead = () => (
    <>
      <div className="mb-4 flex flex-col gap-2 text-sm text-ink-600">
        {!isStoreScoped && (
          <div className="rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-warning-700">
            Store link is missing on this user record, so this dashboard is showing company-wide data until a store association is added.
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Items at Reorder Level" value={loading ? '—' : storeFilteredLowStock.length} icon={AlertTriangle} tone="warning" hint={isStoreScoped ? `${userStore} store` : 'Company-wide view'} />
        <StatCard label="Pending Goods Receipts" value={loading ? '—' : storeFilteredGrns.filter((g) => [STATUS.PENDING, STATUS.UNDER_EVALUATION].includes(g.status)).length} icon={PackageCheck} tone="info" hint={isStoreScoped ? `${userStore} store` : 'Company-wide view'} />
        <StatCard label="Pending Requisitions" value={loading ? '—' : pendingReqs.filter((r) => isStoreScoped ? r.store === userStore : true).length} icon={FileText} tone="success" hint={isStoreScoped ? 'Targeting your store' : 'Current overview'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Low-Stock Alerts" subtitle={isStoreScoped ? `Filtered to ${userStore}` : 'Store link missing — showing company-wide view'}>
          {storeFilteredLowStock.length === 0 ? (
            <EmptyState title="No low-stock items" message="The current store is well stocked." />
          ) : (
            <ul className="space-y-3">
              {storeFilteredLowStock.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{item.name}</p>
                    <p className="text-xs text-ink-400">{item.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
                    {formatNumber(item.qtyOnHand)} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Transactions" subtitle={isStoreScoped ? `Filtered to ${userStore}` : 'Store link missing — showing company-wide view'}>
          {storeFilteredTransactions.length === 0 ? (
            <EmptyState title="No recent stock movement" message="No recent transactions are available for this store view." />
          ) : (
            <ul className="space-y-3">
              {storeFilteredTransactions.slice(0, 6).map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{transaction.item}</p>
                    <p className="text-xs text-ink-400">{transaction.ref} · {formatDate(transaction.date)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${transaction.type === 'Receipt' ? 'text-success-500' : 'text-danger-500'}`}>
                    {transaction.type === 'Receipt' ? `+${transaction.qtyIn}` : `-${transaction.qtyOut}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent Goods Receipts" className="mt-6" actions={<TrendingUp size={16} className="text-ink-400" />}>
        {storeFilteredGrns.length === 0 ? (
          <EmptyState title="No recent goods receipts" message="No receipts are currently recorded for the selected store scope." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="py-2 pr-4">GRN Ref</th>
                  <th className="py-2 pr-4">Supplier</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Received</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {storeFilteredGrns.slice(0, 5).map((g) => (
                  <tr key={g.id} className="border-t border-ink-100">
                    <td className="py-2 pr-4 font-medium text-ink-800">{g.grnRef}</td>
                    <td className="py-2 pr-4">{g.supplier}</td>
                    <td className="py-2 pr-4">{g.store}</td>
                    <td className="py-2 pr-4">{formatDate(g.receivedDate)}</td>
                    <td className="py-2 pr-4"><StatusBadge status={g.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )

  const renderStorekeeper = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pending Goods Receipts" value={loading ? '—' : pendingGrns.length} icon={PackageCheck} tone="info" hint="Needs action" />
        <StatCard label="Approved Requisitions" value={loading ? '—' : approvedReqsAwaitingIssue.length} icon={FileText} tone="success" hint="Awaiting issue voucher" />
        <StatCard label="Items at Reorder Level" value={loading ? '—' : lowStock.length} icon={AlertTriangle} tone="warning" hint="Replenishment watch" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="To Do" subtitle="Action list for today" className="lg:col-span-2">
          {pendingIssueActionRows.length === 0 ? (
            <EmptyState title="Your task list is clear" message="There are no receipts or requisitions waiting for action." />
          ) : (
            <div className="space-y-3">
              {pendingIssueActionRows.slice(0, 8).map((row) => (
                <Link key={row.id} to={row.route} className="block rounded-lg border border-ink-100 bg-ink-50/40 p-3 transition hover:border-brand-200 hover:bg-brand-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-900">{row.ref}</p>
                      <p className="text-xs text-ink-500">{row.type} · {row.meta}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-600">
                      <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium">{row.label}</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Transactions" subtitle="Your recent receipts and issues">
          {transactions.length === 0 ? (
            <EmptyState title="No recent transactions" message="No stock movement has been recorded recently." />
          ) : (
            <ul className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{transaction.item}</p>
                    <p className="text-xs text-ink-400">{transaction.ref}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${transaction.type === 'Receipt' ? 'text-success-500' : 'text-danger-500'}`}>
                    {transaction.type === 'Receipt' ? `+${transaction.qtyIn}` : `-${transaction.qtyOut}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )

  const renderStockClerk = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Items at Reorder Level" value={lowStock.length} icon={AlertTriangle} tone="warning" hint="Watch list" />
        <StatCard label="Total Line Items in Catalog" value={items.length} icon={Boxes} tone="brand" hint="Inventory records" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Transactions" subtitle="Full feed for stock activity" actions={<Link to="/stock-cards" className="text-sm font-medium text-brand-600">View Stock Cards</Link>}>
          {transactions.length === 0 ? (
            <EmptyState title="No stock activity" message="Transactions will appear here as items move through the system." />
          ) : (
            <ul className="space-y-3">
              {transactions.slice(0, 8).map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{transaction.item}</p>
                    <p className="text-xs text-ink-400">{transaction.ref} · {formatDate(transaction.date)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${transaction.type === 'Receipt' ? 'text-success-500' : 'text-danger-500'}`}>
                    {transaction.type === 'Receipt' ? `+${transaction.qtyIn}` : `-${transaction.qtyOut}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Low-Stock Alerts" subtitle="Awareness only — no reordering action from this role">
          {lowStock.length === 0 ? (
            <EmptyState title="No low-stock items" message="All tracked items are above minimum thresholds." />
          ) : (
            <ul className="space-y-3">
              {lowStock.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-ink-800">{item.name}</span>
                  <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">{item.qtyOnHand}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )

  const renderTec = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderStatCardLink('/goods-receipt', 'Goods Receipts Pending Evaluation', pendingEvaluationGrns.length, ClipboardCheck, 'warning', 'Review queue')}
        {renderStatCardLink('/material-return', 'Material Returns Pending Evaluation', pendingEvaluationReturns.length, CheckCircle2, 'info', 'Review queue')}
      </div>

      <Card title="Evaluation Queue" subtitle="GRNs and returns waiting for your decision">
        {pendingEvaluationGrns.length === 0 && pendingEvaluationReturns.length === 0 ? (
          <EmptyState title="Nothing pending evaluation" message="You're all caught up — there are no materials waiting for review." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Store / Department</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...pendingEvaluationGrns.map((g) => ({ ...g, type: 'GRN', route: '/goods-receipt/evaluation', ref: g.grnRef, storeLabel: g.store, date: g.receivedDate })), ...pendingEvaluationReturns.map((r) => ({ ...r, type: 'Return', route: '/material-return', ref: r.srnRef, storeLabel: r.department, date: r.date }))].map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`} className="border-t border-ink-100">
                    <td className="py-2 pr-4 font-medium text-ink-800">{entry.ref}</td>
                    <td className="py-2 pr-4"><StatusBadge status={entry.type === 'GRN' ? STATUS.UNDER_EVALUATION : STATUS.PENDING} /></td>
                    <td className="py-2 pr-4">{entry.storeLabel}</td>
                    <td className="py-2 pr-4">{formatDate(entry.date)}</td>
                    <td className="py-2 pr-4"><Link to={entry.route} className="font-medium text-brand-600 hover:text-brand-700">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )

  const renderDeptHead = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting Your Approval" value={pendingDeptApprovals.length} icon={FileText} tone="warning" hint="Department requisitions" />
        <StatCard label="Your Pending Requisitions" value={myDeptReqs.filter((r) => r.status === STATUS.PENDING).length} icon={ClipboardCheck} tone="info" hint="Submitted by you" />
        <StatCard label="Your Pending Return Requests" value={myDeptReturns.filter((r) => [STATUS.PENDING, STATUS.APPROVED].includes(r.status)).length} icon={PackageCheck} tone="success" hint="Submitted by your team" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Requisitions Awaiting Approval" subtitle="Department requests needing your endorsement" actions={<Link to="/requisitions" className="text-sm font-medium text-brand-600 hover:text-brand-700">Review all</Link>}>
          {pendingDeptApprovals.length === 0 ? (
            <EmptyState title="No pending approvals" message="There are no department requisitions waiting for your approval." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-ink-500">
                  <tr>
                    <th className="py-2 pr-4">Ref</th>
                    <th className="py-2 pr-4">Requested By</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sortNewestFirst(pendingDeptApprovals).slice(0, 5).map((req) => (
                    <tr key={req.id} className="border-t border-ink-100">
                      <td className="py-2 pr-4"><Link to="/requisitions" className="font-medium text-brand-600 hover:text-brand-700">{req.srRef}</Link></td>
                      <td className="py-2 pr-4">{req.requestedBy}</td>
                      <td className="py-2 pr-4 text-ink-500">{formatDate(req.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Your Requisitions" subtitle="Newest first">
          {myDeptReqs.length === 0 ? (
            <EmptyState title="No requisitions yet" message="Your requisition history will appear here once you submit a request." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-ink-500">
                  <tr>
                    <th className="py-2 pr-4">Ref</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sortNewestFirst(myDeptReqs).slice(0, 5).map((req) => (
                    <tr key={req.id} className="border-t border-ink-100">
                      <td className="py-2 pr-4 font-medium text-ink-800">{req.srRef}</td>
                      <td className="py-2 pr-4"><StatusBadge status={req.status} /></td>
                      <td className="py-2 pr-4 text-ink-500">{formatDate(req.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Your Return Requests" subtitle="Newest first">
          {myDeptReturns.length === 0 ? (
            <EmptyState title="No return requests yet" message="Previous return requests will appear here as soon as they are created." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-ink-500">
                  <tr>
                    <th className="py-2 pr-4">Ref</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sortNewestFirst(myDeptReturns).slice(0, 5).map((req) => (
                    <tr key={req.id} className="border-t border-ink-100">
                      <td className="py-2 pr-4 font-medium text-ink-800">{req.srnRef}</td>
                      <td className="py-2 pr-4"><StatusBadge status={req.status} /></td>
                      <td className="py-2 pr-4 text-ink-500">{formatDate(req.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )

  const renderAccountant = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Inventory Value" value={loading ? '—' : formatCurrency(totalValue)} icon={Boxes} tone="brand" />
        <StatCard label="Value at Reorder Risk" value={loading ? '—' : formatCurrency(valueAtReorderRisk)} icon={AlertTriangle} tone="warning" hint="Below reorder threshold" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Inventory Value by Category" subtitle="Financial breakdown by category" className="lg:col-span-1">
          {categoryTotals.length === 0 ? (
            <EmptyState title="No category totals yet" message="Inventory value will appear here once items are created." />
          ) : (
            <div className="space-y-3">
              {categoryTotals.map((item) => renderValueBar(item, Math.max(...categoryTotals.map((entry) => entry.value), 1)))}
            </div>
          )}
        </Card>

        <Card title="FIFO Inventory Valuation" subtitle="First-In-First-Out method per SRS business rules">
          <div className="flex h-full flex-col justify-between gap-4">
            <p className="text-sm text-ink-600">Run the FIFO valuation report to record the financial value of inventory using receipt layers.</p>
            <Link to="/reports" className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Open FIFO report <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      </div>
    </>
  )

  const renderSecurity = () => (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderStatCardLink('/gate-pass', 'Incoming — Pending Verification', pendingGateIncoming, PackageCheck, 'success', 'Goods entering premises')}
        {renderStatCardLink('/gate-pass', 'Outgoing — Pending Clearance', pendingGateOutgoing, Send, 'warning', 'Materials leaving premises')}
      </div>

      <Card title="Gate Pass Queue" subtitle="Verify materials at the gate before entry or exit" actions={<Link to="/gate-pass" className="text-sm font-medium text-brand-600 hover:text-brand-700">Open verification</Link>}>
        {pendingGateIncoming + pendingGateOutgoing === 0 ? (
          <EmptyState title="Gate queue is clear" message="All recent goods movements have been verified at the gate." icon={ShieldCheck} />
        ) : (
          <ul className="space-y-3">
            {grns.filter((g) => !g.gateVerified).slice(0, 4).map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{g.grnRef} · Incoming</p>
                  <p className="text-xs text-ink-500">{g.supplier} → {g.store}</p>
                </div>
                <Link to="/gate-pass" className="text-xs font-medium text-brand-600">Verify</Link>
              </li>
            ))}
            {vouchers.filter((v) => v.status === STATUS.ISSUED && !v.gateVerified).slice(0, 4).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{v.sivRef} · Outgoing</p>
                  <p className="text-xs text-ink-500">Issued to {v.issuedTo}</p>
                </div>
                <Link to="/gate-pass" className="text-xs font-medium text-brand-600">Clear</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )

  const renderByRole = () => {
    switch (user?.role) {
      case ROLES.ADMIN:
        return renderAdmin()
      case ROLES.PAO:
        return renderPao()
      case ROLES.STORE_HEAD:
        return renderStoreHead()
      case ROLES.STOREKEEPER:
        return renderStorekeeper()
      case ROLES.STOCK_CLERK:
        return renderStockClerk()
      case ROLES.TEC:
        return renderTec()
      case ROLES.DEPT_HEAD:
        return renderDeptHead()
      case ROLES.ACCOUNTANT:
        return renderAccountant()
      case ROLES.SECURITY:
        return renderSecurity()
      default:
        return renderAdmin()
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-500">{getRoleSubtext(user, userStore)}</p>
      </div>

      {renderByRole()}
    </div>
  )
}
