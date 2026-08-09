// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'

const chart = (testId) => () => createElement('div', { 'data-testid': testId })

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
  });
}
