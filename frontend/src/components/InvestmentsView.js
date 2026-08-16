import { useState } from 'react'
import InvestmentPlan from './InvestmentPlan'
import MarketQuotes from './MarketQuotes'
import MarketClosedNotice from './MarketClosedNotice'
import Watchlist from './Watchlist'
import LedgerView from './LedgerView'
import { loadPlanSort, savePlanSort, SORT_DEFAULT_DIR } from '../lib/planSort'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

const TABS = ['plan', 'quotes', 'ops']

export default function InvestmentsView({ session }) {
  const { lang } = useLang()
  const [tab, setTab] = useState('plan')
  const [display, setDisplay] = useState(lang === 'en' ? 'USD' : 'ARS')
  const [rateMode, setRateMode] = useState('CCL')
  const [sort, setSort] = useState(() => loadPlanSort(session?.user?.id))
  const [marketClosed, setMarketClosed] = useState(false)
  const [noticeDismissed, setNoticeDismissed] = useState(false)

  // Ajuste en render (patrón de React): al cambiar el idioma, el default de
  // moneda sigue al idioma (EN → USD, ES → ARS) sin setState en effects.
  const [prevLang, setPrevLang] = useState(lang)
  if (lang !== prevLang) {
    setPrevLang(lang)
    setDisplay(lang === 'en' ? 'USD' : 'ARS')
  }

  const onSort = (key) =>
    setSort((s) => {
      const next =
        s.key === key
          ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: SORT_DEFAULT_DIR[key] ?? 'desc' }
      savePlanSort(session?.user?.id, next)
      return next
    })

  const shared = {
    display,
    setDisplay,
    rateMode,
    setRateMode,
    sort,
    onSort,
    onMarketClosed: setMarketClosed,
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      {marketClosed && !noticeDismissed && (
        <MarketClosedNotice onClose={() => setNoticeDismissed(true)} />
      )}

      <div
        role="tablist"
        aria-label={t(lang, 'inv.aria.tabs')}
        className="mb-4 inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:w-auto"
      >
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
              tab === tabKey
                ? 'bg-brand-600 text-white dark:bg-brand-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t(lang, `inv.tab.${tabKey}`)}
          </button>
        ))}
      </div>

      {tab === 'plan' ? (
        <InvestmentPlan session={session} {...shared} />
      ) : tab === 'ops' ? (
        <LedgerView session={session} {...shared} />
      ) : (
        <>
          <MarketQuotes session={session} {...shared} />
          <Watchlist session={session} display={display} rateMode={rateMode} />
        </>
      )}
    </div>
  )
}
