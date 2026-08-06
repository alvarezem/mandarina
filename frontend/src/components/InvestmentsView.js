import { useState } from 'react'
import InvestmentPlan from './InvestmentPlan'
import MarketQuotes from './MarketQuotes'

const TABS = [
  { key: 'plan', label: 'Plan de inversión' },
  { key: 'cotizaciones', label: 'Cotizaciones en vivo' },
]

export default function InvestmentsView({ session }) {
  const [tab, setTab] = useState('plan')

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div
        role="tablist"
        aria-label="Secciones de Inversiones"
        className="mb-4 inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:w-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
              tab === t.key
                ? 'bg-brand-600 text-white dark:bg-brand-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' ? <InvestmentPlan session={session} /> : <MarketQuotes session={session} />}
    </div>
  )
}
