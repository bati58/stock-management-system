import CrudPage from '../../components/crud/CrudPage'
import StatusBadge from '../../components/ui/StatusBadge'
import { storeService } from '../../services'

export default function StoreList() {
  return (
    <CrudPage
      title="Stores"
      subtitle="Manage the main store and each department / cafe store (SRS Use Case 1)."
      service={storeService}
      addLabel="Add Store" entityType="stores" searchKeys={['name', 'code', 'type', 'location']}
      emptyTitle="No stores yet"
      emptyMessage="Register the main store and department stores to get started."
      columns={[
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Store Name' },
        { key: 'type', header: 'Type' },
        { key: 'location', header: 'Location' },
        { key: 'headOfStore', header: 'Store Head' },
        {
          key: 'active',
          header: 'Status',
          render: (row) => <StatusBadge status={row.active ? 'Approved' : 'Cancelled'} />
        }
      ]}
      fields={[
        { name: 'name', label: 'Store Name', required: true },
        { name: 'code', label: 'Store Code', required: true, placeholder: 'e.g. STR-EEE' },
        {
          name: 'type',
          label: 'Store Type',
          type: 'select',
          required: true,
          options: ['Main Store', 'Department Store', 'Cafe Store']
        },
        { name: 'location', label: 'Physical Location', required: true },
        { name: 'headOfStore', label: 'Store Head', required: true }
      ]}
    />
  )
}
