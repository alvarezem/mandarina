// Funciones puras de la Watchlist.
// Normalización y validación de símbolos (misma regla que la edge `quotes`:
// mayúsculas sin espacios; MEP/CCL se resuelven aparte en la lista).

const SYMBOL_RE = /^[A-Z0-9.+=-]+$/
const MAX_SYMBOL_LEN = 12

export function normalizeSymbol(symbol) {
  return String(symbol ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function validateSymbol(symbol) {
  const clean = normalizeSymbol(symbol)
  if (!clean || clean.length > MAX_SYMBOL_LEN) return false
  return SYMBOL_RE.test(clean)
}
