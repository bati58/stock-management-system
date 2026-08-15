import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { itemService, categoryService, storeService } from '../../services'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { canPerformAction } from '../../utils/rolePermissions'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import { UNITS } from '../../utils/constants'

const EMPTY_FORM = {
  code: '',
  name: '',
  category: '',
  store: '',
  bin: '',
  unit: '',
  minLevel: '',
  maxLevel: '',
  reorderLevel: '',
  qtyOnHand: '',
  unitPrice: ''
}

export default function ItemList() {
  const { push } = useToast()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Permission checks
  const canCreate = canPerformAction(user?.role, 'create', 'items')
  const canEdit = canPerformAction(user?.role, 'edit', 'items')
  const canDelete = canPerformAction(user?.role, 'delete', 'items')

  async function load() {
    setLoading(true)
    const [itemsData, categoriesData, storesData] = await Promise.all([
      itemService.list(),
      categoryService.list(),
      storeService.list()
    ])
    setItems(itemsData)
    setCategories(categoriesData)
    setStores(storesData)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((i) => `${i.code} ${i.name} ${i.category} ${i.store}`.toLowerCase().includes(q))
  }, [items, query])

  function openCreate() {
    if (!canCreate) {
      push('You do not have permission to create items.', 'error')
      return
    }
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canEdit) {
      push('You do not have permission to edit items.', 'error')
      return
    }
    setForm(row)
    setEditing(row)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        minLevel: Number(form.minLevel) || 0,
        maxLevel: Number(form.maxLevel) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        qtyOnHand: Number(form.qtyOnHand) || 0,
        unitPrice: Number(form.unitPrice) || 0
      }
      if (editing) {
        await itemService.update(editing.id, payload)
        push('Item updated.', 'success')
      } else {
        await itemService.create(payload)
        push('Item created.', 'success')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      push('You do not have permission to delete items.', 'error')
      return
    }
    await itemService.remove(deleteTarget.id)
    push('Item deleted.', 'success')
    setDeleteTarget(null)
    await load()
  }

  const columns = [
    { key: 'code', header: 'Item Code' },
    { key: 'name', header: 'Item Name' },
    { key: 'category', header: 'Category' },
    { key: 'store', header: 'Store' },
    { key: 'bin', header: 'Bin/Location' },
    {
      key: 'qtyOnHand',
      header: 'Qty on Hand',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{formatNumber(r.qtyOnHand)} {r.unit}</span>
          {Number(r.qtyOnHand) <= Number(r.reorderLevel) && (
            <span title="At or below reorder level">
              <AlertTriangle size={14} className="text-amber-500" />
            </span>
          )}
        </div>
      )
    },
    { key: 'unitPrice', header: 'Unit Price', render: (r) => formatCurrency(r.unitPrice) },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {canEdit ? (
            <button
              onClick={() => openEdit(row)}
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600 transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
          ) : (
            <button
              disabled
              className="rounded-md p-1.5 text-ink-300 cursor-not-allowed"
              title="No edit permission"
            >
              <Pencil size={15} />
            </button>
          )}
          {canDelete ? (
            <button
              onClick={() => setDeleteTarget(row)}
              className="rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <button
              disabled
              className="rounded-md p-1.5 text-ink-300 cursor-not-allowed"
              title="No delete permission"
            >
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
        title="Items & Locations"
        subtitle="Maintain the item master, its bin location, and min/max/reorder levels."
        actions={
          canCreate ? (
            <Button icon={Plus} onClick={openCreate}>
              Add Item
            </Button>
          ) : (
            <Button icon={Lock} variant="secondary" disabled>
              Add Item
            </Button>
          )
        }
      />

      {!canCreate && !canEdit && !canDelete && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>View Only:</strong> Your role does not have permission to create, edit, or delete items.
          </p>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search item code, name, category..." />
          <Badge className="bg-ink-100 text-ink-600">{filtered.length} item(s)</Badge>
        </div>
        <Table
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyTitle="No items yet"
          emptyMessage="Add an item to the catalog to start tracking stock."
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Item' : 'Add Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Item Code" required placeholder="e.g. 4402-001-001" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input label="Item Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select
            label="Category"
            required
            options={categories.map((c) => c.name)}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Select
            label="Store"
            required
            options={stores.map((s) => s.name)}
            value={form.store}
            onChange={(e) => setForm((f) => ({ ...f, store: e.target.value }))}
          />
          <Input label="Bin / Location" required placeholder="e.g. A-01" value={form.bin} onChange={(e) => setForm((f) => ({ ...f, bin: e.target.value }))} />
          <Select label="Unit of Issue" required options={UNITS} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          <Input label="Quantity on Hand" type="number" required value={form.qtyOnHand} onChange={(e) => setForm((f) => ({ ...f, qtyOnHand: e.target.value }))} />
          <Input label="Unit Price (Birr)" type="number" required value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
          <Input label="Minimum Level" type="number" value={form.minLevel} onChange={(e) => setForm((f) => ({ ...f, minLevel: e.target.value }))} />
          <Input label="Reorder Level" type="number" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))} />
          <Input label="Maximum Level" type="number" value={form.maxLevel} onChange={(e) => setForm((f) => ({ ...f, maxLevel: e.target.value }))} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        message={`Delete item "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
