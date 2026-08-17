import { useEffect, useMemo, useState } from 'react'
import { Printer, Download, Eye } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import {
  itemService,
  stockTransactionService,
  goodsReceiptService,
  requisitionService,
  issueVoucherService,
  materialTransferService,
  materialReturnService,
  fixedAssetService,
  binCardService,
  disposalService,
  storeService,
  categoryService,
  userCardService
} from '../../services'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters'
import { canPerformAction } from '../../utils/rolePermissions'

const REPORT_CATEGORIES = [
  {
    label: 'Inventory Management',
    reports: [
      { value: 'inventory-summary', label: 'Current Stock Balance Report' },
      { value: 'stock-card-report', label: 'Stock Card Report' },
      { value: 'bin-card-report', label: 'Bin Card Report' },
      { value: 'low-stock', label: 'Low / Reorder Level Stock' },
      { value: 'stock-movement', label: 'Stock Movement (Receipts & Issues)' },
      { value: 'stock-variance', label: 'Stock Variance Report' },
      { value: 'expiring-items', label: 'Expiring Items Report' }
    ]
  },
  {
    label: 'Receiving & GRN',
    reports: [
      { value: 'grn-status', label: 'Goods Receipt Status Report' },
      { value: 'grn-report', label: 'GRN Report' },
      { value: 'material-evaluation', label: 'Material Evaluation Report' }
    ]
  },
  {
    label: 'Requisitions & Issues',
    reports: [
      { value: 'requisition-status', label: 'Store Requisition Report' },
      { value: 'siv-report', label: 'SIV / ISIV Report' },
      { value: 'department-consumption', label: 'Department Consumption Report' }
    ]
  },
  {
    label: 'Transfers & Returns',
    reports: [
      { value: 'transfer-report', label: 'Inter-Store Transfer Report' },
      { value: 'material-return-report', label: 'Material Return / SRN Report' }
    ]
  },
  {
    label: 'Assets & Disposal',
    reports: [
      { value: 'asset-register', label: 'Fixed Asset Register' },
      { value: 'asset-assignment', label: 'Asset Assignment Report' },
      { value: 'disposal-report', label: 'Disposal Report' }
    ]
  },
  {
    label: 'Financial & Analysis',
    reports: [
      { value: 'supplier-transactions', label: 'Supplier Transaction Report' },
      { value: 'inventory-valuation', label: 'Inventory Valuation Report' },
      { value: 'stock-movement-value', label: 'Stock Movement Value Report' }
    ]
  }
]

function flattenReportOptions() {
  return REPORT_CATEGORIES.flatMap((cat) => cat.reports)
}

const BASE_REPORT_OPTIONS = flattenReportOptions()
const FIFO_REPORT = { value: 'fifo-valuation', label: 'FIFO Inventory Valuation (Accountant)' }

function computeFifoValue(itemName, qtyOnHand, transactions, fallbackUnitPrice = 0) {
  const receipts = transactions
    .filter((t) => t.item === itemName && t.type === 'Receipt')
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  let remaining = Number(qtyOnHand || 0)
  let value = 0

  for (const receipt of receipts) {
    if (remaining <= 0) break
    const layerQty = Math.min(remaining, Number(receipt.qtyIn || 0))
    value += layerQty * Number(receipt.unitPrice || fallbackUnitPrice)
    remaining -= layerQty
  }

  if (remaining > 0) {
    value += remaining * Number(fallbackUnitPrice)
  }

  return value
}

