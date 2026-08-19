import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Search } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import StatusBadge from '../../components/ui/StatusBadge'
import { goodsReceiptService } from '../../services'
import { api } from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatters'
import { GRN_STATUS } from '../../utils/constants'

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
    try {
      const grns = await goodsReceiptService.list()
      setRows(grns.filter((g) => g.status === GRN_STATUS.PENDING_EVAL || g.status === GRN_STATUS.UNDER_EVAL))
    } catch (err) {
      push(err.message || 'Could not load evaluations.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function startReview(row) {
    if (row.status === GRN_STATUS.PENDING_EVAL) {
      await api.action('goodsReceipts', row.id, 'status', { status: GRN_STATUS.UNDER_EVAL })
      row.status = GRN_STATUS.UNDER_EVAL
    }
    setTarget(row)
    setNote(row.evaluationNote || '')
  }

  async function decide(decision) {
    setSaving(true)
    try {
      await api.action('goodsReceipts', target.id, 'evaluate', {
        decision: decision === GRN_STATUS.ACCEPTED ? 'Approved' : 'Rejected',
        evaluationNote: note || (decision === GRN_STATUS.ACCEPTED ? 'Inspected and accepted.' : 'Rejected - does not meet specification.')
      })
      push(
        decision === GRN_STATUS.ACCEPTED
          ? 'Materials accepted. Store head notified to generate the official receipt.'
          : 'Materials rejected. Store head notified to arrange return to supplier.',
        decision === GRN_STATUS.ACCEPTED ? 'success' : 'warning'
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
    { key: 'type', header: 'Material Type' },
    { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: '__actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <Button variant="secondary" onClick={() => startReview(row)} icon={Search}>
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
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={XCircle} loading={saving} onClick={() => decide(GRN_STATUS.REJECTED)}>
              Reject (Return to Supplier)
            </Button>
            <Button icon={CheckCircle2} loading={saving} onClick={() => decide(GRN_STATUS.ACCEPTED)}>
              Accept Materials
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-500 mb-0.5">Supplier</p>
                <p className="font-medium text-ink-900">{target.supplier}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 mb-0.5">Store</p>
                <p className="font-medium text-ink-900">{target.store}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 mb-0.5">Condition on Arrival</p>
                <p className="font-medium text-ink-900">{target.condition || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium text-ink-700">Items to Inspect</p>
              <table className="w-full text-left text-sm">
                <thead className="text-ink-500 border-b border-ink-100">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {target.items?.map((l, i) => (
                    <tr key={i} className="border-b border-ink-50">
                      <td className="py-2">{l.item}</td>
                      <td className="py-2">{l.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Textarea
              label="Evaluation Findings & Decision Note"
              required
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
