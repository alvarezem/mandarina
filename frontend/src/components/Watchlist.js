import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { fmt } from '../lib/format'
import { normalizeSymbol, validateSymbol } from '../lib/watchlist'
import { useAsync } from '../hooks/useAsync'
import { useWatchQuotes } from '../hooks/useWatchQuotes'
import { useToast } from './Toast'
import QuotesErrorNotice from './QuotesErrorNotice'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

export default function Watchlist({ session, display = 'ARS', rateMode = 'CCL' }) {
  const { lang } = useLang()
  const [symbolDraft, setSymbolDraft] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  const pushToast = useToast()

  const {
    data: rows,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('sort_order', { ascending: true })
      if (error) {
        console.error('Watchlist: error al cargar', error)
        throw new Error(t(lang, 'inv.watch.err.load'))
      }
      return data || []
    } catch (e) {
      console.error('Watchlist: error al cargar', e)
      throw new Error(t(lang, 'inv.watch.err.load'))
    }
  }, [session?.user?.id])

  const items = rows ?? []
  const { quotes, rates, refreshQuotes, quotesError } = useWatchQuotes({
    symbols: items.map((i) => i.symbol),
  })

  const rate = rates[rateMode]?.price || null
  const scaled = display === 'USD' && rate != null

  const handleAdd = async (e) => {
    e.preventDefault()
    const symbol = normalizeSymbol(symbolDraft)
    if (!validateSymbol(symbol)) {
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.invalidTicker') })
      return
    }
    if (items.some((i) => i.symbol === symbol)) {
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.exists', { symbol }) })
      return
    }
    setAdding(true)
    try {
      const { error } = await supabase.from('watchlist').insert({
        user_id: session.user.id,
        symbol,
        name: nameDraft.trim() || symbol,
        sort_order: items.length,
      })
      if (error) {
        console.error('Watchlist: error al agregar ticker', error)
        pushToast({ type: 'error', message: t(lang, 'inv.watch.err.add') })
        return
      }
      setSymbolDraft('')
      setNameDraft('')
      pushToast({ type: 'success', message: t(lang, 'inv.watch.ok.added', { symbol }) })
      reload()
    } catch (e) {
      console.error('Watchlist: error al agregar ticker', e)
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.add') })
    } finally {
      setAdding(false)
    }
  }

  const removeItem = async (item) => {
    try {
      const { error } = await supabase.from('watchlist').delete().eq('id', item.id)
      if (error) {
        console.error('Watchlist: error al eliminar ticker', error)
        pushToast({ type: 'error', message: t(lang, 'inv.watch.err.remove') })
        return
      }
      setConfirmingId(null)
      pushToast({
        type: 'success',
        message: t(lang, 'inv.watch.ok.removed', { symbol: item.symbol }),
      })
      reload()
    } catch (e) {
      console.error('Watchlist: error al eliminar ticker', e)
      pushToast({ type: 'error', message: t(lang, 'inv.watch.err.remove') })
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'inv.watch.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'inv.watch.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quotesError && <QuotesErrorNotice />}
          <button
            type="button"
            onClick={refreshQuotes}
            title={t(lang, 'inv.watch.refreshAria')}
            aria-label={t(lang, 'inv.watch.refreshAria')}
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

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={symbolDraft}
          onChange={(e) => setSymbolDraft(e.target.value)}
          placeholder={t(lang, 'inv.watch.tickerPlaceholder')}
          aria-label={t(lang, 'inv.watch.tickerAria')}
          maxLength={12}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder={t(lang, 'inv.watch.labelPlaceholder')}
          aria-label={t(lang, 'inv.watch.labelPlaceholder')}
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={adding}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {t(lang, 'inv.watch.add')}
        </button>
      </form>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t(lang, 'inv.watch.empty.title')}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'inv.watch.empty.hint')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const q = quotes[item.symbol]
            const price = q?.price != null ? (scaled ? q.price / rate : q.price) : null
            const label = scaled ? 'USD' : (q?.currency ?? 'ARS')
            const changePct = q?.changePct ?? null
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {item.symbol}
                  </span>
                  {item.name && item.name !== item.symbol && (
                    <span className="ml-2 truncate text-xs text-slate-400 dark:text-slate-500">
                      {item.name}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {price != null ? (
                    <>
                      <span className="text-right text-sm font-medium text-slate-700 dark:text-slate-200">
                        {fmt(price, label)}
                      </span>
                      {changePct != null ? (
                        <span
                          className={`w-20 text-right text-sm font-medium ${
                            changePct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="w-20 text-right text-sm text-slate-400 dark:text-slate-500">
                          —
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      {t(lang, 'inv.sinPrecio')}
                    </span>
                  )}
                  {confirmingId === item.id ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t(lang, 'inv.watch.removeConfirm')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                      >
                        {t(lang, 'inv.ledger.yes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {t(lang, 'summary.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(item.id)}
                      aria-label={t(lang, 'inv.watch.removeAria', { symbol: item.symbol })}
                      title={t(lang, 'inv.watch.removeTitle')}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