export default function Reports() {
  const { user } = useAuth()
  const canViewFifo = canPerformAction(user?.role, 'viewFifoValuation')

  const [reportType, setReportType] = useState('inventory-summary')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    store: 'all',
    category: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  })
  const [detailRow, setDetailRow] = useState(null)

  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [grns, setGrns] = useState([])
  const [reqs, setReqs] = useState([])
  const [sivs, setSivs] = useState([])
  const [transfers, setTransfers] = useState([])
  const [returns, setReturns] = useState([])
  const [assets, setAssets] = useState([])
  const [binCards, setBinCards] = useState([])
  const [disposals, setDisposals] = useState([])
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])
  const [userCards, setUserCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      itemService.list(),
      stockTransactionService.list(),
      goodsReceiptService.list(),
      requisitionService.list(),
      issueVoucherService.list(),
      materialTransferService.list(),
      materialReturnService.list(),
      fixedAssetService.list(),
      binCardService.list(),
      disposalService.list(),
      storeService.list(),
      categoryService.list(),
      userCardService.list()
    ]).then(
      ([i, t, g, r, s, tr, ret, a, b, d, st, c, uc]) => {
        setItems(i)
        setTransactions(t)
        setGrns(g)
        setReqs(r)
        setSivs(s)
        setTransfers(tr)
        setReturns(ret)
        setAssets(a)
        setBinCards(b)
        setDisposals(d)
        setStores(st)
        setCategories(c)
        setUserCards(uc)
        setLoading(false)
      }
    )
  }, [])

  const reportOptions = useMemo(
    () => (canViewFifo ? [...BASE_REPORT_OPTIONS, FIFO_REPORT] : BASE_REPORT_OPTIONS),
    [canViewFifo]
  )

  const storeOptions = useMemo(
    () => [{ value: 'all', label: 'All Stores' }, ...stores.map((s) => ({ value: s.name, label: s.name }))],
    [stores]
  )

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c.name, label: c.name }))],
    [categories]
  )

  const getFilterRange = () => {
    const start = filters.startDate ? new Date(filters.startDate) : null
    const end = filters.endDate ? new Date(filters.endDate) : null
    if (end) end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const matchesFilter = (record, startKey = 'date', storeKey = 'store') => {
    const q = query.trim().toLowerCase()
    const { start, end } = getFilterRange()

    if (q && !JSON.stringify(record).toLowerCase().includes(q)) return false
    if (filters.store !== 'all' && record[storeKey] !== filters.store) return false
    if (filters.category !== 'all' && record.category !== filters.category) return false
    if (filters.status !== 'all' && record.status !== filters.status) return false

    const recordDate = record[startKey] ? new Date(record[startKey]) : null
    if (start && recordDate && recordDate < start) return false
    if (end && recordDate && recordDate > end) return false

    return true
  }

  const exportCsv = (columns, rows) => {
    const header = columns.map((c) => c.header).join(',')
    const body = rows
      .map((row) => columns.map((c) => `"${String(c.render ? c.render(row) : row[c.key] || '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  let columns = []
  let rows = []
  let summaryCards = []

  if (reportType === 'inventory-summary') {
    const filtered = items.filter((i) => matchesFilter(i, null, 'store'))
    summaryCards = [
      { title: 'Total Items', value: filtered.length, format: 'number' },
      { title: 'Total Value', value: filtered.reduce((s, i) => s + Number(i.qtyOnHand) * Number(i.unitPrice), 0), format: 'currency' },
      { title: 'Avg Unit Price', value: filtered.length > 0 ? filtered.reduce((s, i) => s + Number(i.unitPrice), 0) / filtered.length : 0, format: 'currency' }
    ]
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'category', header: 'Category' },
      { key: 'store', header: 'Store' },
      { key: 'bin', header: 'Bin' },
      { key: 'qtyOnHand', header: 'Qty on Hand', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) },
      { key: 'value', header: 'Total Value', render: (r) => formatCurrency(r.qtyOnHand * r.unitPrice) }
    ]
    rows = filtered
  } else if (reportType === 'stock-card-report') {
    const filtered = items.filter((i) => matchesFilter(i, null, 'store'))
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Balance', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'minLevel', header: 'Min Level' },
      { key: 'maxLevel', header: 'Max Level' },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) }
    ]
    rows = filtered
  } else if (reportType === 'bin-card-report') {
    const filtered = binCards.filter((b) => matchesFilter(b, null, 'store'))
    columns = [
      { key: 'bin', header: 'Bin' },
      { key: 'store', header: 'Store' },
      { key: 'item', header: 'Item' },
      { key: 'balance', header: 'Balance', render: (r) => formatNumber(r.balance) },
      { key: 'lastMovement', header: 'Last Movement', render: (r) => formatDate(r.lastMovement) }
    ]
    rows = filtered
  } else if (reportType === 'grn-status') {
    const filtered = grns.filter((g) => matchesFilter(g, 'receivedDate', 'store'))
    summaryCards = [
      { title: 'Total GRNs', value: filtered.length, format: 'number' },
      { title: 'Accepted', value: filtered.filter((g) => g.status === 'Accepted').length, format: 'number' }
    ]
    columns = [
      { key: 'grnRef', header: 'GRN Ref' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'poRef', header: 'PO Ref' },
      { key: 'store', header: 'Store' },
      { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
      { key: 'receivedBy', header: 'Received By' },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'grn-report') {
    const filtered = grns.filter((g) => matchesFilter(g, 'receivedDate', 'store'))
    columns = [
      { key: 'grnRef', header: 'GRN Ref' },
      { key: 'poRef', header: 'PO Ref' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'store', header: 'Store' },
      { key: 'receivedDate', header: 'Date', render: (r) => formatDate(r.receivedDate) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'material-evaluation') {
    const filtered = grns.filter((g) => matchesFilter(g, 'receivedDate', 'store'))
    columns = [
      { key: 'grnRef', header: 'GRN Ref' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'evaluatedBy', header: 'Evaluated By' },
      { key: 'evaluationNote', header: 'Evaluation Note' },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered.filter((g) => g.evaluatedBy)
  } else if (reportType === 'requisition-status') {
    const filtered = reqs.filter((r) => matchesFilter(r, 'date'))
    summaryCards = [
      { title: 'Total Requisitions', value: filtered.length, format: 'number' },
      { title: 'Approved', value: filtered.filter((r) => r.status === 'Approved').length, format: 'number' }
    ]
    columns = [
      { key: 'srRef', header: 'SR Ref' },
      { key: 'department', header: 'Department' },
      { key: 'requestedBy', header: 'Requested By' },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'siv-report') {
    const filtered = sivs.filter((s) => matchesFilter(s, 'date'))
    summaryCards = [
      { title: 'Total Vouchers', value: filtered.length, format: 'number' },
      { title: 'Issued', value: filtered.filter((s) => s.status === 'Issued').length, format: 'number' }
    ]
    columns = [
      { key: 'sivRef', header: 'Voucher Ref' },
      { key: 'type', header: 'Type' },
      { key: 'srRef', header: 'From Requisition' },
      { key: 'issuedTo', header: 'Issued To' },
      { key: 'issuedBy', header: 'Issued By' },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'department-consumption') {
    const consumptionMap = new Map()
    sivs.forEach((s) => {
      if (s.status === 'Issued' && (!filters.startDate || new Date(s.date) >= new Date(filters.startDate))) {
        const dept = s.issuedTo
        if (!consumptionMap.has(dept)) {
          consumptionMap.set(dept, { department: dept, vouchersIssued: 0, itemsIssued: 0, value: 0 })
        }
        const entry = consumptionMap.get(dept)
        entry.vouchersIssued += 1
        s.items?.forEach((item) => {
          entry.itemsIssued += Number(item.qty) || 0
          entry.value += Number(item.qty) * Number(item.unitPrice) || 0
        })
      }
    })
    columns = [
      { key: 'department', header: 'Department' },
      { key: 'vouchersIssued', header: 'Vouchers Issued' },
      { key: 'itemsIssued', header: 'Items Issued' },
      { key: 'value', header: 'Total Value', render: (r) => formatCurrency(r.value) }
    ]
    rows = Array.from(consumptionMap.values())
  } else if (reportType === 'transfer-report') {
    const filtered = transfers.filter((t) => matchesFilter(t, 'date'))
    summaryCards = [
      { title: 'Total Transfers', value: filtered.length, format: 'number' },
      { title: 'Completed', value: filtered.filter((t) => t.status === 'Completed').length, format: 'number' }
    ]
    columns = [
      { key: 'transferRef', header: 'Transfer Ref' },
      { key: 'fromStore', header: 'From Store' },
      { key: 'toStore', header: 'To Store' },
      { key: 'requestedBy', header: 'Requested By' },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'material-return-report') {
    const filtered = returns.filter((r) => matchesFilter(r, 'date'))
    summaryCards = [
      { title: 'Total Returns', value: filtered.length, format: 'number' },
      { title: 'Approved', value: filtered.filter((r) => r.status === 'Approved').length, format: 'number' }
    ]
    columns = [
      { key: 'srnRef', header: 'SRN Ref' },
      { key: 'department', header: 'Department' },
      { key: 'item', header: 'Item' },
      { key: 'qty', header: 'Quantity', render: (r) => formatNumber(r.qty) },
      { key: 'reason', header: 'Reason' },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'asset-register') {
    const filtered = assets.filter((a) => matchesFilter(a, null, 'store'))
    summaryCards = [
      { title: 'Total Assets', value: filtered.length, format: 'number' },
      { title: 'Total Value', value: filtered.reduce((s, a) => s + Number(a.value), 0), format: 'currency' },
      { title: 'In Use', value: filtered.filter((a) => a.status === 'In Use').length, format: 'number' }
    ]
    columns = [
      { key: 'assetTag', header: 'Asset Tag' },
      { key: 'name', header: 'Asset Name' },
      { key: 'category', header: 'Category' },
      { key: 'store', header: 'Store' },
      { key: 'value', header: 'Value', render: (r) => formatCurrency(r.value) },
      { key: 'acquisitionDate', header: 'Acquisition Date', render: (r) => formatDate(r.acquisitionDate) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'asset-assignment') {
    const filtered = assets.filter((a) => a.assignedTo && matchesFilter(a, null, 'store'))
    columns = [
      { key: 'assetTag', header: 'Asset Tag' },
      { key: 'name', header: 'Asset Name' },
      { key: 'assignedTo', header: 'Assigned To' },
      { key: 'store', header: 'Store' },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      { key: 'acquisitionDate', header: 'Assigned Date', render: (r) => formatDate(r.acquisitionDate) }
    ]
    rows = filtered
  } else if (reportType === 'disposal-report') {
    const filtered = disposals.filter((d) => matchesFilter(d, 'dateFlagged'))
    summaryCards = [
      { title: 'Total Disposals', value: filtered.length, format: 'number' },
      { title: 'Executed', value: filtered.filter((d) => d.status === 'Executed').length, format: 'number' }
    ]
    columns = [
      { key: 'disposalRef', header: 'Disposal Ref' },
      { key: 'item', header: 'Item' },
      { key: 'store', header: 'Store' },
      { key: 'qty', header: 'Qty', render: (r) => formatNumber(r.qty) },
      { key: 'reason', header: 'Reason' },
      { key: 'dateFlagged', header: 'Date Flagged', render: (r) => formatDate(r.dateFlagged) },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
    ]
    rows = filtered
  } else if (reportType === 'low-stock') {
    const filtered = items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel) && matchesFilter(i, null, 'store'))
    summaryCards = [
      { title: 'Low Stock Items', value: filtered.length, format: 'number' },
      { title: 'Estimated Reorder Value', value: filtered.reduce((s, i) => s + Number(i.reorderLevel) * Number(i.unitPrice), 0), format: 'currency' }
    ]
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty on Hand', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'reorderLevel', header: 'Reorder Level', render: (r) => formatNumber(r.reorderLevel) },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) }
    ]
    rows = filtered
  } else if (reportType === 'stock-movement') {
    const filtered = transactions.filter((t) => {
      if (query && !JSON.stringify(t).toLowerCase().includes(query.toLowerCase())) return false
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(t.date) > end) return false
      }
      return true
    })
    columns = [
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'item', header: 'Item' },
      { key: 'type', header: 'Type' },
      { key: 'ref', header: 'Reference' },
      { key: 'qtyIn', header: 'Qty In', render: (r) => formatNumber(r.qtyIn) },
      { key: 'qtyOut', header: 'Qty Out', render: (r) => formatNumber(r.qtyOut) },
      { key: 'balance', header: 'Balance', render: (r) => formatNumber(r.balance) }
    ]
    rows = filtered
  } else if (reportType === 'stock-variance') {
    const filtered = items.filter((i) => matchesFilter(i, null, 'store'))
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'System Qty', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'minLevel', header: 'Min Level', render: (r) => formatNumber(r.minLevel) },
      { key: 'maxLevel', header: 'Max Level', render: (r) => formatNumber(r.maxLevel) }
    ]
    rows = filtered
  } else if (reportType === 'expiring-items') {
    const filtered = items.filter((i) => i.expiryDate && matchesFilter(i, null, 'store'))
    summaryCards = [
      { title: 'Expiring Items', value: filtered.length, format: 'number' },
      { title: 'Already Expired', value: filtered.filter((i) => new Date(i.expiryDate) < new Date()).length, format: 'number' }
    ]
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'expiryDate', header: 'Expiry Date', render: (r) => formatDate(r.expiryDate) },
      { key: 'batchNo', header: 'Batch No' }
    ]
    rows = filtered
  } else if (reportType === 'supplier-transactions') {
    const supplierMap = new Map()
    grns.forEach((g) => {
      if (!supplierMap.has(g.supplier)) {
        supplierMap.set(g.supplier, { supplier: g.supplier, grnsReceived: 0, itemsReceived: 0, totalValue: 0 })
      }
      const entry = supplierMap.get(g.supplier)
      entry.grnsReceived += 1
      g.items?.forEach((item) => {
        entry.itemsReceived += Number(item.qty) || 0
        entry.totalValue += Number(item.qty) * Number(item.unitPrice) || 0
      })
    })
    columns = [
      { key: 'supplier', header: 'Supplier' },
      { key: 'grnsReceived', header: 'GRNs Received' },
      { key: 'itemsReceived', header: 'Items Received' },
      { key: 'totalValue', header: 'Total Value', render: (r) => formatCurrency(r.totalValue) }
    ]
    rows = Array.from(supplierMap.values())
  } else if (reportType === 'inventory-valuation') {
    const filtered = items.filter((i) => matchesFilter(i, null, 'store'))
    const totalValue = filtered.reduce((s, i) => s + Number(i.qtyOnHand) * Number(i.unitPrice), 0)
    summaryCards = [
      { title: 'Total Inventory Value', value: totalValue, format: 'currency' },
      { title: 'Total Items', value: filtered.length, format: 'number' },
      { title: 'Avg Item Value', value: filtered.length > 0 ? totalValue / filtered.length : 0, format: 'currency' }
    ]
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) },
      { key: 'value', header: 'Total Value', render: (r) => formatCurrency(r.qtyOnHand * r.unitPrice) }
    ]
    rows = filtered
  } else if (reportType === 'stock-movement-value') {
    const filtered = transactions.filter((t) => {
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(t.date) > end) return false
      }
      return true
    })
    columns = [
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'item', header: 'Item' },
      { key: 'type', header: 'Type' },
      { key: 'ref', header: 'Reference' },
      { key: 'qtyIn', header: 'Qty In' },
      { key: 'qtyOut', header: 'Qty Out' },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) },
      { key: 'inValue', header: 'In Value', render: (r) => formatCurrency(r.qtyIn * r.unitPrice) },
      { key: 'outValue', header: 'Out Value', render: (r) => formatCurrency(r.qtyOut * r.unitPrice) }
    ]
    rows = filtered
  } else if (reportType === 'fifo-valuation') {
    const filtered = items.filter((i) => matchesFilter(i, null, 'store'))
    const totalFifo = filtered.reduce((s, i) => s + computeFifoValue(i.name, i.qtyOnHand, transactions, i.unitPrice), 0)
    summaryCards = [
      { title: 'FIFO Inventory Value', value: totalFifo, format: 'currency' },
      { title: 'Total Items', value: filtered.length, format: 'number' }
    ]
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'unitPrice', header: 'Current Unit Price', render: (r) => formatCurrency(r.unitPrice) },
      {
        key: 'fifoValue',
        header: 'FIFO Value',
        render: (r) => formatCurrency(computeFifoValue(r.name, r.qtyOnHand, transactions, r.unitPrice))
      }
    ]
    rows = filtered.map((item) => ({
      ...item,
      fifoValue: computeFifoValue(item.name, item.qtyOnHand, transactions, item.unitPrice)
    }))
  }

  const reportTitle = reportOptions.find((o) => o.value === reportType)?.label || 'Report'

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Operational reporting system with real-time data from all modules."
        actions={
          <Button variant="secondary" icon={Download} onClick={() => exportCsv(columns, rows)} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />

      {summaryCards.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card, idx) => (
            <Card key={idx} title={card.title}>
              <p className="text-2xl font-semibold text-ink-900">
                {card.format === 'currency' ? formatCurrency(card.value) : card.format === 'number' ? formatNumber(card.value) : card.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div>
            <label className="label">Report Type</label>
            <Select value={reportType} onChange={(e) => setReportType(e.target.value)} options={reportOptions} />
          </div>
          <div>
            <label className="label">Store</label>
            <Select value={filters.store} onChange={(e) => setFilters((p) => ({ ...p, store: e.target.value }))} options={storeOptions} />
          </div>
          <div>
            <label className="label">Category</label>
            <Select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))} options={categoryOptions} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
          <div>
            <label className="label">From date</label>
            <input type="date" className="input" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">To date</label>
            <input type="date" className="input" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => window.print()} icon={Printer}>
              Print
            </Button>
          </div>
        </div>

        <Table columns={columns} rows={rows} loading={loading} emptyTitle={`No data for ${reportTitle}`} emptyMessage="No records match the current filters." pageSize={10} />
      </div>
    </div>
  )
}
