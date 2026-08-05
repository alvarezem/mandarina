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
import { buildAnalysis } from '../lib/analysis'

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

const PERIODS = [
  { key: 'thisMonth', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'last3m', label: 'Últimos 3 meses' },
  { key: 'last12m', label: 'Últimos 12 meses' },
  { key: 'thisYear', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
  { key: 'custom', label: 'Personalizado' },
]

const CURRENCIES = [
  { key: 'all', label: 'Ambas' },
  { key: 'ARS', label: 'ARS' },
  { key: 'USD', label: 'USD' },
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
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

const chipBase =
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition'

const chipActive =
  'border-teal-600 bg-teal-600 text-white'
const chipInactive =
  'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

export default function Dashboard({ summaryId, dark, refreshKey }) {
  const [allTx, setAllTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('todo')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [categories, setCategories] = useState([])
  const [currency, setCurrency] = useState('all')
  const [query, setQuery] = useState('')
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

  const categoryOptions = useMemo(
    () => [...new Set(base.map((t) => t.category).filter(Boolean))].sort(),
    [base],
  )

  const filtered = useMemo(() => {
    let txs = base
    if (currency === 'ARS') txs = txs.filter((t) => t.currency !== 'USD')
    if (currency === 'USD') txs = txs.filter((t) => t.currency === 'USD')
    if (categories.length) txs = txs.filter((t) => categories.includes(t.category))
    const q = query.trim().toLowerCase()
    if (q) txs = txs.filter((t) => t.merchant.toLowerCase().includes(q))
    return txs
  }, [base, currency, categories, query])

  const analysis = useMemo(() => buildAnalysis(filtered), [filtered])

  const toggleCategory = (cat) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600 dark:border-slate-600 dark:border-t-teal-500" />
        Cargando…
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Período
          </span>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`${chipBase} ${period === p.key ? chipActive : chipInactive}`}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">a</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Categoría
            </span>
            {categoryOptions.length === 0 && (
              <span className="text-xs text-slate-400">(sin categorías en el período)</span>
            )}
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`${chipBase} ${
                  categories.includes(cat) ? chipActive : chipInactive
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              {CURRENCIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCurrency(c.key)}
                  className={`px-3 py-1 text-xs font-medium transition ${
                    currency === c.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar comercio…"
              className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin transacciones para este período."
          hint="Probá con otro rango de fechas o quitá los filtros."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            <Card label="Créditos" value={fmt(analysis.totals.credits)} valueClass="text-emerald-600 dark:text-emerald-400" />
            <Card label="Débitos" value={fmt(analysis.totals.debits)} valueClass="text-red-600 dark:text-red-400" />
            <Card label="Neto" value={fmt(analysis.totals.net)} />
            <Card label="Movimientos" value={analysis.totals.txCount} />
            {analysis.maxExpense && (
              <Card
                label="Mayor gasto"
                value={fmt(analysis.maxExpense.amount)}
                valueClass="text-red-600 dark:text-red-400"
                sub={analysis.maxExpense.merchant}
              />
            )}
            {analysis.maxCredit && (
              <Card
                label="Mayor ingreso"
                value={fmt(analysis.maxCredit.amount)}
                valueClass="text-emerald-600 dark:text-emerald-400"
                sub={analysis.maxCredit.merchant}
              />
            )}
            {analysis.usd && (
              <Card
                label="Gastos USD"
                value={fmt(analysis.usd.totals.debits, 'USD')}
                valueClass="text-red-600 dark:text-red-400"
                sub={`${analysis.usd.totals.txCount} movimientos`}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Balance acumulado</h3>
              <div className="h-64">
                <Line data={lineData(analysis.balanceTrend)} options={lineOptions(dark)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gasto por categoría</h3>
              <div className="h-64">
                <Doughnut data={doughnutData(analysis.byCategory)} options={doughnutOptions(dark)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Top comercios con mayor gasto
            </h3>
            <div className="h-72">
              <Bar data={barData(analysis.byMerchant)} options={barOptions(dark)} />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</th>
                    {!summaryId && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resumen</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Moneda</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filtered.map((t) => (
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

function lineData(balanceTrend) {
  const gradient = (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return 'rgba(13,148,136,0.15)'
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    g.addColorStop(0, 'rgba(13,148,136,0.02)')
    g.addColorStop(1, 'rgba(13,148,136,0.18)')
    return g
  }
  return {
    labels: balanceTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Balance acumulado',
        data: balanceTrend.map((d) => d.runningBalance),
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

function lineOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` Balance: ${fmt(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 11 } } },
      y: { grid: { color: dark ? '#1e293b' : '#f1f5f9' }, ticks: axisTicks(dark) },
    },
  }
}

function doughnutOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
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

function barOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
