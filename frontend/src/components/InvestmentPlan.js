import { useMemo, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { distribute } from '../lib/plan'
import { fmt } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { useToast } from './Toast'
import PlanTable from './PlanTable'
import DistributionPanel from './DistributionPanel'
import QuotesErrorNotice from './QuotesErrorNotice'
import { usePortfolioQuotes } from '../hooks/usePortfolioQuotes'
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
  const [budget, setBudget] = useState('')
  const [strategy, setStrategy] = useState('faltante')
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
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(newDraft())
  const [showRateInfo, setShowRateInfo] = useState(false)
  const [importing, setImporting] = useState(false)
  const inputRef = useRef(null)
  const pushToast = useToast()

  const {
    data: planData,
    loading,
    error,
    reload: reloadPlan,
  } = useAsync(async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_plan')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('sort_order', { ascending: true })
      if (error) {
        console.error('InvestmentPlan: error al cargar el plan', error)
        throw new Error('No se pudo cargar el plan de inversión')
      }
      return data || []
    } catch (e) {
      console.error('InvestmentPlan: error al cargar el plan', e)
      throw new Error('No se pudo cargar el plan de inversión')
    }
  }, [session?.user?.id])
  const items = planData ?? []

  const { quotes, rates, rate, builtItems, refreshQuotes, quotesError } = usePortfolioQuotes({
    items,
    display,
    rateMode,
    onMarketClosed,
  })

  const total = builtItems.reduce((sum, item) => sum + item.value, 0)

  const sortedItems = useMemo(() => {
    if (!sort.key) return builtItems
    const { key, dir } = SORT_KEYS.has(sort.key) ? sort : DEFAULT_PLAN_SORT
    const arr = [...builtItems]
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
  }, [builtItems, sort])

  const dist = useMemo(
    () => distribute(Number(budget) || 0, builtItems, strategy),
    [budget, builtItems, strategy],
  )

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
        reloadPlan()
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

    try {
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
      reloadPlan()
    } catch (e) {
      console.error('InvestmentPlan: error al guardar activo', e)
      pushToast({ type: 'error', message: 'No se pudo guardar el activo' })
    }
  }

  const removeItem = async (item) => {
    try {
      const { error } = await supabase.from('portfolio_plan').delete().eq('id', item.id)
      if (error) {
        console.error('InvestmentPlan: error al eliminar activo', error)
        pushToast({ type: 'error', message: 'No se pudo eliminar el activo' })
        return
      }
      reloadPlan()
    } catch (e) {
      console.error('InvestmentPlan: error al eliminar activo', e)
      pushToast({ type: 'error', message: 'No se pudo eliminar el activo' })
    }
  }

  const applyBuy = async (step) => {
    const current = items.find((i) => i.symbol === step.symbol)
    if (!current) return
    const newQuantity = (Number(current.quantity) || 0) + step.qty
    try {
      const { error } = await supabase
        .from('portfolio_plan')
        .update({ quantity: newQuantity })
        .eq('id', current.id)
      if (error) {
        console.error('InvestmentPlan: error al aplicar compra', error)
        pushToast({ type: 'error', message: 'No se pudo registrar la compra' })
        return
      }
      await supabase.from('ledger_operations').insert({
        user_id: session.user.id,
        symbol: step.symbol,
        side: 'compra',
        quantity: step.qty,
        price: step.qty > 0 ? step.amount / step.qty : 0,
        commission: 0,
        currency: 'ARS',
        date: new Date().toISOString().slice(0, 10),
        notes: 'Compra por presupuesto',
      })
      setBudget(String(Math.max(0, (Number(budget) || 0) - step.amount)))
      pushToast({
        type: 'success',
        message: `${step.symbol}: compraste ≈${step.qty} (${fmt(step.amount, display)})`,
      })
      reloadPlan()
    } catch (e) {
      console.error('InvestmentPlan: error al aplicar compra', e)
      pushToast({ type: 'error', message: 'No se pudo registrar la compra' })
    }
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Plan de inversión
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Meta vs actual, en vivo
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Orden: % Meta mayor→menor · cambiá con los encabezados de la tabla (se recuerda)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quotesError && <QuotesErrorNotice />}
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
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
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
          <PlanTable
            items={sortedItems}
            sort={sort}
            onSort={onSort}
            editingId={editingId}
            draft={draft}
            onDraftChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onEdit={startEdit}
            onRemove={removeItem}
            quotes={quotes}
            display={display}
          />
        </div>
      )}

      {items.length > 0 && (
        <DistributionPanel
          budget={budget}
          onBudget={setBudget}
          strategy={strategy}
          onStrategy={setStrategy}
          dist={dist}
          display={display}
          onBuy={applyBuy}
        />
      )}
    </div>
  )
}
