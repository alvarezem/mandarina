import {
  valueOf,
  actualPct,
  gapPct,
  buyAmount,
  buyQty,
  isOver,
  buildPlan,
  distribute,
  portfolioChangePct,
} from './plan'

const item = (overrides) => ({
  symbol: 'VIST',
  name: 'VIST',
  asset_type: 'accion',
  currency: 'ARS',
  target_weight: 9,
  quantity: 8,
  price: 34920,
  ...overrides,
})

describe('valueOf', () => {
  it('multiplica cantidad por precio', () => {
    expect(valueOf(8, 34920)).toBe(279360)
  })

  it('tolera nulos', () => {
    expect(valueOf(null, null)).toBe(0)
  })
})

describe('buyAmount', () => {
  it('usa la semántica (T·V − v)/(1 − T) con VIST', () => {
    expect(buyAmount(9, 3574720, 279360)).toBeCloseTo(46554.73, 0)
  })

  it('da 0 si ya está sobre la meta', () => {
    expect(buyAmount(14, 3574720, 507600)).toBe(0)
  })

  it('da 0 si la meta es 100%', () => {
    expect(buyAmount(100, 3574720, 1000)).toBe(0)
  })
})

describe('buyQty', () => {
  it('pisa a entero', () => {
    expect(buyQty(46554.73, 34920)).toBe(1)
  })

  it('al menos 1 si hay faltante aunque no alcance para una unidad', () => {
    expect(buyQty(1541.6, 7550)).toBe(1)
  })

  it('0 sin precio o sin faltante', () => {
    expect(buyQty(0, 100)).toBe(0)
    expect(buyQty(50, 0)).toBe(0)
  })
})

describe('buildPlan', () => {
  const plan = buildPlan([
    item({ target_weight: 9, quantity: 8, price: 34920 }), // VIST
    item({ symbol: 'QQQ', name: 'QQQ', target_weight: 14, quantity: 9, price: 56400 }), // sobre meta
  ])

  it('calcula el total de la cartera', () => {
    expect(plan[0].total).toBe(507600 + 279360)
  })

  it('calcula actualPct y gap', () => {
    expect(plan[0].actualPct).toBeCloseTo((279360 / (507600 + 279360)) * 100, 6)
    expect(plan[0].gap).toBeCloseTo(9 - plan[0].actualPct, 6)
  })

  it('marca sobre-ponderados', () => {
    const qqq = plan[1]
    expect(qqq.over).toBe(true)
    expect(qqq.buy).toBe(0)
  })
})

describe('distribute', () => {
  const plan = () =>
    buildPlan([
      item({ symbol: 'AAPL', name: 'AAPL', target_weight: 20, quantity: 5, price: 100 }),
      item({ symbol: 'MSFT', name: 'MSFT', target_weight: 30, quantity: 10, price: 200 }),
      item({ symbol: 'KO', name: 'KO', target_weight: 10, quantity: 20, price: 100 }),
    ])

  it('cubre de a uno ordenado por faltante desc', () => {
    const { steps, totalNeeded, remaining, covered } = distribute(300, plan())
    expect(steps[0].symbol).toBe('AAPL')
    expect(steps[0].amount).toBeCloseTo(300, 2)
    expect(remaining).toBeCloseTo(0, 2)
    expect(totalNeeded).toBeCloseTo(500, 2)
    expect(covered).toBe(false)
  })

  it('devuelve cobertura total cuando el presupuesto alcanza', () => {
    const { steps, covered, remaining } = distribute(1000000, plan())
    expect(steps[0].symbol).toBe('AAPL')
    expect(steps[0].amount).toBeCloseTo(500, 2)
    expect(covered).toBe(true)
    expect(remaining).toBeGreaterThan(0)
  })
})

describe('distribute estrategias', () => {
  const symbols = (steps) => steps.map((s) => s.symbol)
  const plan = () =>
    buildPlan([
      item({ symbol: 'AAPL', name: 'AAPL', target_weight: 40, quantity: 2, price: 70 }),
      item({ symbol: 'MSFT', name: 'MSFT', target_weight: 30, quantity: 0, price: 1000 }),
      item({ symbol: 'KO', name: 'KO', target_weight: 20, quantity: 10, price: 10 }),
      item({ symbol: 'GOLD', name: 'GOLD', target_weight: 10, quantity: 19, price: 40 }),
    ])

  it('default: mayor faltante ($) primero', () => {
    const { steps } = distribute(1000000, plan())
    expect(symbols(steps)).toEqual(['AAPL', 'MSFT', 'KO'])
    expect(steps[0].buy ?? steps[0].amount).toBeGreaterThanOrEqual(steps[1].amount)
  })

  it('gap: mayor faltante (%) primero', () => {
    const { steps } = distribute(1000000, plan(), 'gap')
    expect(symbols(steps)).toEqual(['MSFT', 'AAPL', 'KO'])
  })

  it('peso: mayor peso objetivo primero', () => {
    const { steps } = distribute(1000000, plan(), 'peso')
    expect(symbols(steps)).toEqual(['AAPL', 'MSFT', 'KO'])
  })

  it('billetera: mayor % de cartera primero', () => {
    const { steps } = distribute(1000000, plan(), 'billetera')
    expect(symbols(steps)).toEqual(['AAPL', 'KO', 'MSFT'])
  })

  it('barato: menor precio por unidad primero', () => {
    const { steps } = distribute(1000000, plan(), 'barato')
    expect(symbols(steps)).toEqual(['KO', 'AAPL', 'MSFT'])
  })

  it('caro: mayor precio por unidad primero', () => {
    const { steps } = distribute(1000000, plan(), 'caro')
    expect(symbols(steps)).toEqual(['MSFT', 'AAPL', 'KO'])
  })

  it('sin precio va al final en barato/caro', () => {
    const p = buildPlan([
      item({ symbol: 'AAPL', name: 'AAPL', target_weight: 50, quantity: 0, price: 100 }),
      item({ symbol: 'CASH', name: 'CASH', target_weight: 30, quantity: 0, price: null }),
      item({ symbol: 'KO', name: 'KO', target_weight: 20, quantity: 0, price: 50 }),
      item({ symbol: 'GOLD', name: 'GOLD', target_weight: 0, quantity: 10, price: 1000 }),
    ])
    expect(symbols(distribute(1000000, p, 'barato').steps)).toEqual(['KO', 'AAPL', 'CASH'])
    expect(symbols(distribute(1000000, p, 'caro').steps)).toEqual(['AAPL', 'KO', 'CASH'])
  })
})

describe('portfolioChangePct', () => {
  it('pondera el cambio diario por el valor de ayer', () => {
    const items = [
      { price: 100, quantity: 2, changePct: 10 }, // hoy 200, ayer ~181.82
      { price: 100, quantity: 1, changePct: -50 }, // hoy 100, ayer 200
    ]
    const pct = portfolioChangePct(items)
    const today = 300
    const yesterday = 200 / 1.1 + 100 / 0.5
    expect(pct).toBeCloseTo((today / yesterday - 1) * 100, 6)
  })

  it('ignora activos sin precio o sin cambio', () => {
    const items = [
      { price: 100, quantity: 1, changePct: 0 },
      { price: null, quantity: 1, changePct: 5 },
      { price: 100, quantity: 1, changePct: null },
    ]
    expect(portfolioChangePct(items)).toBeCloseTo(0, 6)
  })

  it('devuelve null sin activos con precio', () => {
    expect(portfolioChangePct([{ price: null, quantity: 1, changePct: 5 }])).toBeNull()
    expect(portfolioChangePct([])).toBeNull()
  })
})
