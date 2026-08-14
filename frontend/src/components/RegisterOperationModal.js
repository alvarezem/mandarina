import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import supabase from '../lib/supabaseClient'
import { normalizeSymbol, validateSymbol } from '../lib/watchlist'
import { useToast } from './Toast'

const SIDES = [
  { key: 'compra', label: 'Compra' },
  { key: 'venta', label: 'Venta' },
  { key: 'ajuste', label: 'Ajuste' },
]

const today = () => new Date().toISOString().slice(0, 10)

const initialForm = () => ({
  side: 'compra',
  symbol: '',
  date: today(),
  quantity: '',
  price: '',
  commission: '',
  commissionIsPct: false,
  notes: '',
})

export default function RegisterOperationModal({ open, onClose, session, onRegistered }) {
  const pushToast = useToast()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [bymaLoading, setBymaLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

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
        commission_is_pct: form.commissionIsPct,
        currency: 'ARS',
        date: form.date,
        notes: form.notes.trim() || null,
      })
      if (error) {
        console.error('RegisterOperationModal: error al registrar operación', error)
        pushToast({ type: 'error', message: 'No se pudo registrar la operación' })
        return
      }
      pushToast({
        type: 'success',
        message: `${symbol}: ${form.side} de ${quantity} unidades registrada`,
      })
      onRegistered()
    } catch (e) {
      console.error('RegisterOperationModal: error al registrar operación', e)
      pushToast({ type: 'error', message: 'No se pudo registrar la operación' })
    } finally {
      setSaving(false)
    }
  }

  const handleByma = async () => {
    const symbol = normalizeSymbol(form.symbol)
    if (!validateSymbol(symbol)) {
      pushToast({ type: 'error', message: 'Ticker inválido (ej. GGAL, AL30, MELID)' })
      return
    }
    setBymaLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('quotes', {
        body: { symbols: [symbol] },
      })
      if (error) throw error
      const price = data?.quotes?.[symbol]?.price
      if (price == null) {
        pushToast({ type: 'error', message: `No se pudo obtener la cotización de ${symbol}` })
        return
      }
      setForm((f) => ({ ...f, price: String(price) }))
    } catch (e) {
      console.error('RegisterOperationModal: error al obtener cotización', e)
      pushToast({ type: 'error', message: `No se pudo obtener la cotización de ${symbol}` })
    } finally {
      setBymaLoading(false)
    }
  }

  const inputClass =
    'min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        data-testid="register-modal-backdrop"
      />
      <div className="relative h-full overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Registrar operación"
            className="relative my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Registrar operación
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compra, venta o ajuste de tu posición
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar registro"
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd}>
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
                  placeholder="Ticker *"
                  aria-label="Símbolo de la operación"
                  required
                  maxLength={12}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={setField('date')}
                  aria-label="Fecha de la operación"
                  required
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={setField('quantity')}
                  placeholder="Cantidad *"
                  aria-label="Cantidad de la operación"
                  required
                  className={inputClass}
                />
                <div className="col-span-2 flex gap-2">
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
                  <button
                    type="button"
                    onClick={handleByma}
                    disabled={bymaLoading}
                    title="Usar el precio BYMA actual"
                    className="shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {bymaLoading ? '…' : 'BYMA'}
                  </button>
                </div>
                <div className="col-span-2 flex gap-2">
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
                  <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    {['$', '%'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, commissionIsPct: u === '%' }))}
                        aria-label={u === '%' ? 'Comisión en porcentaje' : 'Comisión en pesos'}
                        aria-pressed={form.commissionIsPct === (u === '%')}
                        className={`px-2 py-2 text-sm font-medium transition ${
                          form.commissionIsPct === (u === '%')
                            ? 'bg-brand-600 text-white dark:bg-brand-500'
                            : 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder="Nota (opcional)"
                  aria-label="Nota de la operación"
                  rows={3}
                  maxLength={120}
                  className={`${inputClass} col-span-2 w-full resize-y`}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Los campos con * son obligatorios · Precio en $ · Comisión en $ o %
              </p>
              <button
                type="submit"
                disabled={saving}
                className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                {saving ? 'Registrando…' : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
