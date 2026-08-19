import { Search } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 w-full"
      />
    </div>
  )
}
