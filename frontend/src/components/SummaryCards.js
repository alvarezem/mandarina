import useCountUp from '../hooks/useCountUp'
import { fmt } from '../lib/format'
import { useLang } from './LangProvider'
import { t, tn } from '../lib/i18n'

function CountUp({ value, format }) {
  const v = useCountUp(value, { duration: 1100 })
  return format(v)
}

function Card({ label, value, format, sub, valueClass = 'text-slate-900 dark:text-slate-100' }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:shadow-black/30">
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

function cardsFromAnalysis(analysis, lang) {
  const movements = (count) =>
    tn(lang, 'cards.movements', count, {
      n: Math.round(count).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR'),
    })
  return [
    {
      label: t(lang, 'cards.debits'),
      value: analysis.totals.debits,
      format: fmt,
      valueClass: 'text-red-600 dark:text-red-400',
      sub: movements(analysis.totals.txCount),
    },
    {
      label: t(lang, 'cards.maxExpenseArs'),
      value: analysis.maxExpense ? analysis.maxExpense.amount : '—',
      format: analysis.maxExpense ? fmt : null,
      sub: analysis.maxExpense?.merchant,
      valueClass: 'text-red-600 dark:text-red-400',
    },
    {
      label: t(lang, 'cards.expensesUsd'),
      value: analysis.usd ? analysis.usd.totals.debits : 0,
      format: (n) => fmt(n, 'USD'),
      sub: analysis.usd ? movements(analysis.usd.totals.txCount) : undefined,
    },
    {
      label: t(lang, 'cards.maxExpenseUsd'),
      value: analysis.usd?.maxExpense ? analysis.usd.maxExpense.amount : '—',
      format: analysis.usd?.maxExpense ? (n) => fmt(n, 'USD') : null,
      sub: analysis.usd?.maxExpense?.merchant,
      valueClass: 'text-red-600 dark:text-red-400',
    },
  ]
}

function cardsFromIncome(analysis, lang) {
  const movements = (count) =>
    tn(lang, 'cards.movements', count, {
      n: Math.round(count).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR'),
    })
  return [
    {
      label: t(lang, 'cards.income'),
      value: analysis.totals.credits,
      format: fmt,
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      sub: movements(analysis.totals.txCount),
    },
    {
      label: t(lang, 'cards.maxIncomeArs'),
      value: analysis.maxIncome ? analysis.maxIncome.amount : '—',
      format: analysis.maxIncome ? fmt : null,
      sub: analysis.maxIncome?.merchant,
      valueClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t(lang, 'cards.incomeUsd'),
      value: analysis.usd ? analysis.usd.totals.credits : 0,
      format: (n) => fmt(n, 'USD'),
      sub: analysis.usd ? movements(analysis.usd.totals.txCount) : undefined,
    },
    {
      label: t(lang, 'cards.maxIncomeUsd'),
      value: analysis.usd?.maxIncome ? analysis.usd.maxIncome.amount : '—',
      format: analysis.usd?.maxIncome ? (n) => fmt(n, 'USD') : null,
      sub: analysis.usd?.maxIncome?.merchant,
      valueClass: 'text-emerald-600 dark:text-emerald-400',
    },
  ]
}

export default function SummaryCards({ analysis, gridKey, variant = 'egresos', compact = false }) {
  const { lang } = useLang()
  const gridClass = compact
    ? 'grid grid-cols-2 gap-3'
    : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'

  if (!analysis) {
    return (
      <div className={gridClass} key={gridKey} data-testid="summary-cards">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  const cards =
    variant === 'ingresos' ? cardsFromIncome(analysis, lang) : cardsFromAnalysis(analysis, lang)
  // En inglés el énfasis va a los dólares: las cards USD primero (sin conversión).
  const orderedCards = lang === 'en' ? [cards[2], cards[3], cards[0], cards[1]] : cards

  return (
    <div className={gridClass} key={gridKey} data-testid="summary-cards">
      {orderedCards.map((card, i) => (
        <Card key={`${card.label}-${i}`} {...card} />
      ))}
    </div>
  )
}
