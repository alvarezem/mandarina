import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildExpenseReport,
  buildFiscalReport,
  buildLedgerReport,
  toCsv,
  toXlsx,
  toPdf,
} from './reports'

const TX = (overrides = {}) => ({
  id: 't1',
  date: '2026-07-01',
  merchant: 'MERCADO LIBRE',
  category: 'Compras',
  currency: 'ARS',
  amount: -1000,
  summary_id: 's1',
  ...overrides,
})

describe('buildExpenseReport', () => {
  const txs = [
    TX({ date: '2026-01-15', merchant: 'SUELDO', category: 'Ingresos', amount: 500000 }),
    TX({ date: '2026-03-10', merchant: 'MERCADO LIBRE', category: 'Compras', amount: -1500 }),
    TX({ date: '2026-07-20', merchant: 'NETFLIX', category: 'Suscripciones', amount: -2000 }),
    TX({
      date: '2026-07-21',
      merchant: 'APPLE',
      category: 'Compras',
      amount: -99.99,
      currency: 'USD',
    }),
  ]

  it('filtra por rango de fechas (inclusivo)', () => {
    const r = buildExpenseReport(txs, { from: '2026-01-01', to: '2026-03-31' })
    expect(r.rows.map((t) => t.merchant)).toEqual(['SUELDO', 'MERCADO LIBRE'])
    expect(r.totals.txCount).toBe(2)
  })

  it('filtra por moneda', () => {
    const ars = buildExpenseReport(txs, { currency: 'ARS' })
    expect(ars.rows).toHaveLength(3)
    const usd = buildExpenseReport(txs, { currency: 'USD' })
    expect(usd.rows.map((t) => t.merchant)).toEqual(['APPLE'])
  })

  it('filtra por categorías', () => {
    const r = buildExpenseReport(txs, { categories: ['Compras'] })
    expect(r.rows.map((t) => t.merchant)).toEqual(['MERCADO LIBRE', 'APPLE'])
  })

  it('combina todos los filtros y cuenta los totales', () => {
    const r = buildExpenseReport(txs, {
      from: '2026-01-01',
      to: '2026-12-31',
      currency: 'all',
      categories: ['Compras'],
    })
    expect(r.rows).toHaveLength(2)
    expect(r.totals.credits).toBe(0)
    expect(r.totals.debits).toBe(-1599.99)
    expect(r.totals.net).toBeCloseTo(-1599.99, 2)
    expect(r.totals.txCount).toBe(2)
  })

  it('no mezcla monedas en los agregados por categoría', () => {
    const r = buildExpenseReport(txs)
    const compras = r.byCategory.filter((c) => c.category === 'Compras')
    expect(compras).toHaveLength(2)
    expect(compras.map((c) => c.currency).sort()).toEqual(['ARS', 'USD'])
    expect(compras.find((c) => c.currency === 'ARS').total).toBe(-1500)
    expect(compras.find((c) => c.currency === 'USD').total).toBe(-99.99)
  })

  it('agrega por comercio con count y total', () => {
    const r = buildExpenseReport(txs, { currency: 'ARS' })
    const ml = r.byMerchant.find((m) => m.merchant === 'MERCADO LIBRE')
    expect(ml.count).toBe(1)
    expect(ml.total).toBe(-1500)
    const sueldo = r.byMerchant.find((m) => m.merchant === 'SUELDO')
    expect(sueldo.total).toBe(500000)
  })

  it('devuelve estructura vacía sin transacciones', () => {
    const r = buildExpenseReport([], { from: '2026-01-01', to: '2026-12-31' })
    expect(r.rows).toEqual([])
    expect(r.totals).toEqual({ credits: 0, debits: 0, net: 0, txCount: 0 })
    expect(r.byCategory).toEqual([])
    expect(r.byMerchant).toEqual([])
  })

  it('tolera sin filtros y sin txs', () => {
    expect(buildExpenseReport(undefined).rows).toEqual([])
    expect(buildExpenseReport(txs).rows).toHaveLength(4)
  })
})

