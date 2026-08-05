import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import supabase from '../lib/supabaseClient'
import { buildAnalysis, EXCLUDED_CATEGORIES } from '../lib/analysis'
import FiltersBar from './FiltersBar'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

const fmt = (n, currency = 'ARS') =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

const fmtCompact = (n, currency = 'ARS') =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    notation: 'compact',
  }).format(n)

const PALETTE = [
  '#0d9488',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#0ea5e9',
  '#94a3b8',
  '#14b8a6',
]

function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodRange(period) {
  const today = new Date()
  switch (period) {
    case 'thisMonth':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: ymd(from), to: ymd(to) }
    }
    case 'last3m':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: ymd(today) }
    case 'last12m':
      return { from: ymd(new Date(today.getFullYear() - 1, today.getMonth(), 1)), to: ymd(today) }
    case 'thisYear':
      return { from: ymd(new Date(today.getFullYear(), 0, 1)), to: ymd(today) }
    default:
      return null
  }
}

function fileOf(t) {
  const cs = t.card_summaries
  if (!cs) return null
  return Array.isArray(cs) ? cs[0]?.file_name ?? null : cs.file_name ?? null
}

function Card({ label, value, sub, valueClass = 'text-slate-900 dark:text-slate-100' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:shadow-teal-500/10">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-3 h-7 w-28 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

function SortableTh({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition ${
          active
            ? 'text-teal-600 dark:text-teal-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        {label}
        {active && <span className="text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}

export default function Dashboard({ summaryId, dark, refreshKey, resetKey, onSummarySelect }) {
  const [allTx, setAllTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('todo')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [categories, setCategories] = useState([])
  const [currency, setCurrency] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const tableRef = useRef(null)
  const autoApplied = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, card_summaries(file_name)')
        .order('date', { ascending: false })
      if (!active) return
      setError(error ? error.message : null)
      setAllTx(data ?? [])
      setLoading(false)
      if (!autoApplied.current) {
        autoApplied.current = true
        const dates = (data ?? []).map((t) => t.date).filter(Boolean).sort()
        if (dates.length) {
          const first = parseYmd(dates[0])
          const cutoff = new Date()
          cutoff.setFullYear(cutoff.getFullYear() - 1)
          if (first < cutoff) setPeriod('last12m')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [refreshKey])

  useEffect(() => {
    setPeriod('todo')
    setCustomFrom('')
    setCustomTo('')
    setCategories([])
    setCurrency('all')
    setQuery('')
  }, [resetKey])

  const base = useMemo(() => {
    let txs = allTx
    if (summaryId) txs = txs.filter((t) => t.summary_id === summaryId)
    const range = periodRange(period)
    if (range) txs = txs.filter((t) => t.date >= range.from && t.date <= range.to)
    if (period === 'custom') {
      if (customFrom) txs = txs.filter((t) => t.date >= customFrom)
      if (customTo) txs = txs.filter((t) => t.date <= customTo)
    }
    return txs
  }, [allTx, summaryId, period, customFrom, customTo])

  const working = useMemo(
    () => base.filter((t) => !EXCLUDED_CATEGORIES.includes(t.category)),
    [base],
  )
  const paymentsCount = base.length - working.length

  const categoryOptions = useMemo(
    () => [...new Set(working.map((t) => t.category).filter(Boolean))].sort(),
    [working],
  )

  const summaryOptions = useMemo(() => {
    const seen = new Map()
    for (const t of allTx) {
      if (!t.summary_id) continue
      const name = fileOf(t)
      if (name && !seen.has(t.summary_id)) seen.set(t.summary_id, name)
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allTx])

  const hasActiveFilters =
    period !== 'todo' ||
    Boolean(customFrom) ||
    Boolean(customTo) ||
    categories.length > 0 ||
    currency !== 'all' ||
    query.trim() !== '' ||
    summaryId !== null

  const clearFilters = () => {
    setPeriod('todo')
    setCustomFrom('')
    setCustomTo('')
    setCategories([])
    setCurrency('all')
    setQuery('')
    onSummarySelect?.(null)
  }

  const filtered = useMemo(() => {
    let txs = working
    if (currency === 'ARS') txs = txs.filter((t) => t.currency !== 'USD')
    if (currency === 'USD') txs = txs.filter((t) => t.currency === 'USD')
    if (categories.length) txs = txs.filter((t) => categories.includes(t.category))
    const q = query.trim().toLowerCase()
    if (q) txs = txs.filter((t) => t.merchant.toLowerCase().includes(q))
    return txs
  }, [working, currency, categories, query])

  const analysis = useMemo(() => buildAnalysis(filtered), [filtered])

  const SORT_DEFAULTS = { date: 'desc', amount: 'asc', merchant: 'asc', category: 'asc', currency: 'asc', summary: 'asc' }

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_DEFAULTS[key] }))

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, dir } = sort
    arr.sort((a, b) => {
      let cmp = 0
      const cmpStr = (x, y) => String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' })
      if (key === 'amount') cmp = a.amount - b.amount
      else if (key === 'date') cmp = cmpStr(a.date, b.date)
      else if (key === 'category') cmp = cmpStr(a.category, b.category)
      else if (key === 'currency') cmp = cmpStr(a.currency, b.currency)
      else if (key === 'summary') cmp = cmpStr(fileOf(a), fileOf(b))
      else cmp = cmpStr(a.merchant, b.merchant)
      return dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sort])

  const toggleCategory = (cat) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))

  const focusCategory = (cat) =>
    setCategories((prev) => (prev.length === 1 && prev[0] === cat ? [] : [cat]))

  const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (allTx.length === 0) {
    return (
      <EmptyState
        title="Subí un resumen para empezar."
        hint="Usá la barra lateral para subir tu primer PDF, CSV o XLSX."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <FiltersBar
          period={period}
          onPeriod={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
          summaryOptions={summaryOptions}
          summaryId={summaryId}
          onSummarySelect={onSummarySelect}
          categoryOptions={categoryOptions}
          categories={categories}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setCategories([])}
          currency={currency}
          onCurrency={setCurrency}
          query={query}
          onQuery={setQuery}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
        {paymentsCount > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {paymentsCount} {paymentsCount === 1 ? 'pago' : 'pagos'} de tarjeta excluido
            {paymentsCount === 1 ? '' : 's'} de los totales.
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin transacciones para este período."
          hint="Probá con otro rango de fechas o quitá los filtros."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {[
              { label: 'Débitos', value: fmt(analysis.totals.debits), valueClass: 'text-red-600 dark:text-red-400' },
              { label: 'Movimientos', value: analysis.totals.txCount },
              ...(analysis.maxExpense
                ? [
                    {
                      label: 'Mayor gasto ARS',
                      value: fmt(analysis.maxExpense.amount),
                      valueClass: 'text-red-600 dark:text-red-400',
                      sub: analysis.maxExpense.merchant,
                    },
                  ]
                : []),
              ...(analysis.usd?.maxExpense
                ? [
                    {
                      label: 'Mayor gasto USD',
                      value: fmt(analysis.usd.maxExpense.amount, 'USD'),
                      valueClass: 'text-red-600 dark:text-red-400',
                      sub: analysis.usd.maxExpense.merchant,
                    },
                  ]
                : []),
              ...(analysis.usd
                ? [
                    {
                      label: 'Gastos USD',
                      value: fmt(analysis.usd.totals.debits, 'USD'),
                      valueClass: 'text-red-600 dark:text-red-400',
                      sub: `${analysis.usd.totals.txCount} movimientos`,
                    },
                  ]
                : []),
            ].map((c, i) => (
              <div key={c.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <Card {...c} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              style={{ animationDelay: '80ms' }}
            >
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gastos acumulados</h3>
              <div className="h-64">
                <Line
                  data={lineData(analysis.expenseTrend)}
                  options={lineOptions(dark, (date) => {
                    setPeriod('custom')
                    setCustomFrom(date)
                    setCustomTo(date)
                    scrollToTable()
                  })}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Clic en un punto filtra el detalle de ese día.
              </p>
            </div>
            <div
              className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              style={{ animationDelay: '140ms' }}
            >
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gasto por categoría</h3>
              <div className="h-64">
                <Doughnut
                  data={doughnutData(analysis.byCategory)}
                  options={doughnutOptions(dark, (cat) => {
                    focusCategory(cat)
                    scrollToTable()
                  })}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Clic en un segmento filtra el detalle por categoría.
              </p>
            </div>
          </div>

          <div
            className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            style={{ animationDelay: '200ms' }}
          >
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Top comercios con mayor gasto
              </h3>
              <div className="h-72">
                <Bar
                  data={barData(analysis.byMerchant)}
                  options={barOptions(dark, (merchant) => {
                    setQuery(merchant)
                    scrollToTable()
                  })}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Clic en una barra filtra el detalle por comercio.
              </p>
            </div>

          <div
            ref={tableRef}
            className="animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            style={{ animationDelay: '260ms' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalle</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <SortableTh label="Fecha" sortKey="date" sort={sort} onSort={onSort} />
                    <SortableTh label="Descripción" sortKey="merchant" sort={sort} onSort={onSort} />
                    {!summaryId && (
                      <SortableTh label="Resumen" sortKey="summary" sort={sort} onSort={onSort} />
                    )}
                    <SortableTh label="Categoría" sortKey="category" sort={sort} onSort={onSort} />
                    <SortableTh label="Moneda" sortKey="currency" sort={sort} onSort={onSort} />
                    <SortableTh label="Monto" sortKey="amount" sort={sort} onSort={onSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {sorted.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 text-sm text-slate-600 tabular-nums dark:text-slate-400">{t.date}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{t.merchant}</td>
                      {!summaryId && (
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{fileOf(t) ?? '—'}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t.category ?? '—'}</td>
                      <td className="px-4 py-3">
                        {t.currency === 'USD' ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">USD</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">ARS</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                          t.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {fmt(t.amount, t.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function lineData(expenseTrend) {
  const gradient = (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return 'rgba(13,148,136,0.15)'
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    g.addColorStop(0, 'rgba(13,148,136,0.02)')
    g.addColorStop(1, 'rgba(13,148,136,0.18)')
    return g
  }
  return {
    labels: expenseTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Gastos acumulados',
        data: expenseTrend.map((d) => d.accumulated),
        borderColor: '#0d9488',
        backgroundColor: gradient,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }
}

function doughnutData(byCategory) {
  return {
    labels: byCategory.map((c) => c.category),
    datasets: [
      {
        data: byCategory.map((c) => c.total),
        backgroundColor: PALETTE,
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }
}

function barData(byMerchant) {
  const top = byMerchant.filter((m) => m.total < 0).slice(0, 8)
  return {
    labels: top.map((m) => m.merchant),
    datasets: [
      {
        label: 'Gasto por comercio',
        data: top.map((m) => m.total),
        backgroundColor: '#0d9488',
        hoverBackgroundColor: '#0f766e',
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }
}

function axisTicks(dark, currency = 'ARS') {
  return {
    color: dark ? '#64748b' : '#94a3b8',
    font: { size: 11 },
    callback: (value) => fmtCompact(value, currency),
  }
}

function lineOptions(dark, onPoint) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onPoint(chart.data.labels[el.index])
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` Gasto acumulado: ${fmt(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 11 } } },
      y: { suggestedMin: 0, grid: { color: dark ? '#1e293b' : '#f1f5f9' }, ticks: axisTicks(dark) },
    },
  }
}

function doughnutOptions(dark, onSlice) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onSlice(chart.data.labels[el.index])
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: dark ? '#cbd5e1' : '#475569', boxWidth: 10, boxHeight: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` },
      },
    },
  }
}

function barOptions(dark, onBar) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onBar(chart.data.labels[el.index])
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.x)}` },
      },
    },
    scales: {
      x: { grid: { color: dark ? '#1e293b' : '#f1f5f9' }, ticks: axisTicks(dark) },
      y: { grid: { display: false }, ticks: { color: dark ? '#cbd5e1' : '#475569', font: { size: 11 } } },
    },
  }
}
