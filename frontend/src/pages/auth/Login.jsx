import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Boxes, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Boxes size={24} />
          </div>
          <h1 className="text-xl font-semibold text-ink-900">Stock Management System</h1>
          <p className="text-sm text-ink-500">Sign in to manage stores, stock and requisitions</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <Input
            label="Username"
            required
            placeholder="e.g. storekeeper"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" icon={LogIn} loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 rounded-lg border border-dashed border-ink-200 bg-white p-4 text-xs text-ink-500">
          <p className="mb-1 font-medium text-ink-600">Demo accounts (any password, 4+ chars):</p>
          <p>admin · pao · storehead · storekeeper · clerk · tec · depthead · accountant</p>
        </div>
      </div>
    </div>
  )
}