describe('buildFiscalReport', () => {
  const txs = [
    TX({ date: '2025-12-31', merchant: 'MERCADO LIBRE', category: 'Compras', amount: -100 }),
    TX({ date: '2026-01-15', merchant: 'SUELDO', category: 'Ingresos', amount: 500000 }),
    TX({ date: '2026-02-10', merchant: 'MERCADO LIBRE', category: 'Compras', amount: -1500 }),
    TX({ date: '2026-02-11', merchant: 'VISA', category: 'Pagos', amount: -200000 }),
    TX({
      date: '2026-03-05',
      merchant: 'APPLE',
      category: 'Compras',
      amount: -99.99,
      currency: 'USD',
    }),
    TX({ date: '2027-01-02', merchant: 'NETFLIX', category: 'Suscripciones', amount: -2000 }),
  ]

  it('solo trae el año pedido y excluye Pagos', () => {
    const r = buildFiscalReport(txs, 2026)
    expect(r.year).toBe(2026)
    expect(r.rows.map((t) => t.merchant)).toEqual(['SUELDO', 'MERCADO LIBRE', 'APPLE'])
    expect(r.rows.some((t) => t.category === 'Pagos')).toBe(false)
  })

  it('divide por moneda: gastos por categoría y top comercios', () => {
    const r = buildFiscalReport(txs, 2026)
    expect(r.ars.totals.credits).toBe(500000)
    expect(r.ars.byCategory.map((c) => c.category)).toEqual(['Compras'])
    expect(r.ars.byCategory[0].total).toBe(-1500)
    expect(r.usd.byCategory[0].category).toBe('Compras')
    expect(r.usd.byCategory[0].total).toBe(-99.99)
    expect(r.ars.byMerchant[0].merchant).toBe('MERCADO LIBRE')
  })

  it('los ingresos no entran en los agregados de gastos', () => {
    const r = buildFiscalReport(txs, 2026)
    const cats = r.ars.byCategory.map((c) => c.category)
    expect(cats).not.toContain('Ingresos')
  })

  it('corta los top comercios a 10', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      TX({ date: '2026-01-01', merchant: `M${i}`, category: 'Compras', amount: -100 - i }),
    )
    expect(buildFiscalReport(many, 2026).ars.byMerchant).toHaveLength(10)
  })

  it('tolera año null (todas las fechas) y sin txs', () => {
    const all = buildFiscalReport(txs, null)
    expect(all.rows).toHaveLength(5)
    const empty = buildFiscalReport([], 2026)
    expect(empty.rows).toEqual([])
    expect(empty.ars.byCategory).toEqual([])
  })
})

describe('buildLedgerReport', () => {
  const op = (overrides = {}) => ({
    id: 'o1',
    symbol: 'GGAL',
    side: 'compra',
    quantity: 10,
    price: 25,
    commission: 2,
    commission_is_pct: false,
    currency: 'ARS',
    date: '2026-07-10',
    notes: null,
    ...overrides,
  })

  it('arma las filas con subtotal según el tipo y comisión', () => {
    const ops = [
      op({ quantity: 10, price: 25, commission: 2 }),
      op({ id: 'o2', symbol: 'GGAL', side: 'venta', quantity: 2, price: 40, commission: 1 }),
      op({
        id: 'o3',
        symbol: 'AAPL',
        side: 'compra',
        quantity: 3,
        price: 200,
        commission: 0.5,
        commission_is_pct: true,
        currency: 'USD',
        notes: 'dolar cable',
      }),
    ]
    const r = buildLedgerReport(ops)
    expect(r.rows).toHaveLength(3)
    expect(r.rows[0]).toEqual(expect.objectContaining({ side: 'compra', subtotal: 252 }))
    expect(r.rows[1].subtotal).toBe(-79)
    expect(r.rows[2].commission).toBe(3)
    expect(r.rows[2].notes).toBe('dolar cable')
    expect(r.rows[2].currency).toBe('USD')
  })

  it('resume por símbolo con summarize y totales por moneda', () => {
    const ops = [
      op({ symbol: 'GGAL', side: 'compra', quantity: 10, price: 25, commission: 2 }),
      op({ symbol: 'GGAL', side: 'venta', quantity: 2, price: 40 }),
      op({ symbol: 'AAPL', side: 'compra', quantity: 3, price: 200, currency: 'USD' }),
    ]
    const r = buildLedgerReport(ops)
    expect(r.bySymbol.map((s) => s.symbol)).toEqual(['AAPL', 'GGAL'])
    expect(r.bySymbol.find((s) => s.symbol === 'GGAL').quantity).toBe(8)
    expect(r.totals.ops).toBe(3)
    expect(r.totals.investedArs).toBe(252)
    expect(r.totals.investedUsd).toBe(602)
  })

  it('tolera sin operaciones', () => {
    const r = buildLedgerReport([])
    expect(r.rows).toEqual([])
    expect(r.bySymbol).toEqual([])
    expect(r.totals).toEqual({ ops: 0, investedArs: 0, investedUsd: 0 })
  })
})

