import { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { isProActive } from '../lib/subscriptions'

// Context del tier Pro. `ProProvider` consulta la tabla `subscriptions` del
// usuario (RLS own) y expone `isPro` + `loading` + `subscription` (fila completa,
// para fechas como `current_period_end`). El gating de la feature Reportes vive
// en Sidebar/MobileDrawer (ocultar item) y en App (upsell).
const ProContext = createContext({ isPro: false, loading: true, subscription: null })

export function ProProvider({ userId, children }) {
  const [isPro, setIsPro] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(userId))

  // Ajuste en render (patrón de App.js): al cambiar de usuario se resetea el
  // estado sin setState síncrono en el effect. Sin userId no hay fetch.
  const [prevUserId, setPrevUserId] = useState(null)
  if (userId !== prevUserId) {
    setPrevUserId(userId)
    setSubscription(null)
    setLoading(Boolean(userId))
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return
        const row = Array.isArray(data) ? data[0] : null
        setSubscription(row)
        setIsPro(isProActive(row))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSubscription(null)
        setIsPro(false)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <ProContext.Provider value={{ isPro, loading, subscription }}>{children}</ProContext.Provider>
  )
}

export function usePro() {
  return useContext(ProContext)
}
