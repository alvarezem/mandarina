import { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

// Context del panel de administración. `AdminProvider` consulta la tabla
// `admins` (RLS select own) y expone `isAdmin` + `loading`. Gating del item
// "Admin" en Sidebar/MobileDrawer + branch defensivo en App.
const AdminContext = createContext({ isAdmin: false, loading: true })

export function AdminProvider({ userId, children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(() => Boolean(userId))

  // Ajuste en render (patrón de App.js): al cambiar de usuario se resetea el
  // estado sin setState síncrono en el effect. Sin userId no hay fetch.
  const [prevUserId, setPrevUserId] = useState(null)
  if (userId !== prevUserId) {
    setPrevUserId(userId)
    setIsAdmin(false)
    setLoading(Boolean(userId))
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return
        setIsAdmin(Array.isArray(data) && data.length > 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setIsAdmin(false)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return <AdminContext.Provider value={{ isAdmin, loading }}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  return useContext(AdminContext)
}
