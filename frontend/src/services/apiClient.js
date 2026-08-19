// ---------------------------------------------------------------------------
// HTTP client for the Express API.
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const RESOURCE_PATHS = {
  goodsReceipts: 'goods-receipts',
  stockTransactions: 'stock-transactions',
  binCards: 'bin-cards',
  binTransfers: 'bin-transfers',
  issueVouchers: 'issue-vouchers',
  materialReturns: 'material-returns',
  materialTransfers: 'material-transfers',
  fixedAssets: 'fixed-assets',
  userCards: 'user-cards',
  auditLogs: 'audit-logs'
}

function resourcePath(resource) {
  return RESOURCE_PATHS[resource] || resource
}

async function request(path, options = {}) {
  const token = localStorage.getItem('sms_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Request failed with status ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  list: (resource) => request(`/${resourcePath(resource)}`),
  get: (resource, id) => request(`/${resourcePath(resource)}/${id}`),
  create: (resource, data) => request(`/${resourcePath(resource)}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/${resourcePath(resource)}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  action: (resource, id, action, data) => request(`/${resourcePath(resource)}/${id}/${action}`, { method: 'POST', body: JSON.stringify(data) }),
  verifyGate: (resource, id) => request(`/gate-pass/${resourcePath(resource)}/${id}/verify`, { method: 'POST', body: JSON.stringify({}) }),
  remove: (resource, id) => request(`/${resourcePath(resource)}/${id}`, { method: 'DELETE' }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  changePassword: (credentials) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request('/auth/me')
}
