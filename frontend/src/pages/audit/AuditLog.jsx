import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import { auditLogService } from '../../services'

export default function AuditLog() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    auditLogService.list().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => `${r.user} ${r.action} ${r.module}`.toLowerCase().includes(q))
  }, [rows, query])

  const columns = [
    { key: 'date', header: 'Timestamp' },
    { key: 'user', header: 'User' },
    { key: 'module', header: 'Module' },
    { key: 'action', header: 'Action' }
  ]

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Read-only trail of user activity and system changes across all modules." />
      <div className="card p-5">
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search user, module, action..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No activity recorded" emptyMessage="Actions performed in the system will appear here." />
      </div>
    </div>
  )
}
