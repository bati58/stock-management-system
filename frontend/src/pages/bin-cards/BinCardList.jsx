import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import { binCardService } from '../../services'
import { formatDate, formatNumber } from '../../utils/formatters'

export default function BinCardList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    binCardService.list().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => `${r.bin} ${r.store} ${r.item}`.toLowerCase().includes(q))
  }, [rows, query])

  const columns = [
    { key: 'bin', header: 'Bin', render: (r) => <Badge className="bg-brand-50 text-brand-700">{r.bin}</Badge> },
    { key: 'store', header: 'Store' },
    { key: 'item', header: 'Item Stored' },
    { key: 'lastMovement', header: 'Last Movement', render: (r) => formatDate(r.lastMovement) },
    { key: 'balance', header: 'Quantity on Hand', render: (r) => formatNumber(r.balance) }
  ]

  return (
    <div>
      <PageHeader
        title="Bin Cards"
        subtitle="Auto-generated per bin/location, recording inbound/outbound movement and running balance (SRS Use Case 9)."
      />
      <div className="card p-5">
        <div className="mb-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search bin, store or item..." />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No bin cards yet" emptyMessage="Bin cards appear automatically once an item is assigned to a bin." />
      </div>
    </div>
  )
}
