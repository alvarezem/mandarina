import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { fmt } from '../lib/format'
import { normalizeSymbol, validateSymbol } from '../lib/watchlist'
import { profitability, summarize } from '../lib/ledger'
import { useAsync } from '../hooks/useAsync'
import { useWatchQuotes } from '../hooks/useWatchQuotes'
import { useToast } from './Toast'
import QuotesErrorNotice from './QuotesErrorNotice'

const SIDES = [
  { key: 'compra', label: 'Compra' },
  { key: 'venta', label: 'Venta' },
  { key: 'ajuste', label: 'Ajuste' },
]

const today = () => new Date().toISOString().slice(0, 10)

export default function LedgerView({
  session,
  display = 'ARS',
  rateMode = 'CCL',
  setDisplay = () => {},
  setRateMode = () => {},
}) {
  const pushToast = useToast()
  const [form, setForm] = useState(() => ({
    side: 'compra',
    symbol: '',
    date: today(),
    quantity: '',
    price: '',
    commission: '',
    notes: '',
  }))
  const [saving, setSaving] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  const [draftSymbol, setDraftSymbol] = useState('')

  useEffect(() => {
    const clean = normalizeSymbol(form.symbol)
    const t = setTimeout(() => setDraftSymbol(validateSymbol(clean) ? clean : ''), 400)
    return () => clearTimeout(t)
  }, [form.symbol])

  const {
    data: rows,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    try {
      const { data, error } = await supabase
        .from('ledger_operations')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('date', { ascending: false })
      if (error) {
        console.error('LedgerView: error al cargar', error)
        throw new Error('No se pudo cargar el historial de operaciones')
      }
      return data || []
    } catch (e) {
      console.error('LedgerView: error al cargar', e)
      throw new Error('No se pudo cargar el historial de operaciones')
    }
  }, [session?.user?.id])

  const ops = rows ?? []
  const summary = summarize(ops)
  const { quotes, rates, refreshQuotes, quotesError } = useWatchQuotes({
    symbols: [...new Set([...summary.map((s) => s.symbol), draftSymbol].filter(Boolean))],
  })

  const rate = rates[rateMode]?.price || null
  const toDisplay = (price) => (display === 'USD' && rate ? price / rate : price)

  const symbolRows = summary.map((s) => {
    const rawPrice = quotes[s.symbol]?.price
    const price = rawPrice != null ? toDisplay(rawPrice) : null
    return { ...s, price, ...profitability(s, price) }
  })

  const priced = symbolRows.filter((s) => s.price != null && s.quantity > 0)
  const totalInvested = symbolRows.reduce((a, s) => a + s.invested, 0)
  const totalCost = priced.reduce((a, s) => a + s.avgCost * s.quantity, 0)
  const totalValue = priced.reduce((a, s) => a + s.price * s.quantity, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const quoteForDraft = quotes[draftSymbol]

  const handleAdd = async (e) => {
    e.preventDefault()
    const symbol = normalizeSymbol(form.symbol)
    if (!validateSymbol(symbol)) {
      pushToast({ type: 'error', message: 'Ticker inválido (ej. GGAL, AL30, MELID)' })
      return
    }
    const quantity = Number(form.quantity)
    const price = form.price === '' ? 0 : Number(form.price)
    const commission = form.commission === '' ? 0 : Number(form.commission)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      pushToast({ type: 'error', message: 'La cantidad debe ser mayor a 0' })
      return
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(commission) || commission < 0) {
      pushToast({ type: 'error', message: 'Precio y comisión deben ser mayores o iguales a 0' })
      return
    }
    if (!form.date) {
      pushToast({ type: 'error', message: 'Elegí una fecha para la operación' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('ledger_operations').insert({
        user_id: session.user.id,
        symbol,
        side: form.side,
        quantity,
        price,
        commission,
        currency: 'ARS',
        date: form.date,
        notes: form.notes.trim() || null,
      })
      if (error) {
        console.error('LedgerView: error al registrar operación', error)
        pushToast({ type: 'error', message: 'No se pudo registrar la operación' })
        return
      }
      setForm((f) => ({ ...f, symbol: '', quantity: '', price: '', commission: '', notes: '' }))
      pushToast({
        type: 'success',
        message: `${symbol}: ${form.side} de ${quantity} unidades registrada`,
      })
      reload()
    } catch (e) {
      console.error('LedgerView: error al registrar operación', e)
      pushToast({ type: 'error', message: 'No se pudo registrar la operación' })
    } finally {
      setSaving(false)
    }
  }

  const removeOp = async (op) => {
    try {
      const { error } = await supabase.from('ledger_operations').delete().eq('id', op.id)
      if (error) {
        console.error('LedgerView: error al eliminar operación', error)
        pushToast({ type: 'error', message: 'No se pudo eliminar la operación' })
        return
      }
      setConfirmingId(null)
      pushToast({ type: 'success', message: `Operación de ${op.symbol} eliminada` })
      reload()
    } catch (e) {
      console.error('LedgerView: error al eliminar operación', e)
      pushToast({ type: 'error', message: 'No se pudo eliminar la operación' })
    }
  }

  const signedAmount = (o) => {
    const amount = (Number(o.quantity) || 0) * (Number(o.price) || 0)
    const comm = Number(o.commission) || 0
    return o.side === 'venta' ? -(amount - comm) : amount + comm
  }

  const inputClass =
    'min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Operaciones
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Historial real de compras/ventas y rentabilidad vs. costo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quotesError && <QuotesErrorNotice />}
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
          <select
            value={rateMode}
            onChange={(e) => setRateMode(e.target.value)}
            aria-label="Tipo de cambio"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="CCL">CCL</option>
            <option value="MEP">MEP</option>
          </select>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Registrar operación
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={form.side}
            onChange={setField('side')}
            aria-label="Tipo de operación"
            className={inputClass}
          >
            {SIDES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            value={form.symbol}
            onChange={setField('symbol')}
            placeholder="Ticker"
            aria-label="Símbolo de la operación"
            maxLength={12}
            className={inputClass}
          />
          <input
            type="date"
            value={form.date}
            onChange={setField('date')}
            aria-label="Fecha de la operación"
            className={inputClass}
          />
          <input
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={setField('quantity')}
            placeholder="Cantidad"
            aria-label="Cantidad de la operación"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={form.price}
              onChange={setField('price')}
              placeholder="Precio"
              aria-label="Precio por unidad"
              className={inputClass}
            />
            {quoteForDraft?.price != null && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, price: String(quoteForDraft.price) }))}
                title="Usar el precio BYMA actual"
                className="shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                BYMA
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={form.commission}
            onChange={setField('commission')}
            placeholder="Comisión"
            aria-label="Comisión de la operación"
            className={inputClass}
          />
          <input
            value={form.notes}
            onChange={setField('notes')}
            placeholder="Nota (opcional)"
            aria-label="Nota de la operación"
            maxLength={120}
            className={`${inputClass} col-span-2`}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            Registrar
          </button>
        </div>
      </form>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : ops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Todavía no registraste ninguna operación.
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cargá tus compras/ventas y la posición inicial (Ajuste) para ver la rentabilidad vs.
            costo.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-xs text-slate-400 dark:text-slate-500">Invertido</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {fmt(toDisplay(totalInvested), display)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-xs text-slate-400 dark:text-slate-500">Valor actual</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {fmt(toDisplay(totalValue), display)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-xs text-slate-400 dark:text-slate-500">Ganancia/Pérdida</p>
              <p
                className={`mt-0.5 text-lg font-bold tabular-nums ${
                  totalPnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {fmt(toDisplay(totalPnl), display)}
                <span className="ml-1 text-sm font-medium">
                  {totalPnlPct >= 0 ? '▲' : '▼'} {Math.abs(totalPnlPct).toFixed(2)}%
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Símbolo</th>
                  <th className="py-2 pr-3 text-right font-medium">Cantidad</th>
                  <th className="py-2 pr-3 text-right font-medium">Costo prom.</th>
                  <th className="py-2 pr-3 text-right font-medium">Precio</th>
                  <th className="py-2 pr-3 text-right font-medium">Rentab.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {symbolRows.map((s) => (
                  <tr key={s.symbol}>
                    <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">
                      {s.symbol}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {s.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {s.avgCost > 0 ? fmt(toDisplay(s.avgCost), display) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {s.price != null ? fmt(s.price, display) : '—'}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-medium tabular-nums ${
                        s.pnl >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {s.price != null && s.quantity > 0 ? (
                        <>
                          {s.pnl >= 0 ? '▲' : '▼'} {Math.abs(s.pnlPct).toFixed(2)}%
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Símbolo</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 text-right font-medium">Cant.</th>
                  <th className="py-2 pr-3 text-right font-medium">Precio</th>
                  <th className="py-2 pr-3 text-right font-medium">Comisión</th>
                  <th className="py-2 pr-3 text-right font-medium">Subtotal</th>
                  <th className="py-2 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ops.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3 tabular-nums text-slate-500 dark:text-slate-400">
                      {o.date}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">
                      {o.symbol}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          o.side === 'venta'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : o.side === 'ajuste'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {o.side}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {o.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {fmt(toDisplay(o.price), display)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {o.commission > 0 ? fmt(toDisplay(o.commission), display) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">
                      {fmt(toDisplay(signedAmount(o)), display)}
                    </td>
                    <td className="py-2 text-right">
                      {confirmingId === o.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            ¿Borrar?
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOp(o)}
                            className="rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(o.id)}
                          aria-label={`Eliminar operación de ${o.symbol}`}
                          title="Eliminar operación"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.327L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
