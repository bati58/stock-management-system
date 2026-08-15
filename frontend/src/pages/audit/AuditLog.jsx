import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Table from '../../components/ui/Table'
import { auditLogService } from '../../services'

export default function AuditLog() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    auditLogService.list().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const moduleOptions = useMemo(() => {
    const uniqueModules = [...new Set(rows.map((row) => row.module).filter(Boolean))]
    return [
      { value: 'all', label: 'All Activity Types' },
      ...uniqueModules.map((module) => ({ value: module, label: module }))
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery = !query.trim() || `${row.user} ${row.action} ${row.module}`.toLowerCase().includes(query.toLowerCase())
      const matchesType = typeFilter === 'all' || row.module === typeFilter
      return matchesQuery && matchesType
    })
  }, [rows, query, typeFilter])

  const columns = [
    { key: 'date', header: 'Timestamp' },
    { key: 'user', header: 'User' },
    { key: 'module', header: 'Module' },
    { key: 'action', header: 'Action' }
  ]

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Track the latest user actions and system changes across all modules." />
      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-md">
            <SearchInput value={query} onChange={setQuery} placeholder="Search user, module, action..." />
          </div>
          <div className="w-full lg:max-w-xs">
            <Select
              label="Activity Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={moduleOptions}
              className="lg:w-64"
            />
          </div>
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No activity recorded" emptyMessage="Actions performed in the system will appear here." />
      </div>
    </div>
  )
}
