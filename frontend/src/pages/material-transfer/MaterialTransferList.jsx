import CrudPage from '../../components/crud/CrudPage'
import StatusBadge from '../../components/ui/StatusBadge'
import { materialTransferService, storeService } from '../../services'
import { formatDate } from '../../utils/formatters'
import { STATUS } from '../../utils/constants'
import { useEffect, useState } from 'react'

export default function MaterialTransferList() {
  const [storeOptions, setStoreOptions] = useState([])
  useEffect(() => {
    storeService.list().then((stores) => setStoreOptions(stores.map((s) => s.name)))
  }, [])

  return (
    <CrudPage
      title="Material Transfers"
      subtitle="Initiate and approve stock transfers between stores (SRS Use Cases 21-22)."
      service={materialTransferService}
      addLabel="New Transfer Request"
      entityType="materialTransfers"
      searchKeys={['transferRef', 'fromStore', 'toStore', 'item']}
      emptyTitle="No transfer requests yet"
      emptyMessage="Create a transfer request between two stores."
      columns={[
        { key: 'transferRef', header: 'Transfer Ref' },
        { key: 'fromStore', header: 'From' },
        { key: 'toStore', header: 'To' },
        { key: 'item', header: 'Item' },
        { key: 'qty', header: 'Qty' },
        { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
      ]}
      fields={[
        { name: 'transferRef', label: 'Transfer Reference', required: true, placeholder: 'e.g. TRF-2026-0008' },
        { name: 'fromStore', label: 'From Store', type: 'select', required: true, options: storeOptions },
        { name: 'toStore', label: 'To Store', type: 'select', required: true, options: storeOptions },
        { name: 'item', label: 'Item', required: true },
        { name: 'qty', label: 'Quantity', type: 'number', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: Object.values(STATUS) }
      ]}
    />
  )
}
