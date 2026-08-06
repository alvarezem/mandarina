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

function buildAnalysis(txs) {
  const relevant = txs.filter((t) => !EXCLUDED_CATEGORIES.includes(t.category))
  const ars = relevant.filter((t) => t.currency !== 'USD')
  const usd = relevant.filter((t) => t.currency === 'USD')

  const dates = ars.map((t) => t.date).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]
  const days = Math.max(
    1,
    Math.round((new Date(to) - new Date(from)) / 86400000) + 1,
  )

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
    excludedCount: txs.length - relevant.length,
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
      byCategory: aggregate(usd.filter((t) => t.amount < 0), 'category').sort((a, b) => b.total - a.total),
      maxExpense: usdMaxExpense,
    }
  }

  return result
}

export { computeTotals, aggregate, buildAnalysis, EXCLUDED_CATEGORIES }
