// Funciones puras del Ledger de operaciones.
// El costo promedio móvil: cada compra/ajuste sube el costo ponderado
// (precio + comisión por unidad); las ventas solo bajan la cantidad,
// sin alterar el costo por unidad que queda.
// Todo en currency de la operación (por ahora siempre ARS).

export function ledgerQuantity(ops) {
  return (Array.isArray(ops) ? ops : []).reduce((acc, op) => {
    const qty = Number(op.quantity) || 0
    return op.side === 'venta' ? acc - qty : acc + qty
  }, 0)
}

export function costBasis(ops) {
  const sorted = [...(Array.isArray(ops) ? ops : [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  )
  return sorted.reduce(
    (acc, op) => {
      const qty = Number(op.quantity) || 0
      const price = Number(op.price) || 0
      const commission = Number(op.commission) || 0
      if (op.side === 'venta') {
        acc.quantity = Math.max(0, acc.quantity - qty)
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
    { quantity: 0, avgCost: 0, invested: 0 },
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

// Agrupa las operaciones por símbolo y devuelve el resumen de cada uno
// (cantidad, costo promedio e invertido) ordenado por símbolo.
export function summarize(ops) {
  const perSymbol = new Map()
  for (const op of Array.isArray(ops) ? ops : []) {
    if (!perSymbol.has(op.symbol)) perSymbol.set(op.symbol, [])
    perSymbol.get(op.symbol).push(op)
  }
  return [...perSymbol.entries()]
    .map(([symbol, list]) => ({ symbol, ...costBasis(list), ops: list.length }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
}
