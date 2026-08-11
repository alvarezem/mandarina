import { useEffect, useMemo, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { buildAnalysis, EXCLUDED_CATEGORIES } from '../lib/analysis'
import { fmt, fileOf } from '../lib/format'
import FiltersBar from './FiltersBar'
import SpendingCharts from './SpendingCharts'
import TransactionsTable from './TransactionsTable'
import { useToast } from './Toast'
import useCountUp from '../hooks/useCountUp'

const CATEGORY_OPTIONS = [
  'Combustible',
  'Compras',
  'Delivery',
  'Educación',
  'Entretenimiento',
  'Farmacias',
  'Gastronomía',
  'Gimnasio',
  'Impuestos',
  'Ingresos',
  'Inversiones',
  'Otros',
  'Pagos',
  'Salud',
  'Seguros',
  'Servicios',
  'Supermercados',
  'Suscripciones',
  'Transferencias',
  'Transporte',
]

const SORT_DEFAULTS = { date: 'desc', amount: 'asc', merchant: 'asc', category: 'asc', currency: 'asc', summary: 'asc' }
function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodRange(period) {
  const today = new Date()
  switch (period) {
    case 'thisMonth':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: ymd(from), to: ymd(to) }
    }
    case 'last3m':
      return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: ymd(today) }
    case 'last12m':
      return { from: ymd(new Date(today.getFullYear() - 1, today.getMonth(), 1)), to: ymd(today) }
    case 'thisYear':
      return { from: ymd(new Date(today.getFullYear(), 0, 1)), to: ymd(today) }
    default:
      return null
  }
}

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

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

