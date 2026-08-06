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
  if (t >= 1) return 0
  const need = (t * V - v) / (1 - t)
  return Math.max(0, need)
}

export function buyQty(amount, price) {
  const a = Number(amount) || 0
  const p = Number(price) || 0
  if (!p) return 0
  const q = Math.floor(a / p)
  return q === 0 && a > 0 ? 1 : q
}

export function isOver(targetPct, actualPct) {
  return (Number(actualPct) || 0) > (Number(targetPct) || 0)
}

export function buildPlan(items) {
  const withValues = items.map((item) => ({
    ...item,
    value: valueOf(item.quantity, item.price),
  }))
  const total = withValues.reduce((sum, item) => sum + item.value, 0)
  return withValues.map((item) => {
    const target = Number(item.target_weight) || 0
    const ap = actualPct(item.value, total)
    const buy = buyAmount(target, total, item.value)
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
    if (chg == null || item.price == null) continue
    const value = valueOf(item.quantity, item.price)
    now += value
    prev += value / (1 + chg / 100)
  }
  if (prev <= 0) return null
  return (now / prev - 1) * 100
}

export function distribute(budget, builtItems) {
  const underweight = builtItems
    .filter((item) => item.buy > 0)
    .sort((a, b) => b.buy - a.buy)
  let remaining = Number(budget) || 0
  const steps = []
  let i = 0
  for (; i < underweight.length; i++) {
    if (remaining <= 0) break
    const item = underweight[i]
    const amount = Math.min(item.buy, remaining)
    steps.push({
      symbol: item.symbol,
      name: item.name,
      amount,
      qty: buyQty(amount, item.price),
      price: item.price,
      targetWeight: item.target_weight,
    })
    remaining -= amount
  }
  const totalNeeded = underweight.reduce((sum, item) => sum + item.buy, 0)
  return { steps, remaining, totalNeeded, covered: totalNeeded <= (Number(budget) || 0) }
}
