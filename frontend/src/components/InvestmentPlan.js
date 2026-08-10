import { useEffect, useMemo, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { buildPlan, distribute } from '../lib/plan'
import { fmt, fmtPct } from '../lib/format'
import { ASSET_TYPES } from '../lib/constants'
import { useToast } from './Toast'
import SortableTh from './SortableTh'
import { DEFAULT_PLAN_SORT, SORT_DEFAULT_DIR, SORT_KEYS } from '../lib/planSort'

const RATE_LABELS = {
  CCL: 'CCL (contado con liqui)',
  MEP: 'MEP (dólar bolsa)',
}

const RATE_INFO =
  'CCL (contado con liquidación): el dólar que obtenés operando CEDEARs o acciones que liquidan en dólares. MEP (dólar bolsa): el dólar de comprar bonos en BYMA. Elegí el que uses al comprar.'

const newDraft = () => ({
  symbol: '',
  name: '',
  asset_type: 'otro',
  currency: 'ARS',
  target_weight: '',
  quantity: '',
})

const STRATEGY_OPTIONS = [
  { key: 'faltante', label: 'Mayor faltante ($)' },
  { key: 'gap', label: 'Mayor faltante (%)' },
  { key: 'billetera', label: 'Mayor % de cartera' },
  { key: 'peso', label: 'Mayor peso objetivo' },
  { key: 'barato', label: 'Más barato' },
  { key: 'caro', label: 'Más caro' },
]

export default function InvestmentPlan({
  session,
  display = 'ARS',
  setDisplay = () => {},
  rateMode = 'CCL',
  setRateMode = () => {},
  sort: sortProp,
  onSort: onSortProp,
  onMarketClosed = () => {},
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [budget, setBudget] = useState('')
  const [strategy, setStrategy] = useState('faltante')
  const [localSort, setLocalSort] = useState(DEFAULT_PLAN_SORT)
  const sort = sortProp ?? localSort
  const onSort =
    onSortProp ??
    ((key) =>
      setLocalSort((s) =>
        s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_DEFAULT_DIR[key] ?? 'desc' },
      ))
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(newDraft())
  const [error, setError] = useState(null)
  const [showRateInfo, setShowRateInfo] = useState(false)
  const [importing, setImporting] = useState(false)
  const inputRef = useRef(null)
  const pushToast = useToast()

  const loadPlan = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_plan')
      .select('*')
      .eq('user_id', session?.user?.id)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('InvestmentPlan: error al cargar el plan', error)
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

  const sortedItems = useMemo(() => {
    if (!sort.key) return builtItems
    const { key, dir } = SORT_KEYS.has(sort.key) ? sort : DEFAULT_PLAN_SORT
    const arr = [...builtItems]
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
  }, [builtItems, sort])

  const dist = useMemo(
    () => distribute(Number(budget) || 0, builtItems, strategy),
    [budget, builtItems, strategy],
  )

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

  const handleImport = (file) => {
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const file_base64 = String(reader.result).split(',')[1]
      try {
        const { data, error } = await supabase.functions.invoke('import-plan', {
          body: { file_base64 },
        })
        if (error) throw new Error('No se pudo importar el plan')
        if (data?.error) throw new Error(data.error)
        pushToast({ type: 'success', message: `Plan importado (${data.count} activos)` })
        await loadPlan()
      } catch (e) {
        console.error('InvestmentPlan: error al importar el plan', e)
        pushToast({ type: 'error', message: e.message || 'No se pudo importar el plan' })
      } finally {
        setImporting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setDraft({
      symbol: item.symbol ?? '',
      name: item.name ?? '',
      asset_type: item.asset_type ?? 'otro',
      currency: item.currency ?? 'ARS',
      target_weight: String(item.target_weight ?? ''),
      quantity: String(item.quantity ?? ''),
    })
  }

  const startNew = () => {
    setEditingId('__new__')
    setDraft(newDraft())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(newDraft())
  }

  const saveEdit = async () => {
    const symbol = draft.symbol.trim().toUpperCase().replace(/\s+/g, '')
    if (!symbol) {
      pushToast({ type: 'error', message: 'El ticker es obligatorio' })
      return
    }
    const target = Math.min(100, Math.max(0, Number(draft.target_weight) || 0))
    const quantity = Math.max(0, Number(draft.quantity) || 0)
    const payload = {
      symbol,
      name: draft.name.trim() || symbol,
      asset_type: draft.asset_type,
      currency: draft.currency,
      target_weight: target,
      quantity,
    }

    if (editingId === '__new__') {
      const { error } = await supabase.from('portfolio_plan').insert({
        user_id: session.user.id,
        ...payload,
        sort_order: items.length,
      })
      if (error) {
        console.error('InvestmentPlan: error al crear activo', error)
        pushToast({ type: 'error', message: 'No se pudo agregar el activo' })
        return
      }
    } else {
      const { error } = await supabase.from('portfolio_plan').update(payload).eq('id', editingId)
      if (error) {
        console.error('InvestmentPlan: error al actualizar activo', error)
        pushToast({ type: 'error', message: 'No se pudo actualizar el activo' })
        return
      }
    }

    cancelEdit()
    await loadPlan()
  }

  const removeItem = async (item) => {
    const { error } = await supabase.from('portfolio_plan').delete().eq('id', item.id)
    if (error) {
      console.error('InvestmentPlan: error al eliminar activo', error)
      pushToast({ type: 'error', message: 'No se pudo eliminar el activo' })
      return
    }
    await loadPlan()
  }

  const applyBuy = async (step) => {
    const current = items.find((i) => i.symbol === step.symbol)
    if (!current) return
    const newQuantity = (Number(current.quantity) || 0) + step.qty
    const { error } = await supabase
      .from('portfolio_plan')
      .update({ quantity: newQuantity })
      .eq('id', current.id)
    if (error) {
      console.error('InvestmentPlan: error al aplicar compra', error)
      pushToast({ type: 'error', message: 'No se pudo registrar la compra' })
      return
    }
    setBudget(String(Math.max(0, (Number(budget) || 0) - step.amount)))
    pushToast({ type: 'success', message: `${step.symbol}: compraste ≈${step.qty} (${fmt(step.amount, display)})` })
    await loadPlan()
  }

  const progressWidth = (item) =>
    item.target_weight > 0 ? Math.min(100, (item.actualPct / item.target_weight) * 100) : 0

  const editFields = [
    { key: 'symbol', label: 'Ticker', type: 'text' },
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'target_weight', label: 'Meta %', type: 'number' },
    { key: 'quantity', label: 'Cantidad', type: 'number' },
  ]

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Plan de inversión</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Meta vs actual, en vivo</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Orden: % Meta mayor→menor · cambiá con los encabezados de la tabla (se recuerda)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 active:scale-[0.98] disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {importing ? 'Importando…' : 'Importar XLSX'}
          </button>
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-500 dark:hover:bg-brand-400"
          >
            + Agregar activo
          </button>
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
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            handleImport(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center gap-3">
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
            Dólar para convertir
            <select
              value={rateMode}
              onChange={(e) => setRateMode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="CCL">{RATE_LABELS.CCL}</option>
              <option value="MEP">{RATE_LABELS.MEP}</option>
            </select>
            <button
              type="button"
              onClick={() => setShowRateInfo((s) => !s)}
              aria-label="Qué diferencia hay entre CCL y MEP"
              title="Qué diferencia hay entre CCL y MEP"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </button>
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            MEP {rates.MEP?.price != null ? fmt(rates.MEP.price, 'ARS') : '—'} · CCL{' '}
            {rates.CCL?.price != null ? fmt(rates.CCL.price, 'ARS') : '—'}
          </p>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">Total cartera</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {rate == null && (display === 'USD' || items.some((i) => i.currency !== display))
                ? '—'
                : fmt(total, display)}
            </p>
          </div>
        </div>
        {showRateInfo && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            {RATE_INFO}
          </p>
        )}
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
      ) : items.length === 0 && editingId !== '__new__' ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Todavía no cargaste tu plan.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Importá tu Excel (Ticker | % Meta | Tenencia) o agregá activos a mano.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <SortableTh label="Activo" sortKey="symbol" sort={sort} onSort={onSort} />
                  <SortableTh label="Precio" sortKey="price" sort={sort} onSort={onSort} align="right" className="hidden sm:table-cell" />
                  <SortableTh label="Meta" sortKey="target_weight" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="Actual" sortKey="actualPct" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="Gap" sortKey="gap" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="Cantidad" sortKey="quantity" sort={sort} onSort={onSort} align="right" className="hidden sm:table-cell" />
                  <SortableTh label="Valor" sortKey="value" sort={sort} onSort={onSort} align="right" />
                  <SortableTh label="A comprar" sortKey="buy" sort={sort} onSort={onSort} align="right" />
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedItems.map((item) =>
                  editingId === item.id ? (
                    <tr key={item.id} className="bg-brand-50/50 dark:bg-brand-950/20">
                      <td colSpan={9} className="px-4 py-3">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            saveEdit()
                          }}
                          className="flex flex-wrap items-end gap-2"
                        >
                          {editFields.map((f) => (
                            <label key={f.key} className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                              {f.label}
                              <input
                                type={f.type}
                                value={draft[f.key]}
                                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                                min={f.type === 'number' ? 0 : undefined}
                                step={f.key === 'target_weight' ? '0.5' : undefined}
                                aria-label={f.label}
                                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              />
                            </label>
                          ))}
                          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                            Tipo
                            <select
                              value={draft.asset_type}
                              onChange={(e) => setDraft((d) => ({ ...d, asset_type: e.target.value }))}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {Object.entries(ASSET_TYPES).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                            Moneda
                            <select
                              value={draft.currency}
                              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              <option value="ARS">ARS</option>
                              <option value="USD">USD</option>
                            </select>
                          </label>
                          <div className="ml-auto flex gap-1.5">
                            <button
                              type="submit"
                              aria-label="Guardar activo"
                              className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              aria-label="Cancelar"
                              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
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
                        <div className="mt-1.5 h-1 w-full rounded bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-1 rounded bg-brand-500"
                            style={{ width: `${progressWidth(item)}%` }}
                          />
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        {item.price != null ? (
                          <span>
                            {fmt(item.price, display)}
                            {quotes[item.symbol]?.changePct != null && (
                              <span
                                className={`ml-1.5 text-xs ${
                                  quotes[item.symbol].changePct >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {quotes[item.symbol].changePct >= 0 ? '▲' : '▼'}
                                {Math.abs(quotes[item.symbol].changePct).toFixed(1)}%
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            sin precio
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {fmtPct(item.target_weight)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{fmtPct(item.actualPct)}</td>
                      <td
                        className={`px-3 py-3 text-right ${
                          item.over
                            ? 'text-amber-600 dark:text-amber-400'
                            : item.gap > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.over ? `${fmtPct(item.gap)}` : item.gap > 0 ? `+${fmtPct(item.gap)}` : '—'}
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 dark:text-slate-300 sm:table-cell">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-200">{fmt(item.value, display)}</td>
                      <td className="px-3 py-3 text-right">
                        {item.buy > 0 ? (
                          <span className="font-medium text-brand-700 dark:text-brand-300">≈{item.buyQty} u</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            aria-label={`Editar ${item.symbol}`}
                            title="Editar"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            aria-label={`Eliminar ${item.symbol}`}
                            title="Eliminar"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
                {editingId === '__new__' && (
                  <tr className="bg-brand-50/50 dark:bg-brand-950/20">
                    <td colSpan={9} className="px-4 py-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          saveEdit()
                        }}
                        className="flex flex-wrap items-end gap-2"
                      >
                        {editFields.map((f) => (
                          <label key={f.key} className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                            {f.label}
                            <input
                              type={f.type}
                              value={draft[f.key]}
                              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                              min={f.type === 'number' ? 0 : undefined}
                              step={f.key === 'target_weight' ? '0.5' : undefined}
                              aria-label={f.label}
                              autoFocus={f.key === 'symbol'}
                              className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </label>
                        ))}
                        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                          Tipo
                          <select
                            value={draft.asset_type}
                            onChange={(e) => setDraft((d) => ({ ...d, asset_type: e.target.value }))}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {Object.entries(ASSET_TYPES).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                          Moneda
                          <select
                            value={draft.currency}
                            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        </label>
                        <div className="ml-auto flex gap-1.5">
                          <button
                            type="submit"
                            aria-label="Guardar activo"
                            className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label="Cancelar"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tengo para comprar
            </h2>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              Priorizar por
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                aria-label="Prioridad de compra"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {STRATEGY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={display === 'USD' ? '0' : '0'}
                aria-label="Presupuesto para comprar"
                min={0}
                className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">{display}</span>
            </label>
          </div>

          {Number(budget) > 0 ? (
            dist.steps.length > 0 ? (
              <>
                <ul className="flex flex-col gap-1.5">
                  {dist.steps.map((step, i) => (
                    <li
                      key={`${step.symbol}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{step.symbol}</span>
                        <span className="ml-2 text-xs text-slate-400">≈{step.qty} u</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fmt(step.amount, display)}</span>
                        <button
                          type="button"
                          onClick={() => applyBuy(step)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-400"
                        >
                          Comprar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {dist.covered
                    ? `Te sobran ${fmt(dist.remaining, display)} para llegar a la meta.`
                    : `Con ${fmt(Number(budget) || 0, display)} cubrís ${fmt((Number(budget) || 0) - dist.remaining, display)} de ${fmt(dist.totalNeeded, display)} de faltantes.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay faltantes: ya estás en la meta o con exceso.
              </p>
            )
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Ingresá cuánto tenés disponible y te ordenamos qué comprar primero según tu prioridad (se recalcula en vivo al comprar).
            </p>
          )}
        </section>
      )}
    </div>
  )
}
