import { Fragment, useEffect, useMemo, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import supabase from '../lib/supabaseClient'
import { buildPlan, portfolioChangePct } from '../lib/plan'
import { normalizeHistory } from '../lib/history'
import { useToast } from './Toast'
import SortableTh from './SortableTh'
import PriceChart from './PriceChart'
import { DEFAULT_PLAN_SORT, SORT_DEFAULT_DIR } from '../lib/planSort'

const ASSET_TYPES = {
  accion: 'Acción',
  cedear: 'CEDEAR',
  bono: 'Bono',
  dolar: 'Dólar',
  fci: 'FCI',
  efectivo: 'Efectivo',
  otro: 'Otro',
}

const PALETTE = [
  '#f97316',
  '#fdba74',
  '#ea580c',
  '#fbbf24',
  '#f59e0b',
  '#fb923c',
  '#fd7e14',
  '#f4791f',
  '#ef6c00',
  '#ff9800',
  '#ffb74d',
  '#ff8f00',
]

const fmt = (n, currency = 'ARS') =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(n || 0)

const fmtPct = (n) =>
  `${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

const QUOTE_SORT_KEYS = new Set(['symbol', 'price', 'changePct', 'quantity', 'value', 'actualPct'])

export default function MarketQuotes({
  session,
  display = 'ARS',
  setDisplay = () => {},
  rateMode = 'CCL',
  sort: sortProp,
  onSort: onSortProp,
  onMarketClosed = () => {},
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [localSort, setLocalSort] = useState(DEFAULT_PLAN_SORT)
  const sort = sortProp ?? localSort
  const onSort =
    onSortProp ??
    ((key) =>
      setLocalSort((s) =>
        s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_DEFAULT_DIR[key] ?? 'desc' },
      ))
  const [error, setError] = useState(null)
  const [chart, setChart] = useState(null)
  const [modal, setModal] = useState(null)
  const [chartData, setChartData] = useState({ loading: false, points: [], error: null })
  const pushToast = useToast()

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

  useEffect(() => {
    if (!activeChartKey) {
      setChartData({ loading: false, points: [], error: null })
      return
    }
    const [symbol, range] = activeChartKey.split(':')
    let cancelled = false
    setChartData({ loading: true, points: [], error: null })
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

  const loadPlan = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_plan')
      .select('*')
      .eq('user_id', session?.user?.id)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('MarketQuotes: error al cargar el plan', error)
      setError('No se pudo cargar el plan de inversión')
    } else {
      setItems(data || [])
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPlan()
  }, [])

  const symbolsKey = useMemo(
    () => items.map((i) => i.symbol).filter(Boolean).sort().join('|'),
    [items],
  )

  useEffect(() => {
    const symbols = items.map((i) => i.symbol).filter(Boolean)
    let cancelled = false
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (cancelled || !data) return
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey])

  const rate = rates[rateMode]?.price || null

  const resolvePrice = (item) => {
    if (item.symbol === 'MEP') return rates.MEP?.price ?? null
    if (item.symbol === 'CCL') return rates.CCL?.price ?? null
    return quotes[item.symbol]?.price ?? null
  }

  const builtItems = useMemo(() => {
    const scaled = items.map((item) => {
      const price = resolvePrice(item)
      const scaledPrice =
        price != null && item.currency !== display && rate
          ? display === 'ARS'
            ? price * rate
            : price / rate
          : price
      return { ...item, price: scaledPrice }
    })
    return buildPlan(scaled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, quotes, rates, display, rateMode])

  const total = builtItems.reduce((sum, item) => sum + item.value, 0)

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

  const chartScale = display === 'USD' && rate ? 1 / rate : 1

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
    const { key, dir } = QUOTE_SORT_KEYS.has(sort.key) ? sort : DEFAULT_PLAN_SORT
    const arr = [...withChange]
    const cmpStr = (x, y) => String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' })
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

  const refreshQuotes = () => {
    const symbols = items.map((i) => i.symbol).filter(Boolean)
    if (symbols.length === 0) return
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (!data) return
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
        pushToast({ type: 'success', message: 'Precios actualizados' })
      })
      .catch(() => pushToast({ type: 'error', message: 'No se pudieron actualizar los precios' }))
  }

  const doughnutData = useMemo(
    () => ({
      labels: sortedItems.map((i) => i.symbol),
      datasets: [
        {
          data: sortedItems.map((i) => Math.max(0, i.value)),
          backgroundColor: sortedItems.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [sortedItems],
  )

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${fmt(ctx.raw, display)} (${fmtPct(
                total > 0 ? (ctx.raw / total) * 100 : 0,
              )})`,
          },
        },
      },
    }),
    [display, total],
  )

  const hasQuotes = pricedCount > 0

  return (
    <div className="animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Cotizaciones en vivo</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Resumen de tus inversiones · precios BYMA (~20 min de demora)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshQuotes}
            title="Actualizar precios"
            aria-label="Actualizar precios"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-200/60 active:scale-[0.98] dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
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
            Todavía no cargaste tu plan.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Andá a la pestaña «Plan de inversión» e importá tu Excel (Ticker | % Meta | Tenencia).
          </p>
        </div>
      ) : !hasQuotes ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aún no hay precios disponibles.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Actualizá las cotizaciones.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Patrimonio total</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {fmt(total, display)}
                </p>
                {dayChange != null && (
                  <p
                    className={`mt-1 text-sm font-medium ${
                      dayChange >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {dayChange >= 0 ? '▲' : '▼'} {Math.abs(dayChange).toFixed(2)}% hoy
                    {pricedCount < builtItems.length && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        · {pricedCount} de {builtItems.length} activos con precio
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
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Asignación
              </h2>
              <div className="relative h-44">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                Mismo orden que tu plan · se cambia desde Plan de inversión
              </p>
              <div className="mt-2 flex flex-col gap-1 pr-1">
                {sortedItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="truncate font-medium">{item.symbol}</span>
                    </span>
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">
                      {fmtPct(item.actualPct)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <SortableTh label="Activo" sortKey="symbol" sort={sort} onSort={onSort} />
                      <SortableTh label="Precio" sortKey="price" sort={sort} onSort={onSort} align="right" className="hidden sm:table-cell" />
                      <SortableTh label="Var. diaria" sortKey="changePct" sort={sort} onSort={onSort} align="right" className="hidden sm:table-cell" />
                      <SortableTh label="Cantidad" sortKey="quantity" sort={sort} onSort={onSort} align="right" className="hidden md:table-cell" />
                      <SortableTh label="Valor" sortKey="value" sort={sort} onSort={onSort} align="right" />
                      <SortableTh label="% cartera" sortKey="actualPct" sort={sort} onSort={onSort} align="right" />
                      <th className="px-3 py-2 text-right">
                        <span className="sr-only">Ver gráfico</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedItems.map((item) => {
                      const changePct = quotes[item.symbol]?.changePct ?? null
                      const open = chart?.symbol === item.symbol
                      return (
                        <Fragment key={item.id}>
                          <tr className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => openInline(item.symbol)}
                                aria-expanded={open}
                                title="Ver gráfico del precio"
                                className="flex w-full items-center gap-2 text-left"
                              >
                                <svg
                                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{item.symbol}</span>
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {ASSET_TYPES[item.asset_type] ?? item.asset_type}
                                </span>
                              </button>
                              {item.name && item.name !== item.symbol && (
                                <p className="truncate pl-5 text-xs text-slate-400 dark:text-slate-500">{item.name}</p>
                              )}
                              <div className="ml-5 mt-1.5 h-1 w-full max-w-24 rounded bg-slate-200 dark:bg-slate-700">
                                <div
                                  className="h-1 rounded bg-brand-500"
                                  style={{ width: `${Math.min(100, item.actualPct)}%` }}
                                />
                              </div>
                            </td>
                            <td className="hidden px-3 py-3 text-right sm:table-cell">
                              {item.price != null ? (
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {fmt(item.price, display)}
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                  sin precio
                                </span>
                              )}
                            </td>
                            <td className="hidden px-3 py-3 text-right sm:table-cell">
                              {changePct != null ? (
                                <span
                                  className={`font-medium ${
                                    changePct >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>
                            <td className="hidden px-3 py-3 text-right text-slate-600 dark:text-slate-300 md:table-cell">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                              {item.price != null ? fmt(item.value, display) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                              {fmtPct(item.actualPct)}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openModal(item.symbol)}
                                title="Ver gráfico en otra ventana"
                                aria-label={`Abrir gráfico de ${item.symbol}`}
                                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t-0">
                              <td colSpan={7} className="border-t border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40">
                                <PriceChart
                                  symbol={item.symbol}
                                  range={chart.range}
                                  points={chartPoints}
                                  loading={chartData.loading}
                                  error={chartData.error}
                                  onRange={(r) => setChartRange(r, 'inline')}
                                  compact
                                  quote={chartQuote}
                                  display={display}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Gráfico de ${modal.symbol}`}
            className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Precio · {modal.symbol}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Cerrar gráfico"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PriceChart
              symbol={modal.symbol}
              range={modal.range}
              points={chartPoints}
              loading={chartData.loading}
              error={chartData.error}
              onRange={(r) => setChartRange(r, 'modal')}
              quote={chartQuote}
              display={display}
            />
          </div>
        </div>
      )}
    </div>
  )
}
