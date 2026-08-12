// Funciones puras de parseo del plan de inversión (sin I/O ni dependencias de red).
// Extraídas de import-plan/index.ts para poder testearlas unitariamente.

import { HEADER_ALIASES, matchFuzzy } from '../_shared/normalize.ts'

export type PlanItem = { symbol: string; target: number; quantity: number }
export type PlanColumns = { symbol: number; target: number; quantity: number }

export function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) =>
    Array.isArray(row) &&
    row.some((cell) => HEADER_ALIASES.symbol.some((a) => matchFuzzy(cell, a))),
  )
}

export function findColumns(row: unknown[]): PlanColumns {
  const find = (aliases: string[]) =>
    row.findIndex((cell) => aliases.some((a) => matchFuzzy(cell, a)))
  return {
    symbol: find(HEADER_ALIASES.symbol),
    target: find(HEADER_ALIASES.target),
    quantity: find(HEADER_ALIASES.quantity),
  }
}

// Porcentaje: acepta "10", "10%", "10.5", "5,5", "0.5" (→ 50).
export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return value <= 1 ? value * 100 : value
  }
  const cleaned = String(value).replace('%', '').replace(',', '.').trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return n <= 1 ? n * 100 : n
}

// Cantidad con separador decimal/comma ambiguo. Misma lógica que parseAmount
// de parse-summary: si hay punto y coma, el último es el separador decimal;
// si solo punto, es decimal si tiene <=2 dígitos (1.5 → 1.5, 1.234 → 1234).
export function parseQuantity(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[^\d.,\-]/g, '')
  if (cleaned === '' || cleaned === '-') return 0
  const sign = cleaned.startsWith('-') ? -1 : 1
  const digits = cleaned.replace(/-/g, '')

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
    normalized = parts.length === 2 && parts[1].length <= 2 ? digits : digits.replace(/\./g, '')
  } else {
    normalized = digits
  }

  const n = Number(normalized) * sign
  return Number.isFinite(n) ? n : 0
}

export function extractPlan(rows: unknown[][]): PlanItem[] | null {
  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) return null
  const columns = findColumns(rows[headerIdx])
  if (columns.symbol === -1) return null

  const items: PlanItem[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue
    const cells = row.map((c) => String(c ?? '').trim())
    if (cells.every((c) => c === '')) continue

    const symbol = cells[columns.symbol]?.toUpperCase().replace(/\s+/g, '')
    if (!symbol) continue

    const target = columns.target >= 0 ? parsePercent(row[columns.target]) : null
    const quantity = columns.quantity >= 0 ? parseQuantity(row[columns.quantity]) : 0

    items.push({
      symbol,
      target: target ?? 0,
      quantity,
    })
  }
  return items
}