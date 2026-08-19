// Reportes de exportación (Excel / CSV / PDF). Funciones puras: reciben datos
// crudos y devuelven estructuras listas para serializar o el buffer del
// archivo. Los builders reusan la lógica de analysis.js (totales/agregados,
// exclusión de Pagos) y de ledger.js (summarize/commissionAmount) para que los
// reportes cuenten lo mismo que el dashboard. El CSV es generador propio (BOM
// UTF-8 + quoting); XLSX con exceljs y PDF con jspdf + autotable.

import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { computeTotals, EXCLUDED_CATEGORIES } from './analysis'
import { commissionAmount, summarize } from './ledger'

// Agrega por categoría/comercio con la moneda efectiva de cada grupo: en una
// exportación con moneda "Ambas" no se mezclan ARS y USD en un mismo total.
function aggregateByCurrency(rows, kind) {
  const map = new Map()
  for (const tx of rows) {
    const key = kind === 'merchant' ? tx.merchant : tx.category
    const currency = tx.currency === 'USD' ? 'USD' : 'ARS'
    const id = `${currency}|${key ?? ''}`
    const e = map.get(id) || { currency, [kind]: key ?? '', count: 0, total: 0 }
    e.count += 1
    e.total += tx.amount
    map.set(id, e)
  }
  return [...map.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
}

// Exportación completa: todas las txs que pasan los filtros + resúmenes por
// categoría y comercio (sin mezclar monedas).
export function buildExpenseReport(txs, filters = {}) {
  const { from, to, currency = 'all', categories = [] } = filters
  const rows = []
  for (const tx of txs || []) {
    if (from && (tx.date ?? '') < from) continue
    if (to && (tx.date ?? '') > to) continue
    if (currency === 'ARS' && tx.currency === 'USD') continue
    if (currency === 'USD' && tx.currency !== 'USD') continue
    if (categories.length && !categories.includes(tx.category)) continue
    rows.push(tx)
  }
  return {
    rows,
    totals: computeTotals(rows),
    byCategory: aggregateByCurrency(rows, 'category'),
    byMerchant: aggregateByCurrency(rows, 'merchant'),
  }
}

// Resumen impositivo: un año, excluye Pagos (consistente con analysis.js).
// byCategory/byMerchant se calculan sobre gastos (amount < 0) por moneda.
export function buildFiscalReport(txs, year) {
  const prefix = year ? String(year) : ''
  const relevant = (txs || []).filter(
    (t) =>
      !EXCLUDED_CATEGORIES.includes(t.category) &&
      (!prefix || String(t.date ?? '').startsWith(prefix)),
  )
  const split = (currency) => {
    const list = relevant.filter((t) =>
      currency === 'USD' ? t.currency === 'USD' : t.currency !== 'USD',
    )
    const spending = list.filter((t) => t.amount < 0)
    return {
      totals: computeTotals(list),
      byCategory: aggregateByCurrency(spending, 'category'),
      byMerchant: aggregateByCurrency(spending, 'merchant').slice(0, 10),
    }
  }
  return {
    year: year ? Number(year) : null,
    rows: relevant,
    ars: split('ARS'),
    usd: split('USD'),
  }
}

function subtotalOf(op) {
  const amount = (Number(op.quantity) || 0) * (Number(op.price) || 0)
  const commission = commissionAmount(op)
  return op.side === 'venta' ? -(amount - commission) : amount + commission
}

// Export del ledger: operaciones planas + resumen por símbolo (summarize) +
// totales por moneda (las monedas no se convierten sin rate).
export function buildLedgerReport(ops) {
  const list = Array.isArray(ops) ? ops : []
  const bySymbol = summarize(list)
  const totals = bySymbol.reduce(
    (acc, s) => {
      if (s.currency === 'USD') acc.investedUsd += s.invested
      else acc.investedArs += s.invested
      acc.ops += s.ops
      return acc
    },
    { ops: 0, investedArs: 0, investedUsd: 0 },
  )
  const rows = list.map((op) => ({
    date: op.date ?? '',
    symbol: op.symbol ?? '',
    side: op.side ?? 'compra',
    quantity: Number(op.quantity) || 0,
    price: Number(op.price) || 0,
    currency: op.currency || 'ARS',
    commission: commissionAmount(op),
    commission_is_pct: Boolean(op.commission_is_pct),
    notes: op.notes ?? '',
    subtotal: subtotalOf(op),
  }))
  return { rows, bySymbol, totals }
}

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// CSV con BOM UTF-8 (Excel interpreta el acento bien) y saltos CRLF.
// Celdas con comas/comillas/saltos se entrecomillan y se escapan las comillas.
export function toCsv(headers, rows) {
  const lines = [headers, ...(rows || [])].map((row) => row.map(csvCell).join(','))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

// XLSX multi-sheet con exceljs: `sheets` = [{ name, headers, rows }].
// Devuelve el buffer del workbook (Promise<Buffer|ArrayBuffer>).
export async function toXlsx({ sheets }) {
  const workbook = new ExcelJS.Workbook()
  for (const sheet of sheets || []) {
    const ws = workbook.addWorksheet(sheet.name)
    ws.addRow(sheet.headers)
    for (const row of sheet.rows || []) ws.addRow(row)
    sheet.headers.forEach((_, i) => {
      ws.getColumn(i + 1).width = 18
    })
  }
  return workbook.xlsx.writeBuffer()
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40

// PDF A4 con jspdf + autotable. `meta` son líneas label: value, `sections`
// texto libre, `tables` = [{ title, headers, rows }] y `chartImage` una data
// URL PNG opcional que se embebe con addImage. Devuelve el doc para guardarlo.
export function toPdf({ title, meta = [], sections = [], tables = [], chartImage }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  let y = 56

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, MARGIN, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100)
  for (const m of meta) {
    doc.text(`${m.label}: ${m.value}`, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 })
    y += 14
  }
  doc.setTextColor(0)

  if (chartImage) {
    try {
      doc.addImage(chartImage, 'PNG', (PAGE_W - 220) / 2, y, 220, 220)
      y += 230
    } catch {
      // imagen inválida: el PDF se genera igual sin el gráfico
    }
  }

  for (const section of sections) {
    if (y > PAGE_H - 120) {
      doc.addPage()
      y = 56
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(section.title, MARGIN, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const line of section.body || []) {
      if (y > PAGE_H - 60) {
        doc.addPage()
        y = 56
      }
      doc.text(line, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 })
      y += 14
    }
  }

  for (const table of tables) {
    if (!table.rows || table.rows.length === 0) continue
    if (y > PAGE_H - 160) {
      doc.addPage()
      y = 56
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(table.title, MARGIN, y)
    y += 10
    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [249, 115, 22], fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    y = doc.lastAutoTable.finalY + 24
  }

  return doc
}