export default function Dashboard({ session, summaryId, dark, refreshKey, resetKey, onSummarySelect }) {
  const pushToast = useToast()
  const [allTx, setAllTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overrides, setOverrides] = useState([])
  const [customCategories, setCustomCategories] = useState([])
  const [period, setPeriod] = useState('todo')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [categories, setCategories] = useState([])
  const [currency, setCurrency] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const tableRef = useRef(null)
  const autoApplied = useRef(false)
  const userId = session?.user?.id

  const filterKey = `${period}|${customFrom}|${customTo}|${currency}|${summaryId ?? 'all'}|${categories.join(',')}`

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      const [ov, cc] = await Promise.all([
        supabase.from('merchant_overrides').select('merchant, category').eq('user_id', userId),
        supabase.from('custom_categories').select('name').eq('user_id', userId),
      ])
      if (!active) return
      if (!ov.error) setOverrides(ov.data ?? [])
      if (!cc.error) setCustomCategories((cc.data ?? []).map((c) => c.name))
    })()
    return () => {
      active = false
    }
  }, [userId, refreshKey])

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    setError(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, card_summaries(file_name, summary_type, period_month, period_year)')
        .order('date', { ascending: false })
      if (!active) return
      if (error) {
        console.error('Dashboard: error al cargar transacciones', error)
        setError('No se pudieron cargar los gastos')
      } else {
        setAllTx(data ?? [])
      }
      setLoading(false)
      if (!autoApplied.current) {
        autoApplied.current = true
        const dates = (data ?? []).map((t) => t.date).filter(Boolean).sort()
        if (dates.length) {
          const first = parseYmd(dates[0])
          const cutoff = new Date()
          cutoff.setFullYear(cutoff.getFullYear() - 1)
          if (first < cutoff) setPeriod('last12m')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [refreshKey, userId])

  useEffect(() => {
    setPeriod('todo')
    setCustomFrom('')
    setCustomTo('')
    setCategories([])
    setCurrency('all')
    setQuery('')
  }, [resetKey])

  const base = useMemo(() => {
    let txs = allTx
    if (summaryId) txs = txs.filter((t) => t.summary_id === summaryId)
    const range = periodRange(period)
    if (range) txs = txs.filter((t) => t.date >= range.from && t.date <= range.to)
    if (period === 'custom') {
      if (customFrom) txs = txs.filter((t) => t.date >= customFrom)
      if (customTo) txs = txs.filter((t) => t.date <= customTo)
    }
    return txs
  }, [allTx, summaryId, period, customFrom, customTo])

  const working = useMemo(
    () => base.filter((t) => !EXCLUDED_CATEGORIES.includes(t.category)),
    [base],
  )
  const paymentsCount = base.length - working.length

  const categoryOptions = useMemo(
    () => [...new Set(working.map((t) => t.category).filter(Boolean))].sort(),
    [working],
  )

  const allCategoryOptions = useMemo(
    () =>
      [...new Set([
        ...CATEGORY_OPTIONS,
        ...customCategories,
        ...overrides.map((o) => o.category),
      ])].sort(),
    [customCategories, overrides],
  )

  const summaryOptions = useMemo(() => {
    const seen = new Map()
    for (const t of allTx) {
      if (!t.summary_id) continue
      const name = fileOf(t)
      if (name && !seen.has(t.summary_id)) seen.set(t.summary_id, name)
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allTx])

  const hasActiveFilters =
    period !== 'todo' ||
    Boolean(customFrom) ||
    Boolean(customTo) ||
    categories.length > 0 ||
    currency !== 'all' ||
    query.trim() !== '' ||
    summaryId !== null

  const clearFilters = () => {
    setPeriod('todo')
    setCustomFrom('')
    setCustomTo('')
    setCategories([])
    setCurrency('all')
    setQuery('')
    onSummarySelect?.(null)
  }

  const filtered = useMemo(() => {
    let txs = working
    if (currency === 'ARS') txs = txs.filter((t) => t.currency !== 'USD')
    if (currency === 'USD') txs = txs.filter((t) => t.currency === 'USD')
    if (categories.length) txs = txs.filter((t) => categories.includes(t.category))
    const q = query.trim().toLowerCase()
    if (q) txs = txs.filter((t) => t.merchant.toLowerCase().includes(q))
    return txs
  }, [working, currency, categories, query])

  const analysis = useMemo(() => buildAnalysis(filtered), [filtered])

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_DEFAULTS[key] }))

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, dir } = sort
    arr.sort((a, b) => {
      let cmp = 0
      const cmpStr = (x, y) => String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' })
      if (key === 'amount') cmp = a.amount - b.amount
      else if (key === 'date') cmp = cmpStr(a.date, b.date)
      else if (key === 'category') cmp = cmpStr(a.category, b.category)
      else if (key === 'currency') cmp = cmpStr(a.currency, b.currency)
      else if (key === 'summary') cmp = cmpStr(fileOf(a), fileOf(b))
      else cmp = cmpStr(a.merchant, b.merchant)
      return dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sort])

  const toggleCategory = (cat) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))

  const focusCategory = (cat) =>
    setCategories((prev) => (prev.length === 1 && prev[0] === cat ? [] : [cat]))

  const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const changeCategory = async (tx, category, remember = false) => {
    const { error } = await supabase
      .from('transactions')
      .update({ category })
      .eq('id', tx.id)
    if (error) {
      console.error('Dashboard: error al actualizar categoría', error)
      pushToast({ type: 'error', message: 'No se pudo actualizar la categoría' })
      return
    }
    setAllTx((prev) => prev.map((t) => (t.id === tx.id ? { ...t, category } : t)))

    if (remember && tx.merchant && category) {
      const { error: ovError } = await supabase
        .from('merchant_overrides')
        .upsert(
          { user_id: userId, merchant: tx.merchant, category },
          { onConflict: 'user_id,merchant' },
        )
      if (!ovError) {
        setOverrides((prev) => [
          ...prev.filter((o) => o.merchant.toLowerCase() !== tx.merchant.toLowerCase()),
          { merchant: tx.merchant, category },
        ])
        const { data: all } = await supabase
          .from('transactions')
          .update({ category })
          .eq('merchant', tx.merchant)
        if (all) setAllTx((prev) => prev.map((t) => (t.merchant === tx.merchant ? { ...t, category } : t)))
        pushToast({ type: 'success', message: `Guardado: ${tx.merchant} → ${category}` })
        return
      }
    }

    pushToast({ type: 'success', message: 'Categoría actualizada' })
  }

  const addCustomCategory = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error } = await supabase
      .from('custom_categories')
      .upsert({ user_id: userId, name: trimmed }, { onConflict: 'user_id,name' })
    if (error) {
      console.error('Dashboard: error al crear categoría', error)
      pushToast({ type: 'error', message: 'No se pudo crear la categoría' })
      return
    }
    setCustomCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    pushToast({ type: 'success', message: `Categoría creada: ${trimmed}` })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" key={filterKey}>
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (allTx.length === 0) {
    return (
      <EmptyState
        title="Subí un resumen para empezar."
        hint="Usá la barra lateral para subir tu primer PDF, CSV o XLSX."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <FiltersBar
          period={period}
          onPeriod={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
          summaryOptions={summaryOptions}
          summaryId={summaryId}
          onSummarySelect={onSummarySelect}
          categoryOptions={categoryOptions}
          categories={categories}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setCategories([])}
          currency={currency}
          onCurrency={setCurrency}
          query={query}
          onQuery={setQuery}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
        {paymentsCount > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {paymentsCount} {paymentsCount === 1 ? 'pago' : 'pagos'} de tarjeta excluido
            {paymentsCount === 1 ? '' : 's'} de los totales.
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin transacciones para este período."
          hint="Probá con otro rango de fechas o quitá los filtros."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" key={filterKey}>
            {[
              { label: 'Débitos', value: analysis.totals.debits, format: fmt, valueClass: 'text-red-600 dark:text-red-400' },
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
            ].map((c, i) => (
              <div key={c.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                <Card {...c} />
              </div>
            ))}
          </div>

          <SpendingCharts
            analysis={analysis}
            dark={dark}
            onPoint={(date) => {
              setPeriod('custom')
              setCustomFrom(date)
              setCustomTo(date)
              scrollToTable()
            }}
            onSlice={(cat) => {
              focusCategory(cat)
              scrollToTable()
            }}
            onBar={(merchant) => {
              setQuery(merchant)
              scrollToTable()
            }}
          />

          <div
            ref={tableRef}
            className="animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            style={{ animationDelay: '460ms' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalle</h3>
            </div>
            <TransactionsTable
              summaryId={summaryId}
              sort={sort}
              onSort={onSort}
              sorted={sorted}
              filterKey={filterKey}
              allCategoryOptions={allCategoryOptions}
              changeCategory={changeCategory}
              addCustomCategory={addCustomCategory}
            />
          </div>
        </>
      )}
    </div>
  )
}
