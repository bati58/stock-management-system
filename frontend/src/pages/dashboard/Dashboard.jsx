import { useEffect, useMemo, useState } from 'react'
import { Boxes, AlertTriangle, PackageCheck, FileText, TrendingUp } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { itemService, goodsReceiptService, requisitionService, stockTransactionService } from '../../services'
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [grns, setGrns] = useState([])
  const [reqs, setReqs] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([itemService.list(), goodsReceiptService.list(), requisitionService.list(), stockTransactionService.list()]).then(
      ([i, g, r, t]) => {
        setItems(i)
        setGrns(g)
        setReqs(r)
        setTransactions(t)
        setLoading(false)
      }
    )
  }, [])

  const totalValue = useMemo(() => items.reduce((s, i) => s + Number(i.qtyOnHand) * Number(i.unitPrice), 0), [items])
  const lowStock = useMemo(() => items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel)), [items])
  const pendingGrns = useMemo(() => grns.filter((g) => g.status === STATUS.PENDING || g.status === STATUS.UNDER_EVALUATION), [grns])
  const pendingReqs = useMemo(() => reqs.filter((r) => r.status === STATUS.PENDING), [reqs])

  const categoryTotals = useMemo(() => {
    const map = {}
    items.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + Number(i.qtyOnHand) * Number(i.unitPrice)
    })
    const max = Math.max(1, ...Object.values(map))
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: Math.round((value / max) * 100) }))
  }, [items])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">Here's what's happening across your stores today.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Inventory Value" value={loading ? '—' : formatCurrency(totalValue)} icon={Boxes} tone="brand" />
        <StatCard label="Items at Reorder Level" value={loading ? '—' : lowStock.length} icon={AlertTriangle} tone="amber" hint="Needs replenishment" />
        <StatCard label="Pending Goods Receipts" value={loading ? '—' : pendingGrns.length} icon={PackageCheck} tone="violet" hint="Awaiting evaluation" />
        <StatCard label="Pending Requisitions" value={loading ? '—' : pendingReqs.length} icon={FileText} tone="emerald" hint="Awaiting PAO approval" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Low-Stock Alerts" subtitle="Items at or below their reorder level" className="lg:col-span-1">
          {lowStock.length === 0 && <p className="text-sm text-ink-400">No items are currently below reorder level.</p>}
          <ul className="space-y-3">
            {lowStock.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-800">{i.name}</p>
                  <p className="text-xs text-ink-400">{i.store}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {formatNumber(i.qtyOnHand)} {i.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Transactions" subtitle="Latest receipts and issues" className="lg:col-span-1">
          {transactions.length === 0 && <p className="text-sm text-ink-400">No transactions recorded yet.</p>}
          <ul className="space-y-3">
            {transactions.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-800">{t.item}</p>
                  <p className="text-xs text-ink-400">{t.ref} · {formatDate(t.date)}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${t.type === 'Receipt' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.type === 'Receipt' ? `+${t.qtyIn}` : `-${t.qtyOut}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Inventory Value by Category" subtitle="Share of current stock value" className="lg:col-span-1">
          {categoryTotals.length === 0 && <p className="text-sm text-ink-400">No categories yet.</p>}
          <div className="space-y-3">
            {categoryTotals.map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                  <span className="truncate">{c.label}</span>
                  <span>{formatCurrency(c.value)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
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
                  <td className="py-2 pr-4">
                    <StatusBadge status={g.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
