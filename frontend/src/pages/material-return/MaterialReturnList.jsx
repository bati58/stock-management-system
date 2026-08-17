import { useEffect, useMemo, useState } from 'react'
import { Plus, Eye, CheckCircle2, XCircle, Trash2, Printer } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import { materialReturnService, storeService, itemService } from '../../services'
import { workflowEngine } from '../../services/workflowEngine'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'
import { RETURN_STATUS, ROLES } from '../../utils/constants'

const EMPTY_LINE = { item: '', qty: '', condition: 'Good', reason: 'Excess' }

export default function MaterialReturnList() {
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

  const isStorekeeper = user?.role === ROLES.STOREKEEPER || user?.role === ROLES.STORE_HEAD
  const canReview = isStorekeeper

  async function load() {
    setLoading(true)
    const [returns, storeList, itemList] = await Promise.all([materialReturnService.list(), storeService.list(), itemService.list()])
    setRows(returns)
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
    return rows.filter((r) => `${r.srnRef} ${r.department} ${r.store}`.toLowerCase().includes(q))
  }, [rows, query])

  function openCreate() {
    setHeader({
      department: user?.department || '',
      store: '',
      date: new Date().toISOString().slice(0, 10)
    })
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
      const srnRef = `SRN-2026-${String(count).padStart(4, '0')}`
      await materialReturnService.create({
        srnRef,
        ...header,
        returnedBy: user?.name || 'Department Head',
        status: RETURN_STATUS.SUBMITTED,
        items: lines.filter((l) => l.item && l.qty)
      })
      push(`Store Return Note ${srnRef} submitted.`, 'success')
      setModalOpen(false)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDecide(status) {
    if (!canReview) {
      push('Only store personnel can review returns.', 'error')
      return
    }

    setSaving(true)
    try {
      await materialReturnService.update(viewing.id, { status })
      
      if (status === RETURN_STATUS.RETURNED_TO_STOCK) {
        await workflowEngine.approveReturn(viewing.id, user)
        push(`${viewing.srnRef} accepted. Materials returned to active stock.`, 'success')
      } else {
        push(`${viewing.srnRef} rejected.`, 'info')
      }
      
      setViewing(null)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await materialReturnService.remove(deleteTarget.id)
    push('Return request deleted.', 'success')
    setDeleteTarget(null)
    await load()
  }

  const columns = [
    { key: 'srnRef', header: 'SRN Ref' },
    { key: 'department', header: 'Department' },
    { key: 'store', header: 'Store' },
    { key: 'returnedBy', header: 'Returned By' },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1 items-center">
          <button onClick={() => setViewing(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600">
            <Eye size={15} />
          </button>
          {row.status === RETURN_STATUS.SUBMITTED && (
            <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-danger-50 hover:text-danger-700">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Material Returns (SRN)"
        subtitle="Process unused, defective, or excess materials returned by departments."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            New Return Request
          </Button>
        }
      />

      <div className="card p-5">
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search SRN ref, department..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No returns yet" emptyMessage="Create a Store Return Note when a department returns unused materials." />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Store Return Note"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Submit Return Note
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Returning Department" required value={header.department} onChange={(e) => setHeader((h) => ({ ...h, department: e.target.value }))} />
            <Select label="Returning To Store" required options={stores.map((s) => s.name)} value={header.store} onChange={(e) => setHeader((h) => ({ ...h, store: e.target.value }))} />
            <Input label="Date" type="date" required value={header.date} onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label !mb-0">Materials to Return</p>
              <Button type="button" variant="secondary" icon={Plus} onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
                Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-ink-100 p-3 sm:grid-cols-4">
                  <Select label="Item" options={items.map((i) => i.name)} value={line.item} onChange={(e) => updateLine(idx, { item: e.target.value })} />
                  <Input label="Quantity" type="number" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} />
                  <Select label="Reason" options={['Excess', 'Defective', 'Expired', 'Wrong Item']} value={line.reason} onChange={(e) => updateLine(idx, { reason: e.target.value })} />
                  <Select label="Condition" options={['Good', 'Damaged', 'Usable']} value={line.condition} onChange={(e) => updateLine(idx, { condition: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.srnRef}
        size="lg"
        footer={
          viewing?.status === RETURN_STATUS.SUBMITTED && canReview ? (
            <>
              <Button variant="danger" icon={XCircle} loading={saving} onClick={() => handleDecide(RETURN_STATUS.REJECTED)}>
                Reject Return
              </Button>
              <Button icon={CheckCircle2} loading={saving} onClick={() => handleDecide(RETURN_STATUS.RETURNED_TO_STOCK)}>
                Accept to Stock
              </Button>
            </>
          ) : (
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print SRN</Button>
          )
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Department" value={viewing.department} />
              <Field label="Store" value={viewing.store} />
              <Field label="Returned By" value={viewing.returnedBy} />
              <Field label="Status" value={<StatusBadge status={viewing.status} />} />
            </div>
            <div>
              <p className="mb-2 font-medium text-ink-700">Returned Materials</p>
              <table className="w-full text-left text-sm border border-ink-100 rounded">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="p-2 font-medium">Item</th>
                    <th className="p-2 font-medium">Qty</th>
                    <th className="p-2 font-medium">Reason</th>
                    <th className="p-2 font-medium">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {viewing.items?.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2">{l.item}</td>
                      <td className="p-2">{l.qty}</td>
                      <td className="p-2">{l.reason}</td>
                      <td className="p-2">{l.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {viewing.status === RETURN_STATUS.SUBMITTED && canReview && (
                <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-brand-800">
                  <p className="font-medium text-sm mb-1">Storekeeper Review Required</p>
                  <p className="text-xs text-brand-600">
                    Verify the physical items. If you choose "Accept to Stock", the items will be added back to the inventory and the bin card will be updated.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} message={`Delete return request "${deleteTarget?.srnRef}"?`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
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
