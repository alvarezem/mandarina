import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import supabase from '../lib/supabaseClient'
import { normalizeSymbol, validateSymbol } from '../lib/watchlist'
import { useToast } from './Toast'
import { useLang } from './LangProvider'
import { sideLabel, t } from '../lib/i18n'

const SIDES = ['compra', 'venta', 'ajuste']

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
  const { lang } = useLang()
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
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.invalidTicker') })
      return
    }
    const quantity = Number(form.quantity)
    const price = form.price === '' ? 0 : Number(form.price)
    const commission = form.commission === '' ? 0 : Number(form.commission)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      pushToast({ type: 'error', message: t(lang, 'inv.op.err.quantity') })
      return
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(commission) || commission < 0) {
      pushToast({ type: 'error', message: t(lang, 'inv.op.err.priceCommission') })
      return
    }
    if (!form.date) {
      pushToast({ type: 'error', message: t(lang, 'inv.op.err.date') })
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
        pushToast({ type: 'error', message: t(lang, 'inv.op.err.register') })
        return
      }
      pushToast({
        type: 'success',
        message: t(lang, 'inv.op.ok.registered', {
          symbol,
          side: form.side,
          quantity,
        }),
      })
      onRegistered()
    } catch (e) {
      console.error('RegisterOperationModal: error al registrar operación', e)
      pushToast({ type: 'error', message: t(lang, 'inv.op.err.register') })
    } finally {
      setSaving(false)
    }
  }

  const handleByma = async () => {
    const symbol = normalizeSymbol(form.symbol)
    if (!validateSymbol(symbol)) {
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.invalidTicker') })
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
        pushToast({ type: 'error', message: t(lang, 'inv.op.err.quote', { symbol }) })
        return
      }
      setForm((f) => ({ ...f, price: String(price) }))
    } catch (e) {
      console.error('RegisterOperationModal: error al obtener cotización', e)
      pushToast({ type: 'error', message: t(lang, 'inv.op.err.quote', { symbol }) })
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
            aria-label={t(lang, 'inv.op.dialogAria')}
            className="relative my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t(lang, 'inv.op.dialogAria')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(lang, 'inv.op.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(lang, 'inv.op.closeAria')}
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
                  aria-label={t(lang, 'inv.op.typeAria')}
                  className={inputClass}
                >
                  {SIDES.map((key) => (
                    <option key={key} value={key}>
                      {sideLabel(lang, key)}
                    </option>
                  ))}
                </select>
                <input
                  value={form.symbol}
                  onChange={setField('symbol')}
                  placeholder={t(lang, 'inv.op.tickerPlaceholder')}
                  aria-label={t(lang, 'inv.op.symbolAria')}
                  required
                  maxLength={12}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={setField('date')}
                  aria-label={t(lang, 'inv.op.dateAria')}
                  required
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={setField('quantity')}
                  placeholder={t(lang, 'inv.op.qtyPlaceholder')}
                  aria-label={t(lang, 'inv.op.qtyAria')}
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
                    placeholder={t(lang, 'inv.op.pricePlaceholder')}
                    aria-label={t(lang, 'inv.op.priceAria')}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleByma}
                    disabled={bymaLoading}
                    title={t(lang, 'inv.op.bymaTitle')}
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
                    placeholder={t(lang, 'inv.op.commissionPlaceholder')}
                    aria-label={t(lang, 'inv.op.commissionAria')}
                    className={inputClass}
                  />
                  <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    {['$', '%'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, commissionIsPct: u === '%' }))}
                        aria-label={
                          u === '%'
                            ? t(lang, 'inv.op.commissionPctAria')
                            : t(lang, 'inv.op.commissionArsAria')
                        }
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
                  placeholder={t(lang, 'inv.op.notesPlaceholder')}
                  aria-label={t(lang, 'inv.op.notesAria')}
                  rows={4}
                  maxLength={120}
                  className={`${inputClass} col-span-2 w-full resize-y sm:col-span-4`}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t(lang, 'inv.op.hint')}
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="self-end rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  {saving ? t(lang, 'inv.op.saving') : t(lang, 'inv.op.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
