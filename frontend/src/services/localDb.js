// ---------------------------------------------------------------------------
// Mock persistence layer.
//
// The whole app talks to entity services (see services/*.service.js), never
// to localStorage directly. Every service exposes list/get/create/update/
// remove returning Promises, so swapping this file's guts for real
// axios/fetch calls to the Node/Express + PostgreSQL backend later does not
// require touching a single page or component.
//
// To switch to the real API: replace the body of each function below with
// the equivalent call in services/apiClient.js. Keep the function
// signatures identical.
// ---------------------------------------------------------------------------

const NAMESPACE = 'sms_v1_'
const LATENCY_MS = 250

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function read(collection) {
  const raw = localStorage.getItem(NAMESPACE + collection)
  return raw ? JSON.parse(raw) : null
}

function write(collection, data) {
  localStorage.setItem(NAMESPACE + collection, JSON.stringify(data))
}

export function seedIfEmpty(collection, seedData) {
  const existing = read(collection)
  if (!existing) {
    write(collection, seedData)
    return seedData
  }
  return existing
}

export function nextId(collection) {
  const rows = read(collection) || []
  const max = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0)
  return max + 1
}

export function list(collection) {
  return delay(read(collection) || [])
}

export function get(collection, id) {
  const rows = read(collection) || []
  return delay(rows.find((r) => String(r.id) === String(id)) || null)
}

export function create(collection, record) {
  const rows = read(collection) || []
  const row = { id: nextId(collection), createdAt: new Date().toISOString(), ...record }
  rows.unshift(row)
  write(collection, rows)
  return delay(row)
}

export function update(collection, id, patch) {
  const rows = read(collection) || []
  const idx = rows.findIndex((r) => String(r.id) === String(id))
  if (idx === -1) return delay(null)
  rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() }
  write(collection, rows)
  return delay(rows[idx])
}

export function remove(collection, id) {
  const rows = read(collection) || []
  const next = rows.filter((r) => String(r.id) !== String(id))
  write(collection, next)
  return delay(true)
}

export function resetAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NAMESPACE))
    .forEach((k) => localStorage.removeItem(k))
}