describe('toCsv', () => {
  it('empieza con BOM y usa CRLF', () => {
    const csv = toCsv(['A', 'B'], [[1, 'x']])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('\r\n')
    expect(csv).toBe('\uFEFFA,B\r\n1,x\r\n')
  })

  it('entrecomilla celdas con coma, comilla o salto y escapa comillas', () => {
    const csv = toCsv(['A'], [['hola, mundo'], ['dijo "hola"'], ['linea\nnueva']])
    expect(csv).toContain('"hola, mundo"')
    expect(csv).toContain('"dijo ""hola"""')
    expect(csv).toContain('"linea\nnueva"')
  })

  it('convierte null/undefined a vacío y deja los números crudos', () => {
    const csv = toCsv(['A', 'B'], [[null, undefined]])
    expect(csv).toBe('\uFEFFA,B\r\n,\r\n')
  })

  it('devuelve solo el header sin filas', () => {
    expect(toCsv(['X'], [])).toBe('\uFEFFX\r\n')
  })
})

describe('toXlsx', () => {
  it('genera un workbook multi-sheet legible por exceljs', async () => {
    const buffer = await toXlsx({
      sheets: [
        { name: 'Transacciones', headers: ['Fecha', 'Monto'], rows: [['2026-07-01', -1000]] },
        { name: 'Resumen', headers: ['Categoría', 'Total'], rows: [['Compras', -1000]] },
      ],
    })
    expect(buffer).toBeTruthy()
    expect(buffer.byteLength).toBeGreaterThan(0)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Transacciones', 'Resumen'])
    const ws = wb.getWorksheet('Transacciones')
    expect(ws.getCell('A1').value).toBe('Fecha')
    expect(ws.getCell('A2').value).toBe('2026-07-01')
    expect(ws.getCell('B2').value).toBe(-1000)
  })

  it('tolera sheets sin filas', async () => {
    const buffer = await toXlsx({ sheets: [{ name: 'Solo header', headers: ['A'], rows: [] }] })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    expect(wb.getWorksheet('Solo header').rowCount).toBe(1)
  })
})

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('toPdf', () => {
  it('genera un PDF con texto, meta y tablas', () => {
    const doc = toPdf({
      title: 'Resumen impositivo 2026',
      meta: [{ label: 'Año', value: '2026' }],
      sections: [{ title: 'Nota', body: ['Texto de ejemplo'] }],
      tables: [
        {
          title: 'Gastos por categoría',
          headers: ['Categoría', 'Total'],
          rows: [
            ['Compras', -1500],
            ['Otros', -200],
          ],
        },
      ],
    })
    const bytes = doc.output('arraybuffer')
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(bytes.byteLength).toBeGreaterThan(500)
  })

  it('embebe la imagen PNG del doughnut', () => {
    const doc = toPdf({
      title: 'Resumen impositivo 2026',
      meta: [],
      tables: [],
      chartImage: PNG_1PX,
    })
    const bytes = doc.output('arraybuffer')
    expect(bytes.byteLength).toBeGreaterThan(0)
  })

  it('no rompe con una imagen inválida (addImage falla silencioso)', () => {
    const doc = toPdf({ title: 'x', chartImage: 'data:image/png;base64,ZZZZ' })
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })

  it('tolera tablas vacías y sin meta', () => {
    const doc = toPdf({
      title: 'x',
      tables: [{ title: 'vacía', headers: ['A'], rows: [] }],
    })
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })
})
