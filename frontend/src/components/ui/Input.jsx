export default function Input({ label, error, className = '', required, ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-danger-500 font-bold">*</span>}
        </label>
      )}
      <input className="input" {...rest} />
      {error && <p className="mt-2 text-xs text-danger-700 font-medium">{error}</p>}
    </div>
  )
}
