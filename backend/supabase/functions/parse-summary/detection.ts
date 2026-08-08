const SUMMARY_TYPE_RULES: [RegExp, string][] = [
  [/visa/, 'VISA'],
  [/mastercard|\bmaster\b|\bmc\b/, 'MASTERCARD'],
  [/american ?express|\bamex\b/, 'AMEX'],
  [/mercado ?pago|mercadopago|\bmp\b|uala|brubank|naranja ?x|lemon|binance|belo|crypto/, 'Billetera virtual'],
  [/broker|bull|\biol\b|balanz|\bppi\b|cocos|adcap|del sur|socma|portfolio/, 'Broker'],
  [/banco|bbva|santander|galicia|nacion|provincia|frances|ciudad|hipotecario|macro|supervielle|patagonia|hsbc|comafi/, 'Banco'],
]

export function detectSummaryType(fileName: string | null | undefined, pdf: boolean): string | null {
  const n = (fileName ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  for (const [re, type] of SUMMARY_TYPE_RULES) {
    if (re.test(n)) return type
  }
  return pdf ? 'Banco' : null
}

export function detectPeriod(
  txs: { date: string | null }[],
): { period_month: number | null; period_year: number | null } {
  const counts = new Map<string, number>()
  for (const t of txs) {
    if (!t.date) continue
    const key = String(t.date).slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  }
  if (!best) return { period_month: null, period_year: null }
  const [year, month] = best.split('-')
  return { period_month: Number(month), period_year: Number(year) }
}
