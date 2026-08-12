import useCountUp from '../hooks/useCountUp'
import { fmt } from '../lib/format'

function CountUp({ value, format }) {
  const v = useCountUp(value, { duration: 1100 })
  return format(v)
}

function Card({ label, value, format, sub, valueClass = 'text-slate-900 dark:text-slate-100' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:shadow-black/30">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>
        {format ? <CountUp value={value} format={format} /> : value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-3 h-7 w-28 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

function cardsFromAnalysis(analysis) {
  return [
    {
      label: 'Débitos',
      value: analysis.totals.debits,
      format: fmt,
      valueClass: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Movimientos',
      value: analysis.totals.txCount,
      format: (n) => Math.round(n).toLocaleString('es-AR'),
    },
    ...(analysis.maxExpense
      ? [
          {
            label: 'Mayor gasto ARS',
            value: analysis.maxExpense.amount,
            format: fmt,
            valueClass: 'text-red-600 dark:text-red-400',
            sub: analysis.maxExpense.merchant,
          },
        ]
      : []),
    ...(analysis.usd?.maxExpense
      ? [
          {
            label: 'Mayor gasto USD',
            value: analysis.usd.maxExpense.amount,
            format: (n) => fmt(n, 'USD'),
            valueClass: 'text-red-600 dark:text-red-400',
            sub: analysis.usd.maxExpense.merchant,
          },
        ]
      : []),
    ...(analysis.usd
      ? [
          {
            label: 'Gastos USD',
            value: analysis.usd.totals.debits,
            format: (n) => fmt(n, 'USD'),
            valueClass: 'text-red-600 dark:text-red-400',
            sub: `${analysis.usd.totals.txCount} movimientos`,
          },
        ]
      : []),
  ]
}

export default function SummaryCards({ analysis, gridKey }) {
  if (!analysis) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" key={gridKey}>
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" key={gridKey}>
      {cardsFromAnalysis(analysis).map((c, i) => (
        <div key={c.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
          <Card {...c} />
        </div>
      ))}
    </div>
  )
}
