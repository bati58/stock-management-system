import * as db from './localDb'

// Factory that produces a CRUD service bound to one collection.
// Every module service (stores, categories, items, ...) is created from
// this so the calling pages share one consistent async contract.
export function createEntityService(collection) {
  return {
    list: () => db.list(collection),
    get: (id) => db.get(collection, id),
    create: (record) => db.create(collection, record),
    update: (id, patch) => db.update(collection, id, patch),
    remove: (id) => db.remove(collection, id)
  }
}
