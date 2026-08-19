import { useMemo, useState } from 'react'
import { Chart } from 'chart.js'
import supabase from '../lib/supabaseClient'
import { fetchAllTransactions } from '../lib/transactions'
import {
  buildExpenseReport,
  buildFiscalReport,
  buildLedgerReport,
  toCsv,
  toPdf,
  toXlsx,
} from '../lib/reports'
import { fileOf, fmt } from '../lib/format'
import { BRAND_HEX, PALETTE } from '../lib/constants'
import { categoryLabel, sideLabel, t } from '../lib/i18n'
import { useAsync } from '../hooks/useAsync'
import { useToast } from './Toast'
import { useLang } from './LangProvider'
import '../lib/chartjs'

const CSV_TYPE = 'text/csv;charset=utf-8'
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PERIODS = ['todo', 'year', '12m', 'custom']
const CURRENCIES = ['all', 'ARS', 'USD']

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

function rangeFor(period, year, from, to) {
  if (period === 'year') {
    const y = year ?? new Date().getFullYear()
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  }
  if (period === '12m') {
    const now = new Date()
    const first = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const from = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`
    return { from, to: todayStamp() }
  }
  if (period === 'custom') return { from: from || null, to: to || null }
  return null
}

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob([csv], { type: CSV_TYPE }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function downloadXlsx(sheets, filename) {
  const buffer = await toXlsx({ sheets })
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_TYPE }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Doughnut imperativo sobre un canvas oculto para el PDF del resumen
// impositivo: se renderiza sin animación con devicePixelRatio 2 (nitidez en
// impresión) y se exporta a PNG con toBase64Image. Vive en el componente (no
// en lib) porque depende del DOM; si el canvas no está disponible devuelve
// null y el PDF se genera sin el gráfico.
function renderDoughnutImage(byCategory, lang) {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  canvas.style.display = 'none'
  document.body.appendChild(canvas)
  let chart = null
  try {
    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: byCategory.map((c) => categoryLabel(lang, c.category)),
        datasets: [
          {
            data: byCategory.map((c) => Math.abs(c.total)),
            backgroundColor: [BRAND_HEX, ...PALETTE],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        devicePixelRatio: 2,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
      },
    })
    return chart.toBase64Image()
  } catch {
    return null
  } finally {
    if (chart) chart.destroy()
    canvas.remove()
  }
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const selectCls =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

function ExportButton({ label, onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {busy && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {label}
    </button>
  )
}

export default function ReportsView({ session }) {
  const { lang } = useLang()
  const pushToast = useToast()
  const userId = session?.user?.id
  const currentYear = new Date().getFullYear()

  const [expPeriod, setExpPeriod] = useState('todo')
  const [expYear, setExpYear] = useState(currentYear)
  const [expFrom, setExpFrom] = useState('')
  const [expTo, setExpTo] = useState('')
  const [expCurrency, setExpCurrency] = useState('all')
  const [expCategory, setExpCategory] = useState('')
  const [fiscalYear, setFiscalYear] = useState(currentYear)
  const [busy, setBusy] = useState(null)

  const {
    data: txData,
    loading,
    error,
  } = useAsync(async () => {
    if (!userId) return []
    try {
      const builder = supabase
        .from('transactions')
        .select('*, card_summaries(file_name, summary_type, period_month, period_year)')
        .order('date', { ascending: false })
        .eq('user_id', userId)
      const data = await fetchAllTransactions(builder)
      return data ?? []
    } catch (e) {
      console.error('ReportsView: error al cargar transacciones', e)
      throw new Error(t(lang, 'reports.err.load'))
    }
  }, [userId])

  const { data: opsData } = useAsync(async () => {
    if (!userId) return []
    try {
      const { data, error } = await supabase
        .from('ledger_operations')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      if (error) {
        console.error('ReportsView: error al cargar operaciones', error)
        throw new Error(t(lang, 'reports.err.load'))
      }
      return data || []
    } catch (e) {
      console.error('ReportsView: error al cargar operaciones', e)
      throw new Error(t(lang, 'reports.err.load'))
    }
  }, [userId])

  const allTx = useMemo(() => txData ?? [], [txData])
  const ops = useMemo(() => opsData ?? [], [opsData])

  const yearOptions = useMemo(() => {
    const years = new Set(allTx.map((tx) => tx.date?.slice(0, 4)).filter(Boolean))
    years.add(String(currentYear))
    return [...years].sort((a, b) => Number(b) - Number(a))
  }, [allTx, currentYear])

  const categoryOptions = useMemo(
    () => [...new Set(allTx.map((tx) => tx.category).filter(Boolean))].sort(),
    [allTx],
  )

  const expenseFilters = useMemo(
    () => ({
      ...rangeFor(expPeriod, expYear, expFrom, expTo),
      currency: expCurrency,
      categories: expCategory ? [expCategory] : [],
    }),
    [expPeriod, expYear, expFrom, expTo, expCurrency, expCategory],
  )

  const expenseReport = useMemo(
    () => buildExpenseReport(allTx, expenseFilters),
    [allTx, expenseFilters],
  )
  const fiscalReport = useMemo(() => buildFiscalReport(allTx, fiscalYear), [allTx, fiscalYear])
  const ledgerReport = useMemo(() => buildLedgerReport(ops), [ops])

  const periodLabel = useMemo(() => {
    const r = rangeFor(expPeriod, expYear, expFrom, expTo)
    if (!r) return t(lang, 'period.todo')
    if (r.from && r.to) return `${r.from} → ${r.to}`
    if (r.from) return `${t(lang, 'reports.meta.from')} ${r.from}`
    if (r.to) return `${t(lang, 'reports.meta.to')} ${r.to}`
    return ''
  }, [lang, expPeriod, expYear, expFrom, expTo])

  const currencyLabel = expCurrency === 'all' ? t(lang, 'filters.allCurrencies') : expCurrency

  const noCategory = t(lang, 'table.noCategory')
  const nameCat = (r) => (r.category ? categoryLabel(lang, r.category) : noCategory)
  const nameMerchant = (r) => r.merchant || noCategory

  const expenseHeaders = [
    t(lang, 'table.date'),
    t(lang, 'table.description'),
    t(lang, 'table.category'),
    t(lang, 'table.currency'),
    t(lang, 'table.amount'),
    t(lang, 'table.summary'),
  ]
  const aggHeaders = [
    t(lang, 'table.currency'),
    t(lang, 'table.category'),
    t(lang, 'reports.col.count'),
    t(lang, 'reports.col.total'),
  ]
  const merchantHeaders = [
    t(lang, 'table.currency'),
    t(lang, 'table.description'),
    t(lang, 'reports.col.count'),
    t(lang, 'reports.col.total'),
  ]
  const ledgerHeaders = [
    t(lang, 'inv.ledger.date'),
    t(lang, 'inv.ledger.symbol'),
    t(lang, 'inv.ledger.type'),
    t(lang, 'inv.ledger.qty'),
    t(lang, 'inv.table.precio'),
    t(lang, 'table.currency'),
    t(lang, 'inv.ledger.commission'),
    t(lang, 'inv.ledger.note'),
    t(lang, 'inv.ledger.subtotal'),
  ]
  const symbolHeaders = [
    t(lang, 'inv.ledger.symbol'),
    t(lang, 'table.currency'),
    t(lang, 'inv.table.cantidad'),
    t(lang, 'inv.ledger.avgCost'),
    t(lang, 'inv.ledger.invested'),
    t(lang, 'reports.meta.ops'),
  ]

  const txRow = (tx) => [
    tx.date ?? '',
    tx.merchant ?? '',
    tx.category ? categoryLabel(lang, tx.category) : noCategory,
    tx.currency ?? 'ARS',
    tx.amount,
    fileOf(tx) ?? '',
  ]

  const runExport = async (key, fn) => {
    if (busy) return
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      console.error('ReportsView: export fallido', e)
      pushToast({ type: 'error', message: t(lang, 'reports.err.export') })
    } finally {
      setBusy(null)
    }
  }

  const okToast = (format) =>
    pushToast({ type: 'success', message: t(lang, 'reports.ok', { format }) })
  const emptyToast = () => pushToast({ type: 'error', message: t(lang, 'reports.err.empty') })

  const handleExpenseCsv = () =>
    runExport('expense-csv', () => {
      if (!expenseReport.rows.length) return emptyToast()
      downloadCsv(
        toCsv(expenseHeaders, expenseReport.rows.map(txRow)),
        `mandarina-transacciones-${todayStamp()}.csv`,
      )
      okToast('CSV')
    })

  const handleExpenseXlsx = () =>
    runExport('expense-xlsx', async () => {
      if (!expenseReport.rows.length) return emptyToast()
      await downloadXlsx(
        [
          {
            name: t(lang, 'reports.sheet.transactions'),
            headers: expenseHeaders,
            rows: expenseReport.rows.map(txRow),
          },
          {
            name: t(lang, 'reports.sheet.byCategory'),
            headers: aggHeaders,
            rows: expenseReport.byCategory.map((r) => [r.currency, nameCat(r), r.count, r.total]),
          },
          {
            name: t(lang, 'reports.sheet.byMerchant'),
            headers: merchantHeaders,
            rows: expenseReport.byMerchant.map((r) => [
              r.currency,
              nameMerchant(r),
              r.count,
              r.total,
            ]),
          },
        ],
        `mandarina-transacciones-${todayStamp()}.xlsx`,
      )
      okToast('Excel')
    })

  const handleExpensePdf = () =>
    runExport('expense-pdf', () => {
      if (!expenseReport.rows.length) return emptyToast()
      const doc = toPdf({
        title: t(lang, 'reports.section.expense.title'),
        meta: [
          { label: t(lang, 'reports.meta.period'), value: periodLabel },
          { label: t(lang, 'reports.meta.currency'), value: currencyLabel },
          { label: t(lang, 'reports.meta.count'), value: String(expenseReport.totals.txCount) },
        ],
        tables: [
          {
            title: t(lang, 'reports.sheet.byCategory'),
            headers: aggHeaders,
            rows: expenseReport.byCategory.map((r) => [r.currency, nameCat(r), r.count, r.total]),
          },
          {
            title: t(lang, 'reports.sheet.byMerchant'),
            headers: merchantHeaders,
            rows: expenseReport.byMerchant.map((r) => [
              r.currency,
              nameMerchant(r),
              r.count,
              r.total,
            ]),
          },
        ],
      })
      doc.save(`mandarina-transacciones-${todayStamp()}.pdf`)
      okToast('PDF')
    })

  const fiscalRow = (tx) => txRow(tx)
  const fiscalAggRows = (list, nameOf) => list.map((r) => [r.currency, nameOf(r), r.count, r.total])

  const handleFiscalCsv = () =>
    runExport('fiscal-csv', () => {
      if (!fiscalReport.rows.length) return emptyToast()
      downloadCsv(
        toCsv(expenseHeaders, fiscalReport.rows.map(fiscalRow)),
        `mandarina-impositivo-${fiscalYear}.csv`,
      )
      okToast('CSV')
    })

  const handleFiscalXlsx = () =>
    runExport('fiscal-xlsx', async () => {
      if (!fiscalReport.rows.length) return emptyToast()
      await downloadXlsx(
        [
          {
            name: t(lang, 'reports.sheet.transactions'),
            headers: expenseHeaders,
            rows: fiscalReport.rows.map(fiscalRow),
          },
          {
            name: t(lang, 'reports.sheet.byCategory'),
            headers: aggHeaders,
            rows: [
              ...fiscalAggRows(fiscalReport.ars.byCategory, nameCat),
              ...fiscalAggRows(fiscalReport.usd.byCategory, nameCat),
            ],
          },
          {
            name: t(lang, 'reports.sheet.byMerchant'),
            headers: merchantHeaders,
            rows: [
              ...fiscalAggRows(fiscalReport.ars.byMerchant, nameMerchant),
              ...fiscalAggRows(fiscalReport.usd.byMerchant, nameMerchant),
            ],
          },
        ],
        `mandarina-impositivo-${fiscalYear}.xlsx`,
      )
      okToast('Excel')
    })

  const handleFiscalPdf = () =>
    runExport('fiscal-pdf', () => {
      if (!fiscalReport.rows.length) return emptyToast()
      const chartImage = renderDoughnutImage(fiscalReport.ars.byCategory, lang)
      const catHeaders = [
        t(lang, 'table.category'),
        t(lang, 'reports.col.count'),
        t(lang, 'reports.col.total'),
      ]
      const merHeaders = [
        t(lang, 'table.description'),
        t(lang, 'reports.col.count'),
        t(lang, 'reports.col.total'),
      ]
      const tables = [
        {
          title: `${t(lang, 'reports.fiscal.byCategory')} (ARS)`,
          headers: catHeaders,
          rows: fiscalReport.ars.byCategory.map((r) => [nameCat(r), r.count, r.total]),
        },
        {
          title: `${t(lang, 'reports.fiscal.byMerchant')} (ARS)`,
          headers: merHeaders,
          rows: fiscalReport.ars.byMerchant.map((r) => [nameMerchant(r), r.count, r.total]),
        },
      ]
      if (fiscalReport.usd.byCategory.length) {
        tables.push(
          {
            title: `${t(lang, 'reports.fiscal.byCategory')} (USD)`,
            headers: catHeaders,
            rows: fiscalReport.usd.byCategory.map((r) => [nameCat(r), r.count, r.total]),
          },
          {
            title: `${t(lang, 'reports.fiscal.byMerchant')} (USD)`,
            headers: merHeaders,
            rows: fiscalReport.usd.byMerchant.map((r) => [nameMerchant(r), r.count, r.total]),
          },
        )
      }
      const doc = toPdf({
        title: `${t(lang, 'reports.section.fiscal.title')} ${fiscalYear}`,
        meta: [
          { label: t(lang, 'reports.meta.year'), value: String(fiscalYear) },
          { label: t(lang, 'reports.meta.count'), value: String(fiscalReport.rows.length) },
          {
            label: t(lang, 'reports.meta.debits'),
            value: `${fmt(fiscalReport.ars.totals.debits)} · ${fmt(fiscalReport.usd.totals.debits, 'USD')}`,
          },
        ],
        tables,
        chartImage,
      })
      doc.save(`mandarina-impositivo-${fiscalYear}.pdf`)
      okToast('PDF')
    })

  const ledgerRow = (r) => [
    r.date,
    r.symbol,
    sideLabel(lang, r.side),
    r.quantity,
    r.price,
    r.currency,
    r.commission_is_pct ? `${r.commission}%` : r.commission,
    r.notes || '—',
    r.subtotal,
  ]

  const handleLedgerCsv = () =>
    runExport('ledger-csv', () => {
      if (!ledgerReport.rows.length) return emptyToast()
      downloadCsv(
        toCsv(ledgerHeaders, ledgerReport.rows.map(ledgerRow)),
        `mandarina-ledger-${todayStamp()}.csv`,
      )
      okToast('CSV')
    })

  const handleLedgerXlsx = () =>
    runExport('ledger-xlsx', async () => {
      if (!ledgerReport.rows.length) return emptyToast()
      await downloadXlsx(
        [
          {
            name: t(lang, 'reports.meta.ops'),
            headers: ledgerHeaders,
            rows: ledgerReport.rows.map(ledgerRow),
          },
          {
            name: t(lang, 'reports.sheet.bySymbol'),
            headers: symbolHeaders,
            rows: ledgerReport.bySymbol.map((s) => [
              s.symbol,
              s.currency,
              s.quantity,
              s.avgCost,
              s.invested,
              s.ops,
            ]),
          },
        ],
        `mandarina-ledger-${todayStamp()}.xlsx`,
      )
      okToast('Excel')
    })

  const handleLedgerPdf = () =>
    runExport('ledger-pdf', () => {
      if (!ledgerReport.rows.length) return emptyToast()
      const doc = toPdf({
        title: t(lang, 'reports.section.ledger.title'),
        meta: [
          {
            label: t(lang, 'reports.meta.investedArs'),
            value: fmt(ledgerReport.totals.investedArs),
          },
          {
            label: t(lang, 'reports.meta.investedUsd'),
            value: fmt(ledgerReport.totals.investedUsd, 'USD'),
          },
          { label: t(lang, 'reports.meta.ops'), value: String(ledgerReport.totals.ops) },
        ],
        tables: [
          {
            title: t(lang, 'reports.sheet.bySymbol'),
            headers: symbolHeaders,
            rows: ledgerReport.bySymbol.map((s) => [
              s.symbol,
              s.currency,
              s.quantity,
              s.avgCost,
              s.invested,
              s.ops,
            ]),
          },
          {
            title: t(lang, 'reports.meta.ops'),
            headers: ledgerHeaders,
            rows: ledgerReport.rows.map(ledgerRow),
          },
        ],
      })
      doc.save(`mandarina-ledger-${todayStamp()}.pdf`)
      okToast('PDF')
    })

  if (loading) {
    return (
      <div className="animate-fade-in-up flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t(lang, 'reports.title')}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t(lang, 'reports.subtitle')}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t(lang, 'reports.section.expense.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'reports.section.expense.hint')}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label={t(lang, 'filters.period')}>
              <select
                className={selectCls}
                value={expPeriod}
                onChange={(e) => setExpPeriod(e.target.value)}
                aria-label={t(lang, 'filters.period')}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {t(
                      lang,
                      p === 'todo'
                        ? 'period.todo'
                        : p === '12m'
                          ? 'period.last12m'
                          : p === 'year'
                            ? 'reports.period.year'
                            : 'period.custom',
                    )}
                  </option>
                ))}
              </select>
            </Field>
            {expPeriod === 'year' && (
              <Field label={t(lang, 'reports.meta.year')}>
                <select
                  className={selectCls}
                  value={expYear}
                  onChange={(e) => setExpYear(Number(e.target.value))}
                  aria-label={t(lang, 'reports.meta.year')}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {expPeriod === 'custom' && (
              <>
                <Field label={t(lang, 'reports.meta.from')}>
                  <input
                    type="date"
                    className={selectCls}
                    value={expFrom}
                    onChange={(e) => setExpFrom(e.target.value)}
                    aria-label={t(lang, 'reports.meta.from')}
                  />
                </Field>
                <Field label={t(lang, 'reports.meta.to')}>
                  <input
                    type="date"
                    className={selectCls}
                    value={expTo}
                    onChange={(e) => setExpTo(e.target.value)}
                    aria-label={t(lang, 'reports.meta.to')}
                  />
                </Field>
              </>
            )}
            <Field label={t(lang, 'filters.currency')}>
              <select
                className={selectCls}
                value={expCurrency}
                onChange={(e) => setExpCurrency(e.target.value)}
                aria-label={t(lang, 'filters.currency')}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? t(lang, 'filters.allCurrencies') : c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t(lang, 'table.category')}>
              <select
                className={selectCls}
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                aria-label={t(lang, 'table.category')}
              >
                <option value="">{t(lang, 'reports.allCategories')}</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(lang, c)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="ml-auto flex gap-2">
              <ExportButton
                label="Excel"
                onClick={handleExpenseXlsx}
                busy={busy === 'expense-xlsx'}
              />
              <ExportButton label="CSV" onClick={handleExpenseCsv} busy={busy === 'expense-csv'} />
              <ExportButton label="PDF" onClick={handleExpensePdf} busy={busy === 'expense-pdf'} />
            </div>
          </div>
          {expenseReport.rows.length === 0 && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {t(lang, 'reports.empty.expense')}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t(lang, 'reports.section.fiscal.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'reports.section.fiscal.hint')}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label={t(lang, 'reports.meta.year')}>
              <select
                className={selectCls}
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                aria-label={t(lang, 'reports.meta.year')}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <div className="ml-auto flex gap-2">
              <ExportButton
                label="Excel"
                onClick={handleFiscalXlsx}
                busy={busy === 'fiscal-xlsx'}
              />
              <ExportButton label="CSV" onClick={handleFiscalCsv} busy={busy === 'fiscal-csv'} />
              <ExportButton label="PDF" onClick={handleFiscalPdf} busy={busy === 'fiscal-pdf'} />
            </div>
          </div>
          {fiscalReport.rows.length === 0 && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {t(lang, 'reports.empty.fiscal', { year: String(fiscalYear) })}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t(lang, 'reports.section.ledger.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'reports.section.ledger.hint')}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="ml-auto flex gap-2">
              <ExportButton
                label="Excel"
                onClick={handleLedgerXlsx}
                busy={busy === 'ledger-xlsx'}
              />
              <ExportButton label="CSV" onClick={handleLedgerCsv} busy={busy === 'ledger-csv'} />
              <ExportButton label="PDF" onClick={handleLedgerPdf} busy={busy === 'ledger-pdf'} />
            </div>
          </div>
          {ledgerReport.rows.length === 0 && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {t(lang, 'reports.empty.ledger')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
