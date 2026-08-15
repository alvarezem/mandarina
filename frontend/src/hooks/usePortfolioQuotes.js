import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { buildPlan } from '../lib/plan'
import { useToast } from '../components/Toast'
import { useLang } from '../components/LangProvider'
import { t } from '../lib/i18n'

export function usePortfolioQuotes({ items, display, rateMode, onMarketClosed = () => {} }) {
  const { lang } = useLang()
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [quotesError, setQuotesError] = useState(false)
  const pushToast = useToast()

  const symbolsKey = useMemo(
    () =>
      items
        .map((i) => i.symbol)
        .filter(Boolean)
        .sort()
        .join('|'),
    [items],
  )

  useEffect(() => {
    const symbols = items.map((i) => i.symbol).filter(Boolean)
    let cancelled = false
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (cancelled || !data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
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

  const refreshQuotes = () => {
    const symbols = items.map((i) => i.symbol).filter(Boolean)
    if (symbols.length === 0) return
    supabase.functions
      .invoke('quotes', { body: { symbols } })
      .then(({ data }) => {
        if (!data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        onMarketClosed(data.marketClosed === true)
        pushToast({ type: 'success', message: t(lang, 'quotes.updated') })
      })
      .catch(() => {
        setQuotesError(true)
        pushToast({ type: 'error', message: t(lang, 'quotes.error') })
      })
  }

  return { quotes, rates, rate, resolvePrice, builtItems, refreshQuotes, quotesError }
}
