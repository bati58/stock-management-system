export default function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`card p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-bold text-ink-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
