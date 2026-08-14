import { describe, it, expect } from 'vitest'
import { commissionAmount, costBasis, ledgerQuantity, profitability, summarize } from './ledger'

function op(overrides = {}) {
  return {
    id: 'o1',
    symbol: 'GGAL',
    side: 'compra',
    quantity: 10,
    price: 25,
    commission: 0,
    date: '2026-07-10',
    currency: 'ARS',
    ...overrides,
  }
}

describe('ledgerQuantity', () => {
  it('suma compras y ajustes y resta ventas', () => {
    const ops = [
      op({ side: 'compra', quantity: 10 }),
      op({ side: 'compra', quantity: 5 }),
      op({ side: 'venta', quantity: 3 }),
      op({ side: 'ajuste', quantity: 2 }),
    ]
    expect(ledgerQuantity(ops)).toBe(14)
  })

  it('tolera operaciones vacías', () => {
    expect(ledgerQuantity([])).toBe(0)
    expect(ledgerQuantity(null)).toBe(0)
  })
})

describe('commissionAmount', () => {
  it('devuelve el monto fijo cuando no hay flag (filas legacy o fijas)', () => {
    expect(commissionAmount(op({ commission: 12.5 }))).toBe(12.5)
    expect(commissionAmount(op({ commission: 12.5, commission_is_pct: false }))).toBe(12.5)
  })

  it('calcula el porcentaje sobre cantidad × precio', () => {
    const o = op({ quantity: 10, price: 250, commission: 1.5, commission_is_pct: true })
    expect(commissionAmount(o)).toBe(37.5)
  })

  it('tolera comisión ausente', () => {
    expect(commissionAmount(op({ commission: 0 }))).toBe(0)
    expect(commissionAmount(op({}))).toBe(0)
    expect(commissionAmount(undefined)).toBe(0)
    expect(commissionAmount(null)).toBe(0)
  })
})

describe('costBasis', () => {
  it('calcula el promedio móvil con comisiones', () => {
    const ops = [
      op({ side: 'compra', quantity: 10, price: 25, commission: 2 }),
      op({ side: 'compra', quantity: 5, price: 30, commission: 2 }),
    ]
    const h = costBasis(ops)
    expect(h.quantity).toBe(15)
    expect(h.invested).toBe(252 + 152)
    expect(h.avgCost).toBeCloseTo(404 / 15, 6)
  })

  it('computa comisiones porcentuales sobre cantidad × precio', () => {
    const ops = [
      op({ side: 'compra', quantity: 10, price: 100, commission: 1, commission_is_pct: true }),
      op({ side: 'compra', quantity: 5, price: 200, commission: 0.5, commission_is_pct: true }),
    ]
    const h = costBasis(ops)
    expect(h.quantity).toBe(15)
    expect(h.invested).toBe(10 * 100 + 10 + 5 * 200 + 5)
    expect(h.avgCost).toBeCloseTo((10 * 100 + 10 + 5 * 200 + 5) / 15, 6)
  })

  it('las ventas bajan la cantidad sin tocar el costo promedio', () => {
    const ops = [
      op({ side: 'compra', quantity: 10, price: 25 }),
      op({ side: 'compra', quantity: 5, price: 30 }),
      op({ side: 'venta', quantity: 3, price: 40, commission: 1 }),
    ]
    const h = costBasis(ops)
    expect(h.quantity).toBe(12)
    expect(h.avgCost).toBeCloseTo(400 / 15, 6)
    expect(h.invested).toBe(400)
  })

  it('el ajuste inicial fija cantidad y costo', () => {
    const h = costBasis([op({ side: 'ajuste', quantity: 8, price: 100, commission: 0 })])
    expect(h.quantity).toBe(8)
    expect(h.avgCost).toBe(100)
    expect(h.invested).toBe(800)
  })

  it('respeta el orden cronológico aunque llegue desordenado', () => {
    const ops = [
      op({ side: 'compra', quantity: 10, price: 20, date: '2026-07-20' }),
      op({ side: 'compra', quantity: 10, price: 30, date: '2026-07-10' }),
    ]
    const h = costBasis(ops)
    expect(h.quantity).toBe(20)
    expect(h.avgCost).toBeCloseTo(25, 6)
  })

  it('no baja de cero la cantidad si se vende de más', () => {
    const ops = [op({ side: 'compra', quantity: 5, price: 10 }), op({ side: 'venta', quantity: 9 })]
    const h = costBasis(ops)
    expect(h.quantity).toBe(0)
  })

  it('devuelve ceros sin operaciones', () => {
    expect(costBasis([])).toEqual({ quantity: 0, avgCost: 0, invested: 0 })
    expect(costBasis(null)).toEqual({ quantity: 0, avgCost: 0, invested: 0 })
  })
})

describe('profitability', () => {
  const holdings = { quantity: 12, avgCost: 400 / 15, invested: 400 }

  it('calcula ganancia/pérdida vs. el precio', () => {
    const { pnl, pnlPct } = profitability(holdings, 40)
    expect(pnl).toBeCloseTo((40 - 400 / 15) * 12, 6)
    expect(pnlPct).toBeCloseTo((40 / (400 / 15) - 1) * 100, 6)
  })

  it('devuelve cero sin precio o sin cantidad', () => {
    expect(profitability(holdings, null)).toEqual({ pnl: 0, pnlPct: 0 })
    expect(profitability({ quantity: 0, avgCost: 100 }, 40)).toEqual({ pnl: 0, pnlPct: 0 })
  })

  it('devuelve pnlPct cero si no hay costo conocido', () => {
    expect(profitability({ quantity: 5, avgCost: 0 }, 40)).toEqual({ pnl: 200, pnlPct: 0 })
  })
})

describe('summarize', () => {
  it('agrupa por símbolo con cantidad, costo e invertido', () => {
    const ops = [
      op({ symbol: 'GGAL', side: 'compra', quantity: 10, price: 25, date: '2026-07-10' }),
      op({ symbol: 'GGAL', side: 'venta', quantity: 2, price: 40, date: '2026-07-20' }),
      op({ symbol: 'AAPL', side: 'ajuste', quantity: 3, price: 200, date: '2026-07-05' }),
    ]
    const s = summarize(ops)
    expect(s).toHaveLength(2)
    expect(s[0].symbol).toBe('AAPL')
    expect(s[1].symbol).toBe('GGAL')
    expect(s[1].quantity).toBe(8)
    expect(s[1].avgCost).toBe(25)
    expect(s[1].invested).toBe(250)
    expect(s[1].ops).toBe(2)
  })

  it('tolera sin operaciones', () => {
    expect(summarize([])).toEqual([])
  })
})
