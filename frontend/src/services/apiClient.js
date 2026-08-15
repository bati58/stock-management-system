// ---------------------------------------------------------------------------
// Real backend client (not wired in yet).
//
// Once the backend team exposes the REST API described in the SRS, point
// VITE_API_BASE_URL at it (see .env.example) and swap the bodies of the
// functions in localDb.js for the calls below, OR change entityService.js
// to call `api.list/get/create/update/remove` instead of `db.*`. Either
// change is localized to those two files — no page needs to change.
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

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
  list: (resource) => request(`/${resource}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, data) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}
