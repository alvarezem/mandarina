// Funciones puras del Plan de inversión.
// Semántica de "a comprar" (forma 2): (T·V − v) / (1 − T), exacta activo por
// activo cuando se compra de a uno y se recalcula en vivo.

export function valueOf(quantity, price) {
  return (Number(quantity) || 0) * (Number(price) || 0)
}

export function actualPct(value, total) {
  if (!total) return 0
  return (value / total) * 100
}

export function gapPct(targetPct, actualPct) {
  return (Number(targetPct) || 0) - (Number(actualPct) || 0)
}

export function buyAmount(targetPct, total, value) {
  const t = (Number(targetPct) || 0) / 100
  const V = Number(total) || 0
  const v = Number(value) || 0
  if (t >= 1 || t < 0) return 0
  const need = (t * V - v) / (1 - t)
  return Math.max(0, need)
}

export function buyQty(amount, price) {
  const a = Number(amount) || 0
  const p = Number(price) || 0
  if (!p || a <= 0) return 0
  return Math.floor(a / p)
}

export function isOver(targetPct, actualPct) {
  return (Number(actualPct) || 0) > (Number(targetPct) || 0)
}

export function buildPlan(items) {
  const withValues = items.map((item) => ({
    ...item,
    value: valueOf(item.quantity, item.price),
  }))
  // Criterio: los sin-precio entran al total como 0 (su valor real es
  // desconocido) y no generan buy — sin precio no se puede comprar.
  const total = withValues.reduce((sum, item) => sum + item.value, 0)
  return withValues.map((item) => {
    const target = Number(item.target_weight) || 0
    const ap = actualPct(item.value, total)
    const buy = item.price == null ? 0 : buyAmount(target, total, item.value)
    return {
      ...item,
      total,
      actualPct: ap,
      gap: gapPct(target, ap),
      buy,
      buyQty: buyQty(buy, item.price),
      over: isOver(target, ap),
    }
  })
}

export function portfolioChangePct(items) {
  let now = 0
  let prev = 0
  for (const item of items) {
    const chg = item.changePct
    // chg = -100 haría 1 + chg/100 = 0 (precio de ayer indefinido);
    // < -100 daría prev negativo. Sin precio ayer no hay cambio computable.
    if (chg == null || item.price == null) continue
    if (chg <= -100) return null
    const value = valueOf(item.quantity, item.price)
    now += value
    prev += value / (1 + chg / 100)
  }
  if (prev <= 0) return null
  return (now / prev - 1) * 100
}

const STRATEGY_SORTERS = {
  faltante: (a, b) => b.buy - a.buy,
  gap: (a, b) => b.gap - a.gap,
  billetera: (a, b) => b.actualPct - a.actualPct,
  peso: (a, b) => b.target_weight - a.target_weight,
  barato: (a, b) => {
    if (a.price == null && b.price == null) return 0
    if (a.price == null) return 1
    if (b.price == null) return -1
    return a.price - b.price
  },
  caro: (a, b) => {
    if (a.price == null && b.price == null) return 0
    if (a.price == null) return 1
    if (b.price == null) return -1
    return b.price - a.price
  },
}

export function distribute(budget, builtItems, strategy = 'faltante') {
  const underweight = builtItems
    .filter((item) => item.buy > 0)
    .sort(STRATEGY_SORTERS[strategy] ?? STRATEGY_SORTERS.faltante)
  let remaining = Number(budget) || 0
  const steps = []
  const skipped = []
  for (const item of underweight) {
    if (remaining <= 0) break
    const amount = Math.min(item.buy, remaining)
    const qty = buyQty(amount, item.price)
    if (qty === 0) {
      skipped.push({ symbol: item.symbol, name: item.name, price: item.price })
      continue
    }
    steps.push({
      symbol: item.symbol,
      name: item.name,
      amount,
      qty,
      price: item.price,
      targetWeight: item.target_weight,
    })
    remaining -= amount
  }
  const totalNeeded = underweight.reduce((sum, item) => sum + item.buy, 0)
  return {
    steps,
    skipped,
    remaining,
    totalNeeded,
    covered: totalNeeded <= (Number(budget) || 0),
  }
}
