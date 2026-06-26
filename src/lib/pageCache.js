/** In-memory cache so tab switches show the last view instantly, then refresh quietly. */

const store = new Map()

export function readPageCache(key) {
  return store.get(key)
}

export function writePageCache(key, value) {
  store.set(key, value)
}

export function clearPageCache() {
  store.clear()
}

export function invalidatePageCache(key) {
  store.delete(key)
}
