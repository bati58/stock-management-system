import CrudPage from '../../components/crud/CrudPage'
import StatusBadge from '../../components/ui/StatusBadge'
import { disposalService } from '../../services'
import { formatDate } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

export default function DisposalList() {
  return (
    <CrudPage
      title="Disposal Management"
      subtitle="Flag obsolete or damaged stock and manage the disposal workflow."
      service={disposalService}
      addLabel="Flag Item for Disposal"
      entityType="disposals"
      searchKeys={['disposalRef', 'item', 'store', 'reason']}
      emptyTitle="No disposal requests yet"
      emptyMessage="Flag a damaged or obsolete item to begin the disposal workflow."
      columns={[
        { key: 'disposalRef', header: 'Disposal Ref' },
        { key: 'item', header: 'Item' },
        { key: 'store', header: 'Store' },
        { key: 'qty', header: 'Qty' },
        { key: 'reason', header: 'Reason' },
        { key: 'dateFlagged', header: 'Date Flagged', render: (r) => formatDate(r.dateFlagged) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
      ]}
      fields={[
        { name: 'disposalRef', label: 'Disposal Reference', required: true, placeholder: 'e.g. DSP-2026-0004' },
        { name: 'item', label: 'Item', required: true },
        { name: 'store', label: 'Store', required: true },
        { name: 'qty', label: 'Quantity', type: 'number', required: true },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true, fullWidth: true },
        { name: 'dateFlagged', label: 'Date Flagged', type: 'date', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: Object.values(STATUS) }
      ]}
    />
  )
}
