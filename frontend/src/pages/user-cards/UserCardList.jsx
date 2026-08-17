import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Lock, RotateCcw } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import { userCardService, userService, itemService } from '../../services'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { canPerformAction } from '../../utils/rolePermissions'
import { formatDate } from '../../utils/formatters'

const EMPTY_FORM = {
    user: '',
    department: '',
    item: '',
    issueRef: '',
    issueDate: '',
    qty: '',
    status: 'In Use',
    returnedDate: '',
    notes: ''
}

export default function UserCardList() {
    const { push } = useToast()
    const { user: currentUser } = useAuth()
    const [rows, setRows] = useState([])
    const [users, setUsers] = useState([])
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [viewing, setViewing] = useState(null)

    // Permission checks
    const canCreate = canPerformAction(currentUser?.role, 'create', 'userCards')
    const canEdit = canPerformAction(currentUser?.role, 'edit', 'userCards')
    const canDelete = canPerformAction(currentUser?.role, 'delete', 'userCards')

    async function load() {
        setLoading(true)
        const [cardsData, usersData, itemsData] = await Promise.all([
            userCardService.list(),
            userService.list(),
            itemService.list()
        ])
        setRows(cardsData)
        setUsers(usersData)
        setItems(itemsData)
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const filtered = useMemo(() => {
        if (!query.trim()) return rows
        const q = query.toLowerCase()
        return rows.filter((r) =>
            `${r.user} ${r.department} ${r.item} ${r.issueRef} ${r.status}`.toLowerCase().includes(q)
        )
    }, [rows, query])

    function openCreate() {
        if (!canCreate) {
            push('You do not have permission to create user cards.', 'error')
            return
        }
        setForm(EMPTY_FORM)
        setEditing(null)
        setModalOpen(true)
    }

    function openEdit(row) {
        if (!canEdit) {
            push('You do not have permission to edit user cards.', 'error')
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
            if (!form.user || !form.item || !form.issueRef || !form.issueDate) {
                throw new Error('Please fill in all required fields.')
            }

            const payload = {
                ...form,
                qty: Number(form.qty) || 1
            }

            if (editing) {
                await userCardService.update(editing.id, payload)
                push('User card updated.', 'success')
            } else {
                await userCardService.create(payload)
                push('User card created.', 'success')
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
            push('You do not have permission to delete user cards.', 'error')
            return
        }
        await userCardService.remove(deleteTarget.id)
        push('User card deleted.', 'success')
        setDeleteTarget(null)
        await load()
    }

    async function handleReturn(row) {
        if (!canEdit) {
            push('You do not have permission to update user cards.', 'error')
            return
        }
        await userCardService.update(row.id, {
            status: 'Returned',
            returnedDate: new Date().toISOString().split('T')[0]
        })
        push(`Material returned from ${row.user}.`, 'success')
        await load()
    }

    const columns = [
        { key: 'user', header: 'User Name' },
        { key: 'department', header: 'Department' },
        { key: 'item', header: 'Item Issued' },
        { key: 'qty', header: 'Qty', render: (r) => r.qty || 1 },
        { key: 'issueRef', header: 'Issue Reference' },
        { key: 'issueDate', header: 'Issue Date', render: (r) => formatDate(r.issueDate) },
        {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusBadge status={r.status === 'Returned' ? 'Completed' : r.status} />
        },
        {
            key: '__actions',
            header: '',
            className: 'text-right',
            render: (row) => {
                const actions = []

                if (canEdit) {
                    actions.push(
                        <button
                            key="edit"
                            onClick={() => openEdit(row)}
                            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil size={15} />
                        </button>
                    )
                }

                if (row.status === 'In Use' && canEdit) {
                    actions.push(
                        <button
                            key="return"
                            onClick={() => handleReturn(row)}
                            className="rounded-md p-1.5 text-success-600 hover:bg-success-50 transition-colors"
                            title="Mark as Returned"
                        >
                            <RotateCcw size={15} />
                        </button>
                    )
                }

                if (canDelete) {
                    actions.push(
                        <button
                            key="delete"
                            onClick={() => setDeleteTarget(row)}
                            className="rounded-md p-1.5 text-ink-500 hover:bg-danger-50 hover:text-danger-700 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    )
                }

                return actions.length ? <div className="flex justify-end gap-1">{actions}</div> : null
            }
        }
    ]

    return (
        <div>
            <PageHeader
                title="User Material Cards"
                subtitle="Track materials issued to individual users, including issue date, quantity, and return history."
                actions={canCreate ? <Button icon={Plus} onClick={openCreate}>Issue Material to User</Button> : null}
            />

            {!canCreate && !canEdit && !canDelete && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">Read-only access:</span> this role can view user card history but cannot issue, edit, or delete material cards.
                    </p>
                </div>
            )}

            <div className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search user, department, item, issue ref..."
                    />
                    <Badge className="bg-ink-100 text-ink-600">{filtered.length} card(s)</Badge>
                </div>
                <Table
                    columns={columns}
                    rows={filtered}
                    loading={loading}
                    emptyTitle="No user cards yet"
                    emptyMessage="Issue materials to users to start tracking. Each issue creates a user card record."
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit User Card' : 'Issue Material to User'}
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
                    <Select
                        label="User Name"
                        required
                        options={users.map((u) => u.name)}
                        value={form.user}
                        onChange={(e) => {
                            const selectedUser = users.find((u) => u.name === e.target.value)
                            setForm((f) => ({
                                ...f,
                                user: e.target.value,
                                department: selectedUser?.department || ''
                            }))
                        }}
                    />
                    <Input
                        label="Department"
                        value={form.department}
                        onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                        placeholder="Auto-filled from user"
                    />
                    <Select
                        label="Item Issued"
                        required
                        options={items.map((i) => i.name)}
                        value={form.item}
                        onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                    />
                    <Input
                        label="Quantity"
                        type="number"
                        required
                        value={form.qty}
                        onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                        placeholder="e.g. 1"
                    />
                    <Input
                        label="Issue Reference (SIV/Voucher Ref)"
                        required
                        placeholder="e.g. SIV-2026-0009"
                        value={form.issueRef}
                        onChange={(e) => setForm((f) => ({ ...f, issueRef: e.target.value }))}
                    />
                    <Input
                        label="Issue Date"
                        type="date"
                        required
                        value={form.issueDate}
                        onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                    />
                    <Select
                        label="Current Status"
                        options={['In Use', 'Maintenance', 'Lost', 'Damaged', 'Returned']}
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    />
                    {form.status === 'Returned' && (
                        <Input
                            label="Return Date"
                            type="date"
                            value={form.returnedDate}
                            onChange={(e) => setForm((f) => ({ ...f, returnedDate: e.target.value }))}
                        />
                    )}
                    <div className="sm:col-span-2">
                        <Input
                            label="Notes / Comments"
                            placeholder="e.g., Condition upon return, issue remarks..."
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                message={`Delete user card for "${deleteTarget?.user} - ${deleteTarget?.item}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    )
}
