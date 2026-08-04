import { useEffect, useState } from 'react'
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

export default function Dashboard({ summaryId, dark }) {
  const [analysis, setAnalysis] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!summaryId) {
      setAnalysis(null)
      setTransactions([])
      return
    }
    let active = true
    setLoading(true)
    setError(null)

    const load = async () => {
      const [{ data: a }, { data: t }] = await Promise.all([
        supabase.from('consumption_analyses').select('result').eq('summary_id', summaryId).maybeSingle(),
        supabase.from('transactions').select('*').eq('summary_id', summaryId).order('date', { ascending: false }),
      ])
      if (!active) return
      setAnalysis(a?.result ?? null)
      setTransactions(t ?? [])
      setLoading(false)
    }
    load()

    return () => {
      active = false
    }
  }, [summaryId])

  if (!summaryId) {
    return (
      <EmptyState title="Seleccioná un resumen en la barra lateral." hint="Subí un resumen para ver tu análisis de consumo." />
    )
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600 dark:border-slate-600 dark:border-t-teal-500" />
        Cargando…
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (!analysis) {
    return (
      <EmptyState
        title="Este resumen todavía no tiene análisis disponibles."
        hint="El procesamiento puede tardar unos segundos."
      />
    )
  }

  const { totals, maxExpense, maxCredit, byCategory, byMerchant, balanceTrend, usd } = analysis

  const isDark = dark
  const tickColor = isDark ? '#64748b' : '#94a3b8'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const axisLabelColor = isDark ? '#cbd5e1' : '#475569'

  const lineGradient = (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return 'rgba(13,148,136,0.15)'
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    g.addColorStop(0, 'rgba(13,148,136,0.02)')
    g.addColorStop(1, 'rgba(13,148,136,0.18)')
    return g
  }

  const balanceData = {
    labels: balanceTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Balance acumulado',
        data: balanceTrend.map((d) => d.runningBalance),
        borderColor: '#0d9488',
        backgroundColor: lineGradient,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }

  const categoryData = {
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

  const topMerchants = byMerchant.filter((m) => m.total < 0).slice(0, 8)

  const merchantData = {
    labels: topMerchants.map((m) => m.merchant),
    datasets: [
      {
        label: 'Gasto por comercio',
        data: topMerchants.map((m) => m.total),
        backgroundColor: '#0d9488',
        hoverBackgroundColor: '#0f766e',
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
  }

  const axisTicks = (currency = 'ARS') => ({
    color: tickColor,
    font: { size: 11 },
    callback: (value) => fmtCompact(value, currency),
  })

  const lineOptions = {
    ...chartDefaults,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Balance: ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: axisTicks() },
    },
  }

  const categoryOptions = {
    ...chartDefaults,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: axisLabelColor, boxWidth: 10, boxHeight: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}`,
        },
      },
    },
  }

  const merchantOptions = {
    ...chartDefaults,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.parsed.x)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: axisTicks(),
      },
      y: { grid: { display: false }, ticks: { color: axisLabelColor, font: { size: 11 } } },
    },
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <Card label="Créditos" value={fmt(totals.credits)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <Card label="Débitos" value={fmt(totals.debits)} valueClass="text-red-600 dark:text-red-400" />
        <Card label="Neto" value={fmt(totals.net)} />
        <Card label="Movimientos" value={totals.txCount} />
        <Card
          label="Mayor gasto"
          value={fmt(maxExpense.amount)}
          valueClass="text-red-600 dark:text-red-400"
          sub={maxExpense.merchant}
        />
        <Card
          label="Mayor ingreso"
          value={fmt(maxCredit.amount)}
          valueClass="text-emerald-600 dark:text-emerald-400"
          sub={maxCredit.merchant}
        />
        {usd && (
          <Card
            label="Gastos USD"
            value={fmt(usd.totals.debits, 'USD')}
            valueClass="text-red-600 dark:text-red-400"
            sub={`${usd.totals.txCount} movimientos`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Balance acumulado</h3>
          <div className="h-64">
            <Line data={balanceData} options={lineOptions} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gasto por categoría</h3>
          <div className="h-64">
            <Doughnut data={categoryData} options={categoryOptions} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Top comercios con mayor gasto
        </h3>
        <div className="h-72">
          <Bar data={merchantData} options={merchantOptions} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Descripción
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Moneda
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {transactions.map((t) => (
                <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-sm text-slate-600 tabular-nums dark:text-slate-400">{t.date}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{t.merchant}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t.category ?? '—'}</td>
                  <td className="px-4 py-3">
                    {t.currency === 'USD' ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        USD
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        ARS
                      </span>
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
    </div>
  )
}
