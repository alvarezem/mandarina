// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { createSupabaseMock } from './test/setup'

// Mock global de supabase (Fase 6: 1 sola definición). Cada archivo de tests
// importa el cliente y setea comportamientos con mockTable()/auth/storage/functions.
const supabaseMock = createSupabaseMock()
vi.mock('./lib/supabaseClient', () => ({ __esModule: true, default: supabaseMock }))

const chart = (testId) => {
  const Chart = () => createElement('div', { 'data-testid': testId })
  Chart.displayName = `Chart-${testId}`
  return Chart
}

vi.mock('react-chartjs-2', () => ({
  Line: chart('chart-line'),
  Doughnut: chart('chart-doughnut'),
  Bar: chart('chart-bar'),
}))

// Node 26 exposes an experimental global `localStorage` (undefined without
// --localstorage-file). Vitest filters window keys that already exist in the
// global, so jsdom's localStorage never gets populated. Provide a mock.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom no implementa scrollIntoView (Dashboard.scrollToTable). No-op en tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
