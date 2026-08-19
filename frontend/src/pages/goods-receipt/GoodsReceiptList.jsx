import { useEffect, useMemo, useState } from 'react'
import { Plus, Eye, Trash2, Send, FileText } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import { goodsReceiptService, storeService, itemService } from '../../services'
import { api } from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { GRN_STATUS } from '../../utils/constants'

const EMPTY_LINE = { item: '', qty: '', unitPrice: '' }

export default function GoodsReceiptList() {
  const { push } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [stores, setStores] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const [header, setHeader] = useState({ supplier: '', poRef: '', store: '', receivedDate: '', type: 'Consumable', docRef: '', condition: 'New' })
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])

  async function load() {
    setLoading(true)
    try {
      const [grns, storeList, itemList] = await Promise.all([goodsReceiptService.list(), storeService.list(), itemService.list()])
      setRows(grns)
      setStores(storeList)
      setItems(itemList)
    } catch (err) {
      push(err.message || 'Could not load goods receipts.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => `${r.grnRef} ${r.supplier} ${r.poRef} ${r.store}`.toLowerCase().includes(q))
  }, [rows, query])

  function openCreate() {
    setHeader({ supplier: '', poRef: '', store: '', receivedDate: '', type: 'Consumable', docRef: '', condition: 'New' })
    setLines([{ ...EMPTY_LINE }])
    setModalOpen(true)
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const count = rows.length + 1
      const grnRef = `GRN-2026-${String(count).padStart(4, '0')}`
      await goodsReceiptService.create({
        grnRef,
        ...header,
        receivedBy: user?.name || 'Storekeeper',
        status: GRN_STATUS.SUBMITTED,
        items: lines.filter((l) => l.item && l.qty),
        evaluationNote: '',
        evaluatedBy: ''
      })
      push(`Temporary receipt ${grnRef} created. You can now notify the Technical Evaluation Committee.`, 'success')
      setModalOpen(false)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleNotifyTEC(row) {
    await api.action('goodsReceipts', row.id, 'status', { status: GRN_STATUS.PENDING_EVAL })
    push(`TEC notified for ${row.grnRef}`, 'success')
    await load()
  }

  async function handleGenerateGRN(row) {
    try {
      await api.action('goodsReceipts', row.id, 'evaluate', { decision: 'Approved' })
      push(`Official Model 19 GRN Generated for ${row.grnRef}. Stock updated.`, 'success')
      await load()
    } catch (e) {
      push(e.message, 'error')
    }
  }

  async function handleDelete() {
    await goodsReceiptService.remove(deleteTarget.id)
    push('Receipt record removed.', 'success')
    setDeleteTarget(null)
    await load()
  }

  const columns = [
    { key: 'grnRef', header: 'GRN Ref' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'poRef', header: 'PO / Ref' },
    { key: 'store', header: 'Store' },
    { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1 items-center">
          {row.status === GRN_STATUS.SUBMITTED && (
            <button onClick={() => handleNotifyTEC(row)} className="rounded-md p-1.5 text-info-600 hover:bg-info-50" title="Notify TEC">
              <Send size={15} />
            </button>
          )}
          {row.status === GRN_STATUS.ACCEPTED && (
            <button onClick={() => handleGenerateGRN(row)} className="rounded-md p-1.5 text-success-600 hover:bg-success-50" title="Generate GRN (Model 19)">
              <FileText size={15} />
            </button>
          )}
          <button onClick={() => setViewing(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600" title="View">
            <Eye size={15} />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-danger-50 hover:text-danger-700" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Goods Receipt (GRN)"
        subtitle="Record incoming materials, verify against the purchase or donation, and hand off to technical evaluation."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Record Goods Receipt
          </Button>
        }
      />

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search GRN, supplier, PO..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No goods receipts yet" emptyMessage="Record a goods receipt when a supplier delivers materials." />
      </div>

      {/* Create GRN modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Goods Receipt"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Create Temporary Receipt
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Supplier / Donor" required value={header.supplier} onChange={(e) => setHeader((h) => ({ ...h, supplier: e.target.value }))} />
            <Input label="PO / Donation Ref" required value={header.poRef} onChange={(e) => setHeader((h) => ({ ...h, poRef: e.target.value }))} />
            <Input label="Supporting Document Ref" placeholder="e.g. Waybill-123" value={header.docRef} onChange={(e) => setHeader((h) => ({ ...h, docRef: e.target.value }))} />
            <Select label="Receiving Store" required options={stores.map((s) => s.name)} value={header.store} onChange={(e) => setHeader((h) => ({ ...h, store: e.target.value }))} />
            <Input label="Received Date" type="date" required value={header.receivedDate} onChange={(e) => setHeader((h) => ({ ...h, receivedDate: e.target.value }))} />
            <Select label="Material Type" required options={['Consumable', 'Fixed Asset']} value={header.type} onChange={(e) => setHeader((h) => ({ ...h, type: e.target.value }))} />
            <Select label="Condition on Arrival" options={['New', 'Good', 'Damaged']} value={header.condition} onChange={(e) => setHeader((h) => ({ ...h, condition: e.target.value }))} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label !mb-0">Items Received</p>
              <Button type="button" variant="secondary" icon={Plus} onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
                Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-ink-100 p-3 sm:grid-cols-3 bg-ink-50">
                  <Select
                    label="Item"
                    options={items.map((i) => i.name)}
                    value={line.item}
                    onChange={(e) => updateLine(idx, { item: e.target.value })}
                  />
                  <Input label="Quantity" type="number" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} />
                  <Input label="Unit Price" type="number" value={line.unitPrice} onChange={(e) => updateLine(idx, { unitPrice: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* View GRN modal */}
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.grnRef} size="lg">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Supplier" value={viewing.supplier} />
              <Field label="PO / Donation Ref" value={viewing.poRef} />
              <Field label="Supporting Document" value={viewing.docRef} />
              <Field label="Store" value={viewing.store} />
              <Field label="Material Type" value={viewing.type} />
              <Field label="Condition" value={viewing.condition} />
              <Field label="Received Date" value={formatDate(viewing.receivedDate)} />
              <Field label="Received By" value={viewing.receivedBy} />
              <Field label="Status" value={<StatusBadge status={viewing.status} />} />
            </div>
            <div>
              <p className="mb-2 font-medium text-ink-700">Items</p>
              <table className="w-full text-left text-sm">
                <thead className="text-ink-500 border-b border-ink-100">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Unit Price</th>
                    <th className="py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items?.map((l, i) => (
                    <tr key={i} className="border-b border-ink-50">
                      <td className="py-2">{l.item}</td>
                      <td className="py-2">{l.qty}</td>
                      <td className="py-2">{formatCurrency(l.unitPrice)}</td>
                      <td className="py-2">{formatCurrency(l.qty * l.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {viewing.evaluationNote && (
              <div className="rounded-lg bg-ink-50 p-4 border border-ink-100 mt-4">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Technical Evaluation</p>
                <p className="text-ink-800">{viewing.evaluationNote}</p>
                <p className="mt-2 text-xs text-ink-500">Evaluated by {viewing.evaluatedBy}</p>
              </div>
            )}
            {viewing.status === GRN_STATUS.GRN_GENERATED && (
              <div className="rounded-lg bg-success-50 p-4 border border-success-100 mt-4 flex items-center gap-3">
                <FileText className="text-success-600" />
                <div>
                  <p className="text-sm font-semibold text-success-800">Official Model 19 GRN Generated</p>
                  <p className="text-xs text-success-700">Stock cards and bin cards have been updated.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        message={`Delete receipt "${deleteTarget?.grnRef}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-500 mb-0.5">{label}</p>
      <p className="font-medium text-ink-900">{value ?? '-'}</p>
    </div>
  )
}
