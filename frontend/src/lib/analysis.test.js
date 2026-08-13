import {
  computeTotals,
  aggregate,
  buildAnalysis,
  buildIncomeAnalysis,
  buildIncomeSources,
  EXCLUDED_CATEGORIES,
} from './analysis'

const tx = (overrides) => ({
  id: 't1',
  date: '2026-07-01',
  merchant: 'MERCADO LIBRE',
  category: 'Compras',
  currency: 'ARS',
  amount: -1500,
  summary_id: 's1',
  ...overrides,
})

describe('computeTotals', () => {
  it('separa créditos, débitos y neto', () => {
    const t = computeTotals([tx({ amount: -100 }), tx({ amount: -25.5 }), tx({ amount: 40 })])
    expect(t).toEqual({ credits: 40, debits: -125.5, net: -85.5, txCount: 3 })
  })
})

describe('aggregate', () => {
  it('agrupa por merchant', () => {
    const r = aggregate(
      [
        tx({ merchant: 'A', amount: -10 }),
        tx({ merchant: 'A', amount: -5 }),
        tx({ merchant: 'B', amount: -3 }),
      ],
      'merchant',
    )
    expect(r).toHaveLength(2)
    const a = r.find((e) => e.merchant === 'A')
    expect(a).toMatchObject({ count: 2, total: -15 })
  })

  it('agrupa por category', () => {
    const r = aggregate(
      [tx({ category: 'Compras', amount: -10 }), tx({ category: 'Compras', amount: -5 })],
      'category',
    )
    expect(r[0]).toMatchObject({ category: 'Compras', count: 2, total: -15 })
  })
})

describe('buildAnalysis', () => {
  it('excluye la categoría Pagos de todos los agregados', () => {
    const r = buildAnalysis([
      tx({ amount: -100 }),
      tx({ amount: -50, category: 'Pagos' }),
      tx({ amount: -30, category: 'Pagos' }),
    ])
    expect(r.excludedCount).toBe(2)
    expect(r.totals.debits).toBe(-100)
    expect(r.totals.txCount).toBe(1)
  })

  it('incluye Pagos en los agregados cuando includePayments es true', () => {
    const r = buildAnalysis([tx({ amount: -100 }), tx({ amount: -50, category: 'Pagos' })], {
      includePayments: true,
    })
    expect(r.excludedCount).toBe(0)
    expect(r.totals.debits).toBe(-150)
    expect(r.totals.txCount).toBe(2)
    expect(r.byCategory.some((c) => c.category === 'Pagos')).toBe(true)
    expect(r.byCategory.find((c) => c.category === 'Pagos')).toMatchObject({
      count: 1,
      total: -50,
    })
  })

  it('calcula período, mayor gasto y tendencia acumulada', () => {
    const r = buildAnalysis([
      tx({ id: 'a', date: '2026-07-01', amount: -100 }),
      tx({ id: 'b', date: '2026-07-03', amount: -50 }),
    ])
    expect(r.period.from).toBe('2026-07-01')
    expect(r.period.to).toBe('2026-07-03')
    expect(r.period.days).toBe(3)
    expect(r.maxExpense).toMatchObject({ amount: -100, merchant: 'MERCADO LIBRE' })
    expect(r.byDay).toHaveLength(2)
    expect(r.expenseTrend).toEqual([
      { date: '2026-07-01', accumulated: 100 },
      { date: '2026-07-03', accumulated: 150 },
    ])
  })

  it('separa un bloque USD cuando hay transacciones en esa moneda', () => {
    const r = buildAnalysis([
      tx({ amount: -100 }),
      tx({ id: 'u', amount: -17.61, currency: 'USD' }),
    ])
    expect(r.totals.debits).toBe(-100)
    expect(r.usd.totals.debits).toBe(-17.61)
    expect(r.usd.maxExpense.amount).toBe(-17.61)
    expect(r.byCategory).toHaveLength(1)
  })

  it('ordena byMerchant por valor absoluto del total', () => {
    const r = buildAnalysis([
      tx({ id: 'a', merchant: 'A', amount: -500 }),
      tx({ id: 'b', merchant: 'B', amount: -3000 }),
      tx({ id: 'c', merchant: 'C', amount: -10 }),
    ])
    expect(r.byMerchant[0].total).toBe(-3000)
    expect(r.byMerchant[1].total).toBe(-500)
  })

  it('no incluye bloque USD si no hay transacciones en esa moneda', () => {
    const r = buildAnalysis([tx({ amount: -100 })])
    expect(r.usd).toBeUndefined()
  })

  it('excluye créditos (montos positivos) de byCategory y byMerchant', () => {
    const r = buildAnalysis([
      tx({ merchant: 'DEPÓSITO', category: 'Ingresos', amount: 5000 }),
      tx({ merchant: 'MERCADO LIBRE', category: 'Compras', amount: -300 }),
      tx({ merchant: 'MERCADO LIBRE', category: 'Compras', amount: -200 }),
    ])
    expect(r.totals.debits).toBe(-500)
    expect(r.totals.credits).toBe(5000)
    expect(r.byCategory).toHaveLength(1)
    expect(r.byCategory[0]).toMatchObject({ category: 'Compras', total: -500 })
    expect(r.byCategory[0].category).not.toBe('Ingresos')
    expect(r.byMerchant.some((m) => m.merchant === 'DEPÓSITO')).toBe(false)
    expect(r.byMerchant[0]).toMatchObject({ merchant: 'MERCADO LIBRE', total: -500 })
  })
})

