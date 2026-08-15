import { useEffect, useMemo, useState } from 'react'
import { Printer, Download } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import { itemService, stockTransactionService, goodsReceiptService, requisitionService } from '../../services'
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters'

const REPORT_TYPES = [
  { value: 'inventory-summary', label: 'Inventory Summary (value by item)' },
  { value: 'low-stock', label: 'Low / Reorder Level Stock' },
  { value: 'stock-movement', label: 'Stock Movement (receipts & issues)' },
  { value: 'grn-status', label: 'Goods Receipt Status Report' },
  { value: 'requisition-status', label: 'Requisition Status Report' }
]

export default function Reports() {
  const [reportType, setReportType] = useState('inventory-summary')
  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [grns, setGrns] = useState([])
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([itemService.list(), stockTransactionService.list(), goodsReceiptService.list(), requisitionService.list()]).then(
      ([i, t, g, r]) => {
        setItems(i)
        setTransactions(t)
        setGrns(g)
        setReqs(r)
        setLoading(false)
      }
    )
  }, [])

  const totalValue = useMemo(() => items.reduce((sum, i) => sum + Number(i.qtyOnHand) * Number(i.unitPrice), 0), [items])

  function exportCsv(columns, rows) {
    const header = columns.map((c) => c.header).join(',')
    const body = rows
      .map((row) => columns.map((c) => `"${String(c.render ? c.render(row) : row[c.key]).replace(/<[^>]+>/g, '')}"`).join(','))
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  let columns = []
  let rows = []

  if (reportType === 'inventory-summary') {
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty on Hand', render: (r) => formatNumber(r.qtyOnHand) },
      { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) },
      { key: 'value', header: 'Total Value', render: (r) => formatCurrency(r.qtyOnHand * r.unitPrice) }
    ]
    rows = items
  } else if (reportType === 'low-stock') {
    columns = [
      { key: 'code', header: 'Item Code' },
      { key: 'name', header: 'Item Name' },
      { key: 'store', header: 'Store' },
      { key: 'qtyOnHand', header: 'Qty on Hand' },
      { key: 'reorderLevel', header: 'Reorder Level' }
    ]
    rows = items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel))
  } else if (reportType === 'stock-movement') {
    columns = [
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'item', header: 'Item' },
      { key: 'type', header: 'Type' },
      { key: 'ref', header: 'Reference' },
      { key: 'qtyIn', header: 'Qty In' },
      { key: 'qtyOut', header: 'Qty Out' },
      { key: 'balance', header: 'Balance' }
    ]
    rows = transactions
  } else if (reportType === 'grn-status') {
    columns = [
      { key: 'grnRef', header: 'GRN Ref' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'store', header: 'Store' },
      { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
      { key: 'status', header: 'Status' }
    ]
    rows = grns
  } else if (reportType === 'requisition-status') {
    columns = [
      { key: 'srRef', header: 'SR Ref' },
      { key: 'department', header: 'Department' },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
      { key: 'status', header: 'Status' }
    ]
    rows = reqs
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate, print and export inventory reports (SRS: Report Management)." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Inventory Value" className="sm:col-span-1">
          <p className="text-2xl font-semibold text-ink-900">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-ink-400">Across {items.length} item(s)</p>
        </Card>
        <Card title="Items at/below reorder" className="sm:col-span-1">
          <p className="text-2xl font-semibold text-amber-600">{items.filter((i) => Number(i.qtyOnHand) <= Number(i.reorderLevel)).length}</p>
          <p className="text-sm text-ink-400">Needs replenishment action</p>
        </Card>
        <Card title="Open Goods Receipts" className="sm:col-span-1">
          <p className="text-2xl font-semibold text-blue-600">{grns.filter((g) => g.status !== 'Approved' && g.status !== 'Rejected').length}</p>
          <p className="text-sm text-ink-400">Pending or under evaluation</p>
        </Card>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Select label="Report Type" className="sm:w-80" options={REPORT_TYPES} value={reportType} onChange={(e) => setReportType(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={() => exportCsv(columns, rows)}>
              Export CSV
            </Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>
        <Table columns={columns} rows={rows} loading={loading} emptyTitle="No data" emptyMessage="No records match this report yet." pageSize={10} />
      </div>
    </div>
  )
}
