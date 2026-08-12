// Funciones puras de parseo de resúmenes (sin I/O ni dependencias de red).
// Extraídas de parse-summary/index.ts para poder testearlas unitariamente.

import { HEADER_ALIASES, matchExact } from '../_shared/normalize.ts'

export type ParsedRow = {
  date: string
  merchant: string
  amount: number
}

export type Transaction = ParsedRow & {
  currency: 'ARS' | 'USD'
  category: string
}

export type ColumnMap = { date: number; merchant: number; amount: number }

export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim())
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = 0
  for (const sep of candidates) {
    const count = firstLine ? firstLine.split(sep).length - 1 : 0
    if (count > bestCount) {
      bestCount = count
      best = sep
    }
  }
  return best
}

export function findColumns(row: unknown[]): ColumnMap {
  const date = row.findIndex((cell) =>
    HEADER_ALIASES.date.some((a) => matchExact(cell, a))
  )
  const merchant = row.findIndex((cell) =>
    HEADER_ALIASES.merchant.some((a) => matchExact(cell, a))
  )
  const amount = row.findIndex((cell) =>
    HEADER_ALIASES.amount.some((a) => matchExact(cell, a))
  )
  return { date, merchant, amount }
}

const MONTHS: Record<string, string> = {
  ene: '01',
  feb: '02',
  mar: '03',
  abr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dic: '12',
}

export function parseDate(value: unknown): string | null {
  if (!value) return null
  const mon = String(value).trim().match(
    /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/,
  )
  if (mon) {
    const mm = MONTHS[mon[2].slice(0, 3).toLowerCase()]
    if (mm) {
      const yy = mon[3].length === 2 ? String(2000 + Number(mon[3])) : mon[3]
      return `${yy}-${mm}-${mon[1].padStart(2, '0')}`
    }
  }
  const ddmm = String(value).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (ddmm) {
    return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`
  }
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}

export function parseAmount(value: unknown): number | null {
  if (!value) return null
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^\d.,\-]/g, '')
  if (cleaned === '' || cleaned === '-') return null
  const sign = cleaned.startsWith('-') ? -1 : 1
  const digits = cleaned.replace('-', '')

  let normalized
  if (digits.includes('.') && digits.includes(',')) {
    const lastComma = digits.lastIndexOf(',')
    const lastDot = digits.lastIndexOf('.')
    normalized = lastComma > lastDot
      ? digits.replace(/\./g, '').replace(',', '.')
      : digits.replace(/,/g, '')
  } else if (digits.includes(',')) {
    normalized = digits.replace(',', '.')
  } else if (digits.includes('.')) {
    const parts = digits.split('.')
    normalized = parts.length === 2 && parts[1].length <= 2
      ? digits
      : digits.replace(/\./g, '')
  } else {
    normalized = digits
  }

  const n = Number(normalized) * sign
  return Number.isFinite(n) ? n : null
}

export function normalizeRow(
  row: unknown[],
  columns: ColumnMap,
): ParsedRow | null {
  if (!Array.isArray(row)) return null

  const cells = row.map((c) => String(c ?? '').trim())
  if (cells.every((c) => c === '')) return null

  const date = parseDate(cells[columns.date])
  const merchant = columns.merchant >= 0
    ? cells[columns.merchant]
    : 'Sin descripción'
  const amount = parseAmount(cells[columns.amount])

  if (!date || amount === null) return null

  return { date, merchant: merchant || 'Sin descripción', amount }
}

export function mapRows(rows: unknown[][]): ParsedRow[] {
  const headerIdx = rows.findIndex((row) =>
    Array.isArray(row) &&
    row.some((cell) => HEADER_ALIASES.date.some((a) => matchExact(cell, a)))
  )
  if (headerIdx === -1) return []

  const columns = findColumns(rows[headerIdx])
  if (columns.amount === -1) return []

  return rows.slice(headerIdx + 1)
    .map((row) => normalizeRow(row, columns))
    .filter((r): r is ParsedRow => r !== null)
}

export function computeTotals(txs: Transaction[]) {
  let credits = 0
  let debits = 0
  for (const tx of txs) {
    if (tx.amount >= 0) credits += tx.amount
    else debits += tx.amount
  }
  return {
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    net: Math.round((credits + debits) * 100) / 100,
    txCount: txs.length,
  }
}

export function aggregate(txs: Transaction[], kind: 'merchant' | 'category') {
  const map = new Map<
    string,
    { count: number; total: number; [key: string]: string | number }
  >()
  for (const tx of txs) {
    const key = kind === 'merchant' ? tx.merchant : tx.category
    const e = map.get(key) || { [kind]: key, count: 0, total: 0 }
    e.count += 1
    e.total += tx.amount
    map.set(key, e)
  }
  return [...map.values()]
}

export function buildAnalysis(txs: Transaction[]) {
  const ars = txs.filter((t) => t.currency !== 'USD')
  const usd = txs.filter((t) => t.currency === 'USD')

  const dates = ars.map((t) => t.date).sort()
  const from = dates[0] ?? null
  const to = dates[dates.length - 1] ?? null
  const days = (() => {
    if (!to || !from) return 1
    return Math.max(
      1,
      Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
      ) + 1,
    )
  })()

  const totals: ReturnType<typeof computeTotals> & { avgPerDay?: number } =
    computeTotals(ars)
  totals.avgPerDay = Math.round((totals.net * 100) / days) / 100

  let maxExpense: { amount: number; merchant: string; date: string } | null =
    null
  let maxCredit: { amount: number; merchant: string; date: string } | null =
    null
  const byDay = new Map<
    string,
    { date: string; credits: number; debits: number }
  >()
  for (const tx of ars) {
    const d = byDay.get(tx.date) || { date: tx.date, credits: 0, debits: 0 }
    if (tx.amount >= 0) d.credits += tx.amount
    else d.debits += tx.amount
    byDay.set(tx.date, d)

    if (maxExpense === null || tx.amount < maxExpense.amount) {
      maxExpense = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
    if (maxCredit === null || tx.amount > maxCredit.amount) {
      maxCredit = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
  }

  const byDaySorted = [...byDay.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  let running = 0
  const balanceTrend = byDaySorted.map((d) => {
    running += d.credits + d.debits
    return { date: d.date, runningBalance: Math.round(running * 100) / 100 }
  })

  const result: {
    period: { from: string | null; to: string | null; days: number }
    totals: ReturnType<typeof computeTotals> & { avgPerDay?: number }
    maxExpense: typeof maxExpense
    maxCredit: typeof maxCredit
    byMerchant: { [key: string]: string | number }[]
    byCategory: { [key: string]: string | number }[]
    byDay: { date: string; credits: number; debits: number }[]
    balanceTrend: { date: string; runningBalance: number }[]
    usd?: {
      totals: ReturnType<typeof computeTotals>
      byCategory: { [key: string]: string | number }[]
    }
  } = {
    period: { from, to, days },
    totals,
    maxExpense,
    maxCredit,
    byMerchant: aggregate(ars, 'merchant')
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 10),
    byCategory: aggregate(ars, 'category').sort((a, b) => b.total - a.total),
    byDay: byDaySorted,
    balanceTrend,
  }

  if (usd.length > 0) {
    result.usd = {
      totals: computeTotals(usd),
      byCategory: aggregate(usd, 'category').sort((a, b) => b.total - a.total),
    }
  }

  return result
}

export function pdfColumn(x: number): string {
  if (x <= 100) return 'date'
  if (x <= 376) return 'desc'
  if (x <= 445) return 'cupon'
  if (x <= 505) return 'pesos'
  return 'dolares'
}
