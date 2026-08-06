import { useEffect, useMemo, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import supabase from '../lib/supabaseClient'
import { buildPlan, portfolioChangePct } from '../lib/plan'
import { useToast } from './Toast'

const ASSET_TYPES = {
  accion: 'Acción',
  cedear: 'CEDEAR',
  bono: 'Bono',
  dolar: 'Dólar',
  fci: 'FCI',
  efectivo: 'Efectivo',
  otro: 'Otro',
}

const RATE_LABELS = {
  CCL: 'CCL (contado con liqui)',
  MEP: 'MEP (dólar bolsa)',
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

export default function MarketQuotes({ session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [display, setDisplay] = useState('ARS')
  const [rateMode, setRateMode] = useState('CCL')
  const [error, setError] = useState(null)
  const pushToast = useToast()

  const loadPlan = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_plan')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) {
      setError(error.message)
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
    if (symbols.length === 0) return
    let cancelled = false
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (cancelled || !data) return
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey])

  const rate = rates[rateMode]?.price || null

  const resolvePrice = (item) => {
    if (item.symbol === 'MEP') return rates.MEP?.price ?? item.manual_price ?? null
    if (item.symbol === 'CCL') return rates.CCL?.price ?? item.manual_price ?? null
    return quotes[item.symbol]?.price ?? item.manual_price ?? null
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

  const refreshQuotes = () => {
    const symbols = items.map((i) => i.symbol).filter(Boolean)
    if (symbols.length === 0) return
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (!data) return
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        pushToast({ type: 'success', message: 'Precios actualizados' })
      })
      .catch(() => pushToast({ type: 'error', message: 'No se pudieron actualizar los precios' }))
  }

  const doughnutData = useMemo(
    () => ({
      labels: builtItems.map((i) => i.symbol),
      datasets: [
        {
          data: builtItems.map((i) => Math.max(0, i.value)),
          backgroundColor: builtItems.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [builtItems],
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
            Actualizá las cotizaciones o cargá precios manuales desde el plan.
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
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      · {pricedCount} de {builtItems.length} activos con precio
                    </span>
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
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Dólar
                  <select
                    value={rateMode}
                    onChange={(e) => setRateMode(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="CCL">{RATE_LABELS.CCL}</option>
                    <option value="MEP">{RATE_LABELS.MEP}</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {['MEP', 'CCL'].map((mode) => (
                <div
                  key={mode}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {mode === 'MEP' ? 'Dólar MEP' : 'Dólar CCL'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {rates[mode]?.price != null ? fmt(rates[mode].price, 'ARS') : '—'}
                  </p>
                  {rates[mode]?.compra != null && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      compra {fmt(rates[mode].compra, 'ARS')}
                    </p>
                  )}
                </div>
              ))}
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
              <div className="mt-3 flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
                {builtItems.map((item, i) => (
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
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                      <th className="px-4 py-3 font-semibold">Activo</th>
                      <th className="hidden px-3 py-3 text-right font-semibold sm:table-cell">Precio</th>
                      <th className="hidden px-3 py-3 text-right font-semibold sm:table-cell">Variación</th>
                      <th className="hidden px-3 py-3 text-right font-semibold md:table-cell">Cantidad</th>
                      <th className="px-3 py-3 text-right font-semibold">Valor</th>
                      <th className="px-3 py-3 text-right font-semibold">% cartera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {builtItems.map((item) => {
                      const changePct = quotes[item.symbol]?.changePct ?? null
                      return (
                        <tr key={item.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{item.symbol}</span>
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {ASSET_TYPES[item.asset_type] ?? item.asset_type}
                              </span>
                            </div>
                            {item.name && item.name !== item.symbol && (
                              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{item.name}</p>
                            )}
                            <div className="mt-1.5 h-1 w-full max-w-24 rounded bg-slate-200 dark:bg-slate-700">
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
