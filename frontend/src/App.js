import { useEffect, useState } from 'react'
import './App.css'
import supabase from './lib/supabaseClient'
import Auth from './components/Auth'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return session ? (
    <div>
      <p>Bienvenido</p>
      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  ) : (
    <Auth />
  )
}

export default App