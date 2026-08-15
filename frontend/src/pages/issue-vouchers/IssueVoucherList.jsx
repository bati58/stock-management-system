import { useEffect, useMemo, useState } from 'react'
import { Send, Eye, Printer } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import { issueVoucherService, requisitionService } from '../../services'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

export default function IssueVoucherList() {
  const { push } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [approvedReqs, setApprovedReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSr, setSelectedSr] = useState('')
  const [viewing, setViewing] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [vouchers, reqs] = await Promise.all([issueVoucherService.list(), requisitionService.list()])
    setRows(vouchers)
    setApprovedReqs(reqs.filter((r) => r.status === STATUS.APPROVED))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => `${r.sivRef} ${r.issuedTo} ${r.srRef}`.toLowerCase().includes(q))
  }, [rows, query])

  async function handleGenerate(e) {
    e.preventDefault()
    const req = approvedReqs.find((r) => r.srRef === selectedSr)
    if (!req) return
    setSaving(true)
    try {
      const count = rows.length + 1
      const sivRef = `SIV-2026-${String(9 + count).padStart(4, '0')}`
      const isInterStore = req.department.toLowerCase().includes('store')
      await issueVoucherService.create({
        sivRef,
        type: isInterStore ? 'ISIV' : 'SIV',
        srRef: req.srRef,
        issuedTo: req.department,
        issuedBy: user?.name || 'Storekeeper',
        date: new Date().toISOString().slice(0, 10),
        status: STATUS.ISSUED,
        items: req.items.map((l) => ({ item: l.item, qty: l.qty, unitPrice: 0 }))
      })
      push(`${sivRef} generated (Model 22) and stock levels updated.`, 'success')
      setModalOpen(false)
      setSelectedSr('')
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'sivRef', header: 'Voucher Ref' },
    { key: 'type', header: 'Type' },
    { key: 'srRef', header: 'From Requisition' },
    { key: 'issuedTo', header: 'Issued To' },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <button onClick={() => setViewing(row)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-600">
          <Eye size={15} />
        </button>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Issue Vouchers (SIV / ISIV)"
        subtitle="Generate issue vouchers from approved requisitions and update stock automatically."
        actions={
          <Button icon={Send} onClick={() => setModalOpen(true)} disabled={!approvedReqs.length}>
            Generate Voucher
          </Button>
        }
      />

      <div className="card p-5">
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search voucher ref..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No issue vouchers yet" emptyMessage="Approve a requisition first, then generate its issue voucher here." />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Issue Voucher"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} loading={saving} disabled={!selectedSr}>
              Generate
            </Button>
          </>
        }
      >
        <form onSubmit={handleGenerate}>
          <Select
            label="Approved Requisition"
            required
            options={approvedReqs.map((r) => ({ value: r.srRef, label: `${r.srRef} — ${r.department}` }))}
            value={selectedSr}
            onChange={(e) => setSelectedSr(e.target.value)}
          />
          {!approvedReqs.length && (
            <p className="mt-2 text-xs text-ink-400">No approved requisitions are currently awaiting issue.</p>
          )}
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.sivRef} footer={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>}>
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" value={viewing.type} />
              <Field label="From Requisition" value={viewing.srRef} />
              <Field label="Issued To" value={viewing.issuedTo} />
              <Field label="Issued By" value={viewing.issuedBy} />
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
