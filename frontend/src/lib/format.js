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

export function fmtPct(n, lang = 'es') {
  const locale = lang === 'en' ? 'en-US' : 'es-AR'
  return `${(Number(n) || 0).toLocaleString(locale, { maximumFractionDigits: 1 })}%`
}

export function fileOf(t) {
  const cs = t.card_summaries
  if (!cs) return null
  return Array.isArray(cs) ? (cs[0]?.file_name ?? null) : (cs.file_name ?? null)
}
