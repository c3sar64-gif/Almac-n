import '@testing-library/jest-dom'

// Node 25 expone un localStorage global experimental incompleto que opaca el de
// jsdom en los tests; si le faltan métodos, lo reemplazamos por un stub completo.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const datos = new Map<string, string>()
  const stub: Storage = {
    getItem: k => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, String(v)),
    removeItem: k => void datos.delete(k),
    clear: () => datos.clear(),
    key: i => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true })
}
