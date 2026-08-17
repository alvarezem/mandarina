import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { portfolioChangePct } from '../lib/plan'
import { normalizeHistory } from '../lib/history'
import { fmt } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import QuotesTable from './QuotesTable'
import QuoteModal from './QuoteModal'
import QuotesErrorNotice from './QuotesErrorNotice'
import { usePortfolioQuotes } from '../hooks/usePortfolioQuotes'
import { DEFAULT_PLAN_SORT, SORT_DEFAULT_DIR, SORT_KEYS } from '../lib/planSort'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

export default function MarketQuotes({
  session,
  display = 'ARS',
  setDisplay = () => {},
  rateMode = 'CCL',
  sort: sortProp,
  onSort: onSortProp,
  onMarketClosed = () => {},
}) {
  const { lang } = useLang()
  const [localSort, setLocalSort] = useState(DEFAULT_PLAN_SORT)
  const sort = sortProp ?? localSort
  const onSort =
    onSortProp ??
    ((key) =>
      setLocalSort((s) =>
        s.key === key
          ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: SORT_DEFAULT_DIR[key] ?? 'desc' },
      ))
  const [chart, setChart] = useState(null)
  const [modal, setModal] = useState(null)
  const [chartData, setChartData] = useState({ loading: false, points: [], error: null })

  const activeChart = modal ?? chart
  const activeChartKey = activeChart ? `${activeChart.symbol}:${activeChart.range}` : null

  const openInline = (symbol) => {
    setModal(null)
    setChart((c) => (c?.symbol === symbol ? null : { symbol, range: c?.range ?? '3M' }))
  }

  const openModal = (symbol) => {
    setChart(null)
    setModal((m) => (m?.symbol === symbol ? null : { symbol, range: m?.range ?? '3M' }))
  }

  const setChartRange = (range, kind) => {
    const updater = (c) => (c ? { ...c, range } : c)
    if (kind === 'modal') setModal(updater)
    else setChart(updater)
  }

  // Ajuste en render (patrón de React): resetea chartData al cerrar el gráfico
  // y marca loading al abrirlo, sin setState síncrono en el effect.
  const [prevChartKey, setPrevChartKey] = useState(null)
  if (activeChartKey !== prevChartKey) {
    setPrevChartKey(activeChartKey)
    setChartData(
      activeChartKey
        ? { loading: true, points: [], error: null }
        : { loading: false, points: [], error: null },
    )
  }

  useEffect(() => {
    if (!activeChartKey) return
    const [symbol, range] = activeChartKey.split(':')
    let cancelled = false
    supabase.functions
      .invoke('quotes', {
        body: { history: { symbol, range } },
      })
      .then(({ data }) => {
        if (cancelled) return
        setChartData({ loading: false, points: normalizeHistory(data?.history), error: null })
      })
      .catch(() => {
        if (!cancelled) setChartData({ loading: false, points: [], error: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [activeChartKey])

  useEffect(() => {
    if (!modal) return
    const onKey = (e) => {
      if (e.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  const {
    data: planData,
    loading,
    error,
  } = useAsync(async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_plan')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('sort_order', { ascending: true })
      if (error) {
        console.error('MarketQuotes: error al cargar el plan', error)
        throw new Error(t(lang, 'inv.plan.err.load'))
      }
      return data || []
    } catch (e) {
      console.error('MarketQuotes: error al cargar el plan', e)
      throw new Error(t(lang, 'inv.plan.err.load'))
    }
  }, [session?.user?.id])
  const items = planData ?? []

  const { quotes, rates, rate, builtItems, totalCurrency, refreshQuotes, quotesError } =
    usePortfolioQuotes({
      items,
      display,
      rateMode,
      onMarketClosed,
    })

  const total = builtItems.reduce((sum, item) => sum + item.value, 0)

  // El histórico de BYMA es nativo de la moneda listada (ARS típicamente) y solo
  // se convierte a USD con rate; sin rate se muestra en su moneda real.
  const chartDisplay = display === 'USD' && rate ? 'USD' : 'ARS'
  const chartScale = chartDisplay === 'USD' ? 1 / rate : 1

  const withChange = useMemo(
    () =>
      builtItems.map((item) => ({
        ...item,
        changePct: quotes[item.symbol]?.changePct ?? null,
      })),
    [builtItems, quotes],
  )

  const dayChange = useMemo(() => portfolioChangePct(withChange), [withChange])

  const pricedCount = withChange.filter((item) => item.price != null).length

  const chartPoints = useMemo(() => {
    if (chartScale === 1) return chartData.points
    return chartData.points.map((p) => ({
      ...p,
      o: p.o != null ? p.o * chartScale : null,
      h: p.h != null ? p.h * chartScale : null,
      l: p.l != null ? p.l * chartScale : null,
      c: p.c != null ? p.c * chartScale : null,
    }))
  }, [chartData.points, chartScale])

  const chartQuote = useMemo(() => {
    if (!activeChart) return null
    const q = quotes[activeChart.symbol]
    if (!q) return null
    if (chartScale === 1) return q
    return {
      ...q,
      price: q.price != null ? q.price * chartScale : null,
      open: q.open != null ? q.open * chartScale : null,
      high: q.high != null ? q.high * chartScale : null,
      low: q.low != null ? q.low * chartScale : null,
      prevClose: q.prevClose != null ? q.prevClose * chartScale : null,
    }
  }, [activeChart, quotes, chartScale])

  const sortedItems = useMemo(() => {
    if (!sort.key) return withChange
    const { key, dir } = SORT_KEYS.has(sort.key) ? sort : DEFAULT_PLAN_SORT
    const arr = [...withChange]
    const cmpStr = (x, y) =>
      String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' })
    arr.sort((a, b) => {
      let cmp = 0
      if (key === 'symbol') {
        cmp = cmpStr(a.symbol, b.symbol) || cmpStr(a.name, b.name)
      } else {
        const av = a[key]
        const bv = b[key]
        if (av == null && bv == null) cmp = 0
        else if (av == null) cmp = 1
        else if (bv == null) cmp = -1
        else cmp = av - bv
      }
      return dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [withChange, sort])

  const hasQuotes = pricedCount > 0

  return (
    <div className="animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'inv.tab.quotes')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'inv.quotes.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quotesError && <QuotesErrorNotice />}
          <button
            type="button"
            onClick={refreshQuotes}
            title={t(lang, 'inv.refresh')}
            aria-label={t(lang, 'inv.refresh')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-200/60 active:scale-[0.98] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t(lang, 'inv.plan.empty.title')}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'inv.quotes.empty.hint')}
          </p>
        </div>
      ) : !hasQuotes ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t(lang, 'inv.quotes.noPrices.title')}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'inv.quotes.noPrices.hint')}
          </p>
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t(lang, 'inv.quotes.total')}
                </p>
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {totalCurrency != null ? fmt(total, totalCurrency) : '—'}
                </p>
                {dayChange != null && (
                  <p
                    className={`mt-1 text-sm font-medium ${
                      dayChange >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {dayChange >= 0 ? '▲' : '▼'} {Math.abs(dayChange).toFixed(2)}%{' '}
                    {t(lang, 'inv.quotes.today')}
                    {pricedCount < builtItems.length && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        {t(lang, 'inv.quotes.coverage', {
                          priced: pricedCount,
                          total: builtItems.length,
                        })}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  {['ARS', 'USD'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDisplay(c)}
                      className={`px-3 py-1.5 text-sm font-medium transition ${
                        display === c
                          ? 'bg-brand-600 text-white dark:bg-brand-500'
                          : 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  MEP {rates.MEP?.price != null ? fmt(rates.MEP.price, 'ARS') : '—'} · CCL{' '}
                  {rates.CCL?.price != null ? fmt(rates.CCL.price, 'ARS') : '—'}
                  {display === 'USD' && !rate && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      · {t(lang, 'inv.quotes.noRate')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>

          <QuotesTable
            items={sortedItems}
            sort={sort}
            onSort={onSort}
            quotes={quotes}
            display={chartDisplay}
            chart={chart}
            onOpenInline={openInline}
            onOpenModal={openModal}
            onRangeChange={setChartRange}
            chartPoints={chartPoints}
            chartData={chartData}
            chartQuote={chartQuote}
          />
        </>
      )}

      {modal && (
        <QuoteModal
          modal={modal}
          chartQuote={chartQuote}
          chartPoints={chartPoints}
          chartData={chartData}
          display={chartDisplay}
          onRange={setChartRange}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
