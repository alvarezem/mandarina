import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { RANGES, formatPointDate } from '../lib/history'
import { fmt } from '../lib/format'
import { BRAND_HEX } from '../lib/constants'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export default function PriceChart({
  symbol,
  range,
  points,
  loading,
  error,
  onRange,
  compact = false,
  quote = null,
  display = 'ARS',
}) {
  const data = {
    labels: points.map((p) => formatPointDate(p.t, range)),
    datasets: [
      {
        label: symbol,
        data: points.map((p) => p.c),
        borderColor: BRAND_HEX,
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const i = items[0]?.dataIndex
            const p = points[i]
            return p ? new Date(p.t).toLocaleDateString('es-AR') : ''
          },
          label: (item) => `Cierre: ${fmt(item.parsed.y, display)}`,
        },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: compact ? 6 : 10, font: { size: 10 } }, grid: { display: false } },
      y: { position: 'right', ticks: { maxTicksLimit: 5, font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.15)' } },
    },
  }

  const changeColor =
    quote?.changePct != null
      ? quote.changePct >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400'
      : ''

  return (
    <div className="flex flex-col gap-2">
      {quote && (
        <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-base font-bold text-slate-900 dark:text-slate-50">
              {fmt(quote.price, display)}
            </span>
            {quote.changePct != null && (
              <span className={`text-xs font-semibold ${changeColor}`}>
                {quote.changePct >= 0 ? '▲' : '▼'}
                {Math.abs(quote.changePct).toFixed(2)}%
              </span>
            )}
            {quote.tradeHour && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">hoy {quote.tradeHour}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Apr <b className="font-semibold text-slate-700 dark:text-slate-300">{fmt(quote.open, display)}</b>
            </span>
            <span>
              Cierre prev{' '}
              <b className="font-semibold text-slate-700 dark:text-slate-300">{fmt(quote.prevClose, display)}</b>
            </span>
            <span>
              Máx <b className="font-semibold text-slate-700 dark:text-slate-300">{fmt(quote.high, display)}</b>
            </span>
            <span>
              Mín <b className="font-semibold text-slate-700 dark:text-slate-300">{fmt(quote.low, display)}</b>
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {symbol}
        </span>
        <div
          role="group"
          aria-label="Rango del gráfico"
          className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800/70"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRange?.(r.key)}
              aria-pressed={range === r.key}
              className={`px-2.5 py-1 text-xs font-medium transition ${
                range === r.key
                  ? 'bg-brand-600 text-white dark:bg-brand-500'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={`flex items-center justify-center text-sm text-slate-400 ${compact ? 'h-32' : 'h-72'}`}>
          Cargando histórico…
        </div>
      ) : error ? (
        <div className={`flex items-center justify-center text-sm text-red-500 ${compact ? 'h-32' : 'h-72'}`}>
          No se pudo cargar el histórico.
        </div>
      ) : points.length === 0 ? (
        <div className={`flex items-center justify-center text-sm text-slate-400 ${compact ? 'h-32' : 'h-72'}`}>
          Sin datos históricos para {symbol}.
        </div>
      ) : (
        <div className={`relative ${compact ? 'h-40' : 'h-80'}`}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  )
}
