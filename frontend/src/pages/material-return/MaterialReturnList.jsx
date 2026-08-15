import CrudPage from '../../components/crud/CrudPage'
import StatusBadge from '../../components/ui/StatusBadge'
import { materialReturnService } from '../../services'
import { formatDate } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'

export default function MaterialReturnList() {
  return (
    <CrudPage
      title="Material Returns (SRN)"
      subtitle="Create and track Store Return Notes for excess or unused materials (SRS Use Cases 18-20)."
      service={materialReturnService}
      addLabel="New Return Request"
      entityType="materialReturns"
      searchKeys={['srnRef', 'department', 'item']}
      emptyTitle="No return requests yet"
      emptyMessage="Create a Store Return Note when a department returns unused materials."
      columns={[
        { key: 'srnRef', header: 'SRN Ref' },
        { key: 'department', header: 'Department' },
        { key: 'item', header: 'Item' },
        { key: 'qty', header: 'Qty' },
        { key: 'reason', header: 'Reason' },
        { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
      ]}
      fields={[
        { name: 'srnRef', label: 'SRN Reference', required: true, placeholder: 'e.g. SRN-2026-0012' },
        { name: 'department', label: 'Department', required: true },
        { name: 'item', label: 'Item', required: true },
        { name: 'qty', label: 'Quantity', type: 'number', required: true },
        { name: 'reason', label: 'Reason for Return', type: 'textarea', fullWidth: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: Object.values(STATUS) }
      ]}
    />
  )
}
