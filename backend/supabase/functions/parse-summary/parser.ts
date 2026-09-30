// Funciones puras de parseo de resúmenes (sin I/O ni dependencias de red).
// Extraídas de parse-summary/index.ts para poder testearlas unitariamente.

import {
  HEADER_ALIASES,
  matchExact,
  normalizeHeader,
} from '../_shared/normalize.ts'

export type ParsedRow = {
  date: string
  merchant: string
  amount: number
  currency: 'ARS' | 'USD'
}

export type Transaction = ParsedRow & {
  category: string
}

export type ColumnMap = {
  date: number
  merchant: number
  amount: number
  credit: number
  amountIsDebit: boolean
  currency: number
  currencyDefault: 'ARS' | 'USD'
}

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

  // Columnas de monto: si hay "Cargo" y "Abono" (débito y crédito), la de
  // débito es el monto principal y la de crédito se negativiza (es un abono).
  const amountCells = row.map((cell, i) => ({ cell, i })).filter(
    ({ cell }) => HEADER_ALIASES.amount.some((a) => matchExact(cell, a)),
  )
  const debit = amountCells.find(({ cell }) =>
    /cargo|debito|debit/i.test(normalizeHeader(cell))
  )
  const credit = amountCells.find(({ cell }) =>
    /abono|credito|credit/i.test(normalizeHeader(cell))
  )
  const amount = debit?.i ?? credit?.i ?? amountCells[0]?.i ?? -1
  const creditIdx = debit && credit && debit.i !== credit.i ? credit.i : -1

  // Moneda: columna explícita ("Moneda"/"Currency") o default según el alias
  // del monto ("monto usd" → USD). Si no hay señal, ARS.
  const currency = row.findIndex((cell) =>
    HEADER_ALIASES.currency.some((a) => matchExact(cell, a))
  )
  const amountHeader = row[amount] ?? ''
  const currencyDefault: 'ARS' | 'USD' = /\busd\b|dolar|dolares/.test(
      normalizeHeader(amountHeader),
    )
    ? 'USD'
    : 'ARS'

  return {
    date,
    merchant,
    amount,
    credit: creditIdx,
    amountIsDebit: Boolean(debit),
    currency,
    currencyDefault,
  }
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

  // Monto: si hay columna de crédito (abono) y el débito está vacío, se usa el
  // crédito con signo negativo. Si el débito es un "Cargo", el valor de la
  // planilla suele venir positivo → se negativiza (es un egreso).
  let amount: number | null = null
  const debitRaw = columns.amount >= 0 ? cells[columns.amount] : ''
  if (debitRaw) {
    amount = parseAmount(debitRaw)
    if (amount !== null && columns.amountIsDebit && amount > 0) amount = -amount
  }
  if (amount === null && columns.credit >= 0 && cells[columns.credit]) {
    amount = parseAmount(cells[columns.credit])
    if (amount !== null) amount = -Math.abs(amount)
  }

  // Moneda: columna explícita gana; si no, el default del encabezado del monto.
  let currency: 'ARS' | 'USD' = columns.currencyDefault
  if (columns.currency >= 0 && cells[columns.currency]) {
    const raw = normalizeHeader(cells[columns.currency])
    if (/\busd\b|dolar|dolares/.test(raw)) currency = 'USD'
    else if (/ars|peso/.test(raw)) currency = 'ARS'
  }

  if (!date || amount === null) return null

  return {
    date,
    merchant: merchant || 'Sin descripción',
    amount,
    currency,
  }
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

export function pdfColumn(x: number): string {
  if (x <= 100) return 'date'
  if (x <= 376) return 'desc'
  if (x <= 445) return 'cupon'
  if (x <= 505) return 'pesos'
  return 'dolares'
}
