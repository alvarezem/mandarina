import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { buildPlan } from '../lib/plan'
import { useToast } from '../components/Toast'
import { useLang } from '../components/LangProvider'
import { t } from '../lib/i18n'

const MAX_SYMBOLS = 50

// Moneda efectiva de una cotización: la real de la quote de BYMA cuando existe,
// si no la tipeada en el plan. El fallback por histórico (bymaLastClose) no trae
// moneda (currency: null) y cae al campo tipeado.
function effectiveCurrency(quote, item) {
  return quote?.currency ?? item.currency ?? 'ARS'
}

export function usePortfolioQuotes({ items, display, rateMode, onMarketClosed = () => {} }) {
  const { lang } = useLang()
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [quotesError, setQuotesError] = useState(false)
  const pushToast = useToast()

  // Normalización espejo de la edge (`quotes/index.ts:144-158`): strings,
  // sin MEP/CCL (se resuelven vía rates, que llegan siempre), dedupe, tope 50.
  const requested = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const i of items) {
      const s = i.symbol
      if (!s || s === 'MEP' || s === 'CCL' || seen.has(s)) continue
      seen.add(s)
      if (out.length < MAX_SYMBOLS) out.push(s)
    }
    return out
  }, [items])

  const symbolsKey = requested.join('|')

  const droppedCount = useMemo(() => {
    const uniq = new Set(items.map((i) => i.symbol).filter(Boolean))
    return uniq.size - requested.length
  }, [items, requested])

  useEffect(() => {
    let cancelled = false
    supabase.functions
      .invoke('quotes', { body: { symbols: requested } })
      .then(({ data }) => {
        if (cancelled || !data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
        if (droppedCount > 0) pushToast({ type: 'info', message: t(lang, 'inv.quotes.limit') })
      })
      .catch(() => {
        if (!cancelled) setQuotesError(true)
      })
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
      const quote = quotes[item.symbol]
      const price = resolvePrice(item)
      const currency = effectiveCurrency(quote, item)
      const canScale = price != null && currency !== display && rate != null
      const scaledPrice = canScale ? (display === 'ARS' ? price * rate : price / rate) : price
      return { ...item, currency, valueCurrency: canScale ? display : currency, price: scaledPrice }
    })
    return buildPlan(scaled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, quotes, rates, display, rateMode])

  // Moneda en la que se muestra el total: con rate, todo se escala a `display`;
  // sin rate solo es sumable si todos los activos con precio comparten moneda
  // (si son mixtos no hay total en una sola moneda → null).
  const totalCurrency = useMemo(() => {
    if (rate != null) return display
    const priced = builtItems.filter((i) => i.price != null)
    if (priced.length === 0) return display
    const first = priced[0].valueCurrency
    return priced.every((i) => i.valueCurrency === first) ? first : null
  }, [builtItems, display, rate])

  const refreshQuotes = () => {
    if (requested.length === 0) return
    supabase.functions
      .invoke('quotes', { body: { symbols: requested } })
      .then(({ data }) => {
        if (!data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
        if (droppedCount > 0) pushToast({ type: 'info', message: t(lang, 'inv.quotes.limit') })
        pushToast({ type: 'success', message: t(lang, 'quotes.updated') })
      })
      .catch(() => {
        setQuotesError(true)
        pushToast({ type: 'error', message: t(lang, 'quotes.error') })
      })
  }

  return {
    quotes,
    rates,
    rate,
    resolvePrice,
    builtItems,
    totalCurrency,
    refreshQuotes,
    quotesError,
  }
}
