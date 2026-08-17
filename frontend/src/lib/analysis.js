const EXCLUDED_CATEGORIES = ['Pagos']

function computeTotals(txs) {
  let credits = 0
  let debits = 0
  for (const tx of txs) {
    if (tx.amount >= 0) credits += tx.amount
    else debits += tx.amount
  }
  return {
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    net: Math.round((credits + debits) * 100) / 100,
    txCount: txs.length,
  }
}

function aggregate(txs, kind) {
  const map = new Map()
  for (const tx of txs) {
    const key = kind === 'merchant' ? tx.merchant : tx.category
    const e = map.get(key) || { [kind]: key, count: 0, total: 0 }
    e.count += 1
    e.total += tx.amount
    map.set(key, e)
  }
  return [...map.values()]
}

function buildAnalysis(txs, { includePayments = false } = {}) {
  const relevant = includePayments
    ? txs
    : txs.filter((t) => !EXCLUDED_CATEGORIES.includes(t.category))
  const ars = relevant.filter((t) => t.currency !== 'USD')
  const usd = relevant.filter((t) => t.currency === 'USD')

  const dates = ars.map((t) => t.date).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]
  const days =
    from && to ? Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1) : 1

  const totals = computeTotals(ars)

  let maxExpense = null
  const byDay = new Map()
  for (const tx of ars) {
    const d = byDay.get(tx.date) || { date: tx.date, credits: 0, debits: 0 }
    if (tx.amount >= 0) d.credits += tx.amount
    else d.debits += tx.amount
    byDay.set(tx.date, d)

    if (maxExpense === null || tx.amount < maxExpense.amount) {
      maxExpense = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
  }

  const byDaySorted = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))

  let runningExpense = 0
  const expenseTrend = byDaySorted.map((d) => {
    runningExpense += Math.abs(d.debits)
    return { date: d.date, accumulated: Math.round(runningExpense * 100) / 100 }
  })

  const spending = ars.filter((t) => t.amount < 0)

  const result = {
    period: { from, to, days },
    totals,
    maxExpense,
    byMerchant: aggregate(spending, 'merchant')
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 10),
    byCategory: aggregate(spending, 'category').sort((a, b) => b.total - a.total),
    byDay: byDaySorted,
    expenseTrend,
    excludedCount: includePayments ? 0 : txs.length - relevant.length,
  }

  if (usd.length > 0) {
    let usdMaxExpense = null
    for (const tx of usd) {
      if (usdMaxExpense === null || tx.amount < usdMaxExpense.amount) {
        usdMaxExpense = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
      }
    }
    result.usd = {
      totals: computeTotals(usd),
      byCategory: aggregate(
        usd.filter((t) => t.amount < 0),
        'category',
      ).sort((a, b) => b.total - a.total),
      maxExpense: usdMaxExpense,
    }
  }

  return result
}

function buildIncomeAnalysis(txs, { includePayments = false } = {}) {
  const relevant = includePayments
    ? txs
    : txs.filter((t) => !EXCLUDED_CATEGORIES.includes(t.category))
  const ars = relevant.filter((t) => t.currency !== 'USD')
  const usd = relevant.filter((t) => t.currency === 'USD')

  const incomes = ars.filter((t) => t.amount > 0)

  const dates = ars.map((t) => t.date).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]
  const days =
    from && to ? Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1) : 1

  const totals = computeTotals(ars)

  let maxIncome = null
  const byDay = new Map()
  for (const tx of ars) {
    if (tx.amount <= 0) continue
    const d = byDay.get(tx.date) || { date: tx.date, income: 0 }
    d.income += tx.amount
    byDay.set(tx.date, d)

    if (maxIncome === null || tx.amount > maxIncome.amount) {
      maxIncome = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
  }

  const byDaySorted = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))

  let runningIncome = 0
  const incomeTrend = byDaySorted.map((d) => {
    runningIncome += d.income
    return { date: d.date, accumulated: Math.round(runningIncome * 100) / 100 }
  })

  const result = {
    period: { from, to, days },
    totals,
    maxIncome,
    byCategory: aggregate(incomes, 'category').sort((a, b) => b.total - a.total),
    byMerchant: aggregate(incomes, 'merchant')
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 10),
    byDay: byDaySorted,
    incomeTrend,
    sources: buildIncomeSources(incomes),
    excludedCount: includePayments ? 0 : txs.length - relevant.length,
  }

  if (usd.length > 0) {
    let usdMaxIncome = null
    for (const t of usd) {
      if (t.amount > 0 && (usdMaxIncome === null || t.amount > usdMaxIncome.amount)) {
        usdMaxIncome = { amount: t.amount, merchant: t.merchant, date: t.date }
      }
    }
    result.usd = {
      totals: computeTotals(usd),
      maxIncome: usdMaxIncome,
      byCategory: aggregate(
        usd.filter((t) => t.amount > 0),
        'category',
      ).sort((a, b) => b.total - a.total),
      byMerchant: aggregate(
        usd.filter((t) => t.amount > 0),
        'merchant',
      )
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
        .slice(0, 10),
    }
  }

  return result
}

// Mes de una transacción para la recurrencia: prefiere el período del summary
// joined (card_summaries.period_year/period_month) y cae al mes de tx.date si
// el summary no trae período (datos viejos).
function monthKey(tx) {
  const cs = tx.card_summaries
  const summary = Array.isArray(cs) ? cs[0] : cs
  if (summary && summary.period_year && summary.period_month) {
    return `${summary.period_year}-${String(summary.period_month).padStart(2, '0')}`
  }
  if (tx.date) return tx.date.slice(0, 7)
  return null
}

function buildIncomeSources(txs, { minMonthsRecurring = 2 } = {}) {
  const map = new Map()
  for (const tx of txs) {
    if (tx.amount <= 0 || !tx.merchant) continue
    const key = tx.merchant
    const e = map.get(key) || {
      merchant: tx.merchant,
      category: null,
      count: 0,
      total: 0,
      months: new Set(),
    }
    e.count += 1
    e.total += tx.amount
    if (e.category === null && tx.category) e.category = tx.category
    const mk = monthKey(tx)
    if (mk) e.months.add(mk)
    map.set(key, e)
  }
  return [...map.values()]
    .map((e) => ({
      merchant: e.merchant,
      category: e.category,
      count: e.count,
      total: Math.round(e.total * 100) / 100,
      monthCount: e.months.size,
      recurring: e.months.size >= minMonthsRecurring,
    }))
    .sort((a, b) => b.total - a.total)
}

export {
  computeTotals,
  aggregate,
  buildAnalysis,
  buildIncomeAnalysis,
  buildIncomeSources,
  EXCLUDED_CATEGORIES,
}
