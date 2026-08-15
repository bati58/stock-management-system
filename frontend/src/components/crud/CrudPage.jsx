import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import PageHeader from '../ui/PageHeader'
import SearchInput from '../ui/SearchInput'
import Table from '../ui/Table'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { canPerformAction } from '../../utils/rolePermissions'

// Config-driven Create/Read/Update/Delete page.
// Used for the simpler reference-data modules (Stores, Categories, Users,
// Fixed Assets, Material Returns, Material Transfers, Disposal Requests)
// so those modules share one tested implementation instead of duplicating
// list + form + delete boilerplate five separate times.
export default function CrudPage({
  title,
  subtitle,
  service,
  columns,
  fields,
  searchKeys = [],
  addLabel = 'Add New',
  emptyTitle = 'No records yet',
  emptyMessage = 'Create the first record to get started.',
  extraActions,
  entityType // e.g., 'users', 'stores', 'categories' - used for permission checks
}) {
  const { push } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Permission checks
  const canCreate = entityType && canPerformAction(user?.role, 'create', entityType)
  const canEdit = entityType && canPerformAction(user?.role, 'edit', entityType)
  const canDelete = entityType && canPerformAction(user?.role, 'delete', entityType)

  async function load() {
    setLoading(true)
    const data = await service.list()
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      (searchKeys.length ? searchKeys : Object.keys(row)).some((key) =>
        String(row[key] ?? '').toLowerCase().includes(q)
      )
    )
  }, [rows, query, searchKeys])

  function openCreate() {
    if (!canCreate) {
      push('You do not have permission to create records.', 'error')
      return
    }
    const initial = {}
    fields.forEach((f) => {
      initial[f.name] = f.type === 'checkbox' ? true : ''
    })
    if (entityType === 'users') {
      initial.active = true
    }
    setForm(initial)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canEdit) {
      push('You do not have permission to edit records.', 'error')
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
      const payload = { ...form }
      if (entityType === 'users' && payload.active === undefined) {
        payload.active = true
      }

      if (entityType === 'users') {
        const normalizedUsername = String(payload.username || '').trim()
        if (!normalizedUsername) {
          throw new Error('Username is required.')
        }

        const duplicateUsername = rows.find((row) => {
          const sameUsername = String(row.username || '').trim().toLowerCase() === normalizedUsername.toLowerCase()
          return sameUsername && (!editing || String(row.id) !== String(editing.id))
        })

        if (duplicateUsername) {
          throw new Error(`Username "${normalizedUsername}" is already in use. Please choose another one.`)
        }

        payload.username = normalizedUsername
      }

      if (editing) {
        await service.update(editing.id, payload)
        push('Record updated successfully.', 'success')
      } else {
        await service.create(payload)
        push('Record created successfully.', 'success')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      push(err.message || 'Something went wrong.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      push('You do not have permission to delete records.', 'error')
      return
    }
    setDeleting(true)
    try {
      await service.remove(deleteTarget.id)
      push('Record deleted.', 'success')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      push(err.message || 'Could not delete record.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const tableColumns = [
    ...columns,
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
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {extraActions}
            {canCreate ? (
              <Button icon={Plus} onClick={openCreate}>
                {addLabel}
              </Button>
            ) : (
              <Button icon={Lock} variant="secondary" disabled>
                {addLabel}
              </Button>
            )}
          </>
        }
      />

      {!canCreate && !canEdit && !canDelete && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>View Only:</strong> Your role does not have permission to create, edit, or delete records in this section.
          </p>
        </div>
      )}

      <div className="card p-6">
        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="w-full sm:flex-1">
            <SearchInput value={query} onChange={setQuery} placeholder="Search records..." />
          </div>
          <p className="hidden text-sm font-medium text-ink-600 sm:block whitespace-nowrap">{filtered.length} record(s)</p>
        </div>
        <Table columns={tableColumns} rows={filtered} loading={loading} emptyTitle={emptyTitle} emptyMessage={emptyMessage} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title.replace(/s$/, '')}` : addLabel}
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
          {fields.map((f) => {
            const commonProps = {
              key: f.name,
              label: f.label,
              required: f.required,
              className: f.fullWidth ? 'sm:col-span-2' : '',
              value: form[f.name] ?? '',
              onChange: (e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))
            }
            if (f.type === 'select') {
              return <Select {...commonProps} options={f.options} placeholder={f.placeholder} />
            }
            if (f.type === 'textarea') {
              return <Textarea {...commonProps} />
            }
            return <Input {...commonProps} type={f.type || 'text'} placeholder={f.placeholder} />
          })}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete record"
        message={`Are you sure you want to delete "${deleteTarget?.name || deleteTarget?.code || deleteTarget?.id}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
