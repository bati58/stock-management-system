import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Boxes,
  LogIn,
  ShieldCheck,
  BarChart3,
  PackageCheck,
  Lock
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/ui/Button'

const DEMO_ACCOUNTS = [
  'admin',
  'pao',
  'storehead',
  'storekeeper',
  'clerk',
  'tec',
  'depthead',
  'accountant',
  'security'
]

const FEATURES = [
  { icon: PackageCheck, label: 'Stock receiving & issuing' },
  { icon: BarChart3, label: 'Real-time inventory reports' },
  { icon: ShieldCheck, label: 'Role-based access control' }
]

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      push(`Welcome back, ${user.name.split(' ')[0]}.`, 'success')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(username) {
    setForm({ username, password: 'demo1234' })
    setError('')
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white" />
        </div>

        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-sm">
              <Boxes size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-brand-100">Institutional Platform</p>
              <p className="text-lg font-semibold text-white">Stock Management System</p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <h1 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              Inventory control built for accuracy and accountability
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-100">
              Manage receiving, issuing, transfers, valuation, and approvals in one secure workspace aligned with institutional stock procedures.
            </p>
          </div>

          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-brand-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 px-10 py-6 text-xs text-brand-200 xl:px-14">
          Stock Management System · Version 1.0 · © 2026
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-ink-50 to-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 lg:mx-0">
              <Boxes size={24} />
            </div>
            <h2 className="text-2xl font-bold text-ink-900">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">
              Enter your credentials to access your role workspace
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8"
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="label">
                  Username <span className="text-danger-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. storekeeper"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password <span className="text-danger-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger-50 bg-danger-50 px-3 py-2.5 text-sm text-danger-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-3" icon={LogIn} loading={loading}>
                Sign in to dashboard
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-ink-400">
              <Lock size={13} />
              <span>Secured session · Role-based access enforced</span>
            </div>
          </form>

          <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Demo access</p>
            <p className="mt-1 text-sm text-ink-600">
              Use any demo username below with a password of 4+ characters.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {account}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
