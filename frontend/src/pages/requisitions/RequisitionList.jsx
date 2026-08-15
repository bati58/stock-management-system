import { useEffect, useMemo, useState } from 'react'
import { Plus, Eye, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import { requisitionService, storeService, itemService } from '../../services'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

const EMPTY_LINE = { item: '', qty: '' }

export default function RequisitionList() {
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

  const [header, setHeader] = useState({ department: '', store: '', date: '' })
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])

  async function load() {
    setLoading(true)
    const [reqs, storeList, itemList] = await Promise.all([requisitionService.list(), storeService.list(), itemService.list()])
    setRows(reqs)
    setStores(storeList)
    setItems(itemList)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => `${r.srRef} ${r.department} ${r.store}`.toLowerCase().includes(q))
  }, [rows, query])

  function openCreate() {
    setHeader({ department: '', store: '', date: '' })
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
      const srRef = `SR-2026-${String(40 + count).padStart(4, '0')}`
      await requisitionService.create({
        srRef,
        ...header,
        requestedBy: user?.name || 'Department Head',
        status: STATUS.PENDING,
        items: lines.filter((l) => l.item && l.qty)
      })
      push(`Requisition ${srRef} submitted for approval.`, 'success')
      setModalOpen(false)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function decide(row, status) {
    await requisitionService.update(row.id, { status })
    push(status === STATUS.APPROVED ? `${row.srRef} approved. Storekeeper can now create the issue voucher.` : `${row.srRef} rejected.`, status === STATUS.APPROVED ? 'success' : 'info')
    setViewing(null)
    await load()
  }

  async function handleDelete() {
    await requisitionService.remove(deleteTarget.id)
    push('Requisition deleted.', 'success')
    setDeleteTarget(null)
    await load()
  }

  const columns = [
    { key: 'srRef', header: 'SR Ref' },
    { key: 'department', header: 'Department' },
    { key: 'store', header: 'Store' },
    { key: 'requestedBy', header: 'Requested By' },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setViewing(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600">
            <Eye size={15} />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Store Requisitions"
        subtitle="Departments raise a store requisition and the PAO approves before issue."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            New Requisition
          </Button>
        }
      />

      <div className="card p-5">
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search SR ref, department..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No requisitions yet" emptyMessage="Submit a store requisition to request materials." />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Store Requisition"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Submit Requisition
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Requesting Department" required value={header.department} onChange={(e) => setHeader((h) => ({ ...h, department: e.target.value }))} />
            <Select label="Issuing Store" required options={stores.map((s) => s.name)} value={header.store} onChange={(e) => setHeader((h) => ({ ...h, store: e.target.value }))} />
            <Input label="Date" type="date" required value={header.date} onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label !mb-0">Items Requested</p>
              <Button type="button" variant="secondary" icon={Plus} onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
                Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-ink-100 p-3 sm:grid-cols-2">
                  <Select label="Item" options={items.map((i) => i.name)} value={line.item} onChange={(e) => updateLine(idx, { item: e.target.value })} />
                  <Input label="Quantity" type="number" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.srRef}
        footer={
          viewing?.status === STATUS.PENDING && (
            <>
              <Button variant="danger" icon={XCircle} onClick={() => decide(viewing, STATUS.REJECTED)}>
                Reject
              </Button>
              <Button icon={CheckCircle2} onClick={() => decide(viewing, STATUS.APPROVED)}>
                Approve
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department" value={viewing.department} />
              <Field label="Store" value={viewing.store} />
              <Field label="Requested By" value={viewing.requestedBy} />
              <Field label="Status" value={<StatusBadge status={viewing.status} />} />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="py-1">Item</th>
                  <th className="py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {viewing.items?.map((l, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    <td className="py-1.5">{l.item}</td>
                    <td className="py-1.5">{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} message={`Delete requisition "${deleteTarget?.srRef}"?`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-medium text-ink-800">{value ?? '-'}</p>
    </div>
  )
}
