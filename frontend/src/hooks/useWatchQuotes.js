import { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useToast } from '../components/Toast'

// Cotizaciones de la watchlist: invoca la edge `quotes` con { symbols } y
// devuelve solo el mapa de quotes. Sin rates ni buildPlan (la watchlist no
// calcula cartera, solo sigue precios).
export function useWatchQuotes({ symbols }) {
  const [quotes, setQuotes] = useState({})
  const [rates, setRates] = useState({ MEP: null, CCL: null })
  const [quotesError, setQuotesError] = useState(false)
  const pushToast = useToast()

  const symbolsKey = useMemo(() => symbols.filter(Boolean).sort().join('|'), [symbols])

  useEffect(() => {
    const list = symbols.filter(Boolean)
    if (list.length === 0) return
    let cancelled = false
    supabase.functions
      .invoke('quotes', { body: { symbols: list } })
      .then(({ data }) => {
        if (cancelled || !data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
      })
      .catch(() => {
        if (!cancelled) setQuotesError(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey])

  const refreshQuotes = () => {
    const list = symbols.filter(Boolean)
    if (list.length === 0) return
    supabase.functions
      .invoke('quotes', { body: { symbols: list } })
      .then(({ data }) => {
        if (!data) return
        setQuotesError(false)
        setQuotes(data.quotes || {})
        setRates((r) => ({ ...r, ...(data.rates || {}) }))
        pushToast({ type: 'success', message: 'Precios actualizados' })
      })
      .catch(() => {
        setQuotesError(true)
        pushToast({ type: 'error', message: 'No se pudieron actualizar los precios' })
      })
  }

  return { quotes, rates, refreshQuotes, quotesError }
}