describe('buildIncomeAnalysis', () => {
  it('calcula totales solo con créditos y excluye Pagos', () => {
    const r = buildIncomeAnalysis([
      tx({ merchant: 'SUELDO', category: 'Ingresos', amount: 5000 }),
      tx({ merchant: 'DÉBITO', category: 'Ingresos', amount: 2500 }),
      tx({ merchant: 'PAGO TC', category: 'Pagos', amount: -50000 }),
      tx({ merchant: 'MERCADO LIBRE', category: 'Compras', amount: -300 }),
    ])
    expect(r.excludedCount).toBe(1)
    expect(r.totals.credits).toBe(7500)
    expect(r.totals.debits).toBe(-300)
    expect(r.totals.txCount).toBe(3)
    expect(r.byCategory).toEqual([{ category: 'Ingresos', count: 2, total: 7500 }])
    expect(r.byMerchant).toEqual([
      { merchant: 'SUELDO', count: 1, total: 5000 },
      { merchant: 'DÉBITO', count: 1, total: 2500 },
    ])
  })

  it('no excluye Pagos cuando includePayments es true en ingresos', () => {
    const r = buildIncomeAnalysis(
      [
        tx({ merchant: 'SUELDO', category: 'Ingresos', amount: 5000 }),
        tx({ merchant: 'PAGO TC', category: 'Pagos', amount: -50000 }),
      ],
      { includePayments: true },
    )
    expect(r.excludedCount).toBe(0)
    expect(r.totals.txCount).toBe(2)
    expect(r.totals.debits).toBe(-50000)
  })

  it('marca el mayor ingreso y acumula tendencia por día', () => {
    const r = buildIncomeAnalysis([
      tx({ id: 'a', date: '2026-07-01', merchant: 'SUELDO', amount: 5000 }),
      tx({ id: 'b', date: '2026-07-03', merchant: 'REINTEGRO', amount: 1000 }),
    ])
    expect(r.period.from).toBe('2026-07-01')
    expect(r.period.to).toBe('2026-07-03')
    expect(r.period.days).toBe(3)
    expect(r.maxIncome).toMatchObject({ amount: 5000, merchant: 'SUELDO' })
    expect(r.byDay).toEqual([
      { date: '2026-07-01', income: 5000 },
      { date: '2026-07-03', income: 1000 },
    ])
    expect(r.incomeTrend).toEqual([
      { date: '2026-07-01', accumulated: 5000 },
      { date: '2026-07-03', accumulated: 6000 },
    ])
  })

  it('ignora débitos (montos negativos) en los agregados', () => {
    const r = buildIncomeAnalysis([
      tx({ merchant: 'SUELDO', category: 'Ingresos', amount: 4000 }),
      tx({ merchant: 'MERCADO LIBRE', category: 'Compras', amount: -500 }),
      tx({ merchant: 'MERCADO LIBRE', category: 'Compras', amount: -200 }),
    ])
    expect(r.totals.credits).toBe(4000)
    expect(r.byCategory).toHaveLength(1)
    expect(r.byCategory[0].category).toBe('Ingresos')
    expect(r.byMerchant.some((m) => m.merchant === 'MERCADO LIBRE')).toBe(false)
  })

  it('separa un bloque USD cuando hay créditos en esa moneda', () => {
    const r = buildIncomeAnalysis([
      tx({ amount: 5000 }),
      tx({ id: 'u', amount: 100, currency: 'USD', merchant: 'BONO' }),
      tx({ id: 'u2', amount: -50, currency: 'USD', merchant: 'AMAZON' }),
    ])
    expect(r.totals.credits).toBe(5000)
    expect(r.usd.totals.credits).toBe(100)
    expect(r.usd.maxIncome).toMatchObject({ amount: 100, merchant: 'BONO' })
    expect(r.usd.byMerchant).toEqual([{ merchant: 'BONO', count: 1, total: 100 }])
  })

  it('no incluye bloque USD si no hay transacciones en esa moneda', () => {
    const r = buildIncomeAnalysis([tx({ amount: 5000 })])
    expect(r.usd).toBeUndefined()
  })
})

