import { useEffect, useState } from 'react'
import './App.css'
import supabase from './lib/supabaseClient'
import Auth from './components/Auth'
import UploadSummaries from './components/UploadSummaries'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

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
    <div className="app">
      <header className="app-header">
        <span className="app-brand">Fimplify</span>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <UploadSummaries
            session={session}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
        <main className="content">
          <Dashboard summaryId={selectedId} />
        </main>
      </div>
    </div>
  ) : (
    <Auth />
  )
}

export default App