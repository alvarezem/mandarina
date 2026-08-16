// Funciones puras del Ledger de operaciones.
// El costo promedio móvil: cada compra/ajuste sube el costo ponderado
// (precio + comisión por unidad); las ventas solo bajan la cantidad,
// sin alterar el costo por unidad que queda.
// Cada operación lleva su moneda (ARS o USD); los montos se conservan en esa
// moneda y se convierten a la base (ARS) solo al valuar los totales.

export function ledgerQuantity(ops) {
  return (Array.isArray(ops) ? ops : []).reduce((acc, op) => {
    const qty = Number(op.quantity) || 0
    return op.side === 'venta' ? acc - qty : acc + qty
  }, 0)
}

// Monto en currency de la comisión de una operación: si `commission_is_pct`
// es true, commission es un porcentaje de (cantidad × precio); si no (o si el
// flag falta — filas legacy), es un monto fijo.
export function commissionAmount(op) {
  const comm = Number(op?.commission) || 0
  if (op?.commission_is_pct) {
    const qty = Number(op.quantity) || 0
    const price = Number(op.price) || 0
    return (qty * price * comm) / 100
  }
  return comm
}

export function costBasis(ops) {
  const sorted = [...(Array.isArray(ops) ? ops : [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  )
  return sorted.reduce(
    (acc, op) => {
      const qty = Number(op.quantity) || 0
      const price = Number(op.price) || 0
      const commission = commissionAmount(op)
      if (op.side === 'venta') {
        const next = acc.quantity - qty
        if (next < 0) acc.exceeded = true
        acc.quantity = Math.max(0, next)
      } else {
        const cost = qty * price + commission
        const prevQty = acc.quantity
        const newQty = prevQty + qty
        acc.quantity = newQty
        acc.invested += cost
        acc.avgCost = newQty > 0 ? (acc.avgCost * prevQty + cost) / newQty : 0
      }
      return acc
    },
    { quantity: 0, avgCost: 0, invested: 0, exceeded: false },
  )
}

export function profitability(holdings, price) {
  const qty = Number(holdings?.quantity) || 0
  const avgCost = Number(holdings?.avgCost) || 0
  if (qty <= 0 || price == null || price === '') return { pnl: 0, pnlPct: 0 }
  const p = Number(price)
  if (!Number.isFinite(p)) return { pnl: 0, pnlPct: 0 }
  const pnl = (p - avgCost) * qty
  const pnlPct = avgCost > 0 ? (p / avgCost - 1) * 100 : 0
  return { pnl, pnlPct }
}

// Convierte un monto a la moneda base (ARS) usando el rate provisto
// (ARS por USD). Si la operación ya es ARS, devuelve el monto tal cual.
// Sin rate para USD no hay conversión posible: devuelve 0 (se excluye).
export function toBase(value, currency = 'ARS', rate) {
  const v = Number(value) || 0
  if (currency !== 'USD') return v
  return rate ? v * Number(rate) : 0
}

// Agrupa las operaciones por símbolo y devuelve el resumen de cada uno
// (cantidad, costo promedio, invertido y moneda de la posición) ordenado por
// símbolo. La moneda es la de la primera operación del símbolo (default ARS).
export function summarize(ops) {
  const perSymbol = new Map()
  for (const op of Array.isArray(ops) ? ops : []) {
    if (!perSymbol.has(op.symbol)) perSymbol.set(op.symbol, [])
    perSymbol.get(op.symbol).push(op)
  }
  return [...perSymbol.entries()]
    .map(([symbol, list]) => ({
      symbol,
      currency: list[0]?.currency || 'ARS',
      ...costBasis(list),
      ops: list.length,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
}
