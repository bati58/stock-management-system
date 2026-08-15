import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import StatusBadge from '../../components/ui/StatusBadge'
import { goodsReceiptService } from '../../services'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

export default function Evaluation() {
  const { push } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const grns = await goodsReceiptService.list()
    setRows(grns.filter((g) => g.status === STATUS.PENDING || g.status === STATUS.UNDER_EVALUATION))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openReview(row) {
    setTarget(row)
    setNote(row.evaluationNote || '')
  }

  async function decide(decision) {
    setSaving(true)
    try {
      await goodsReceiptService.update(target.id, {
        status: decision,
        evaluationNote: note || (decision === STATUS.APPROVED ? 'Inspected and accepted.' : 'Rejected - does not meet specification.'),
        evaluatedBy: user?.name || 'Technical Evaluation Committee'
      })
      push(
        decision === STATUS.APPROVED
          ? 'Materials approved. Property registration officer notified to generate the GRN.'
          : 'Materials rejected. Store head notified to arrange return to supplier.',
        decision === STATUS.APPROVED ? 'success' : 'info'
      )
      setTarget(null)
      await load()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'grnRef', header: 'GRN Ref' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'store', header: 'Store' },
    { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button variant="secondary" onClick={() => openReview(row)}>
          Review
        </Button>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Technical Evaluation"
        subtitle="Inspect materials awaiting evaluation and record an approve or reject decision."
      />

      <div className="card p-5">
        <Table
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle="Nothing pending evaluation"
          emptyMessage="All received materials have been evaluated."
        />
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Evaluate ${target.grnRef}` : ''}
        footer={
          <>
            <Button variant="danger" icon={XCircle} loading={saving} onClick={() => decide(STATUS.REJECTED)}>
              Reject
            </Button>
            <Button icon={CheckCircle2} loading={saving} onClick={() => decide(STATUS.APPROVED)}>
              Approve
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-400">Supplier</p>
                <p className="font-medium text-ink-800">{target.supplier}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400">Store</p>
                <p className="font-medium text-ink-800">{target.store}</p>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="py-1">Item</th>
                  <th className="py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {target.items?.map((l, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    <td className="py-1.5">{l.item}</td>
                    <td className="py-1.5">{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Textarea
              label="Evaluation Note"
              placeholder="Record inspection findings, quality/quantity checks, decision rationale..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
