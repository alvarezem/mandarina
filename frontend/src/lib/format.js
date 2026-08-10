export function fmt(n, currency = 'ARS') {
  return n == null
    ? '—'
    : new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
}

export function fmtCompact(n, currency = 'ARS') {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    notation: 'compact',
  }).format(n)
}

export function fmtPct(n) {
  return `${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}