describe('buildIncomeSources', () => {
  it('agrupa créditos por merchant con count y total', () => {
    const r = buildIncomeSources([
      tx({ merchant: 'SUELDO', amount: 5000 }),
      tx({ merchant: 'SUELDO', amount: 5000 }),
      tx({ merchant: 'REINTEGRO', amount: 1000 }),
    ])
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ merchant: 'SUELDO', count: 2, total: 10000, recurring: false })
  })

  it('marca recurrente un origen que aparece en 2+ meses distintos del summary', () => {
    const r = buildIncomeSources([
      tx({
        merchant: 'SUELDO',
        amount: 5000,
        date: '2026-07-01',
        card_summaries: { period_month: 7, period_year: 2026 },
      }),
      tx({
        merchant: 'SUELDO',
        amount: 5000,
        date: '2026-08-01',
        card_summaries: { period_month: 8, period_year: 2026 },
      }),
    ])
    expect(r[0].monthCount).toBe(2)
    expect(r[0].recurring).toBe(true)
  })

  it('usa el mes de tx.date como fallback cuando el summary no trae período', () => {
    const r = buildIncomeSources([
      tx({
        merchant: 'SUELDO',
        amount: 5000,
        date: '2026-07-15',
        card_summaries: { file_name: 'v' },
      }),
      tx({ merchant: 'SUELDO', amount: 5000, date: '2026-08-15' }),
    ])
    expect(r[0].monthCount).toBe(2)
    expect(r[0].recurring).toBe(true)
  })

  it('considera un mes único cuando todas las transacciones caen el mismo mes', () => {
    const r = buildIncomeSources([
      tx({ merchant: 'DEVOLUCIÓN', amount: 1000, date: '2026-07-02' }),
      tx({ merchant: 'DEVOLUCIÓN', amount: 800, date: '2026-07-10' }),
    ])
    expect(r[0].monthCount).toBe(1)
    expect(r[0].recurring).toBe(false)
  })

  it('un origen sin fecha ni período del summary queda con monthCount 0', () => {
    const r = buildIncomeSources([tx({ merchant: 'SUELDO', amount: 5000, date: null })])
    expect(r[0].monthCount).toBe(0)
    expect(r[0].recurring).toBe(false)
  })

  it('ordena por total desc y respeta un umbral custom', () => {
    const r = buildIncomeSources(
      [
        tx({ merchant: 'A', amount: 1000, date: '2026-07-01' }),
        tx({ merchant: 'B', amount: 5000, date: '2026-07-01' }),
      ],
      { minMonthsRecurring: 3 },
    )
    expect(r[0].merchant).toBe('B')
    expect(r[0].recurring).toBe(false)
  })

  it('expone sources ordenadas en buildIncomeAnalysis', () => {
    const r = buildIncomeAnalysis([
      tx({ merchant: 'REINTEGRO', amount: 1000, date: '2026-07-01' }),
      tx({ merchant: 'SUELDO', amount: 5000, date: '2026-07-01' }),
      tx({ merchant: 'SUELDO', amount: 5000, date: '2026-08-01' }),
    ])
    expect(r.sources).toEqual([
      {
        merchant: 'SUELDO',
        category: 'Compras',
        count: 2,
        total: 10000,
        monthCount: 2,
        recurring: true,
      },
      {
        merchant: 'REINTEGRO',
        category: 'Compras',
        count: 1,
        total: 1000,
        monthCount: 1,
        recurring: false,
      },
    ])
  })
})

describe('EXCLUDED_CATEGORIES', () => {
  it('excluye Pagos', () => {
    expect(EXCLUDED_CATEGORIES).toContain('Pagos')
  })
})
