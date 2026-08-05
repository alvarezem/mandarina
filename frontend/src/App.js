import { useEffect, useState } from 'react'
import supabase from './lib/supabaseClient'
import Auth from './components/Auth'
import UploadSummaries from './components/UploadSummaries'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-base font-bold text-white">
        F
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Fimplify
      </span>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('fimplify-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('fimplify-theme', dark ? 'dark' : 'light')
  }, [dark])

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

  if (!session) return <Auth dark={dark} onToggleTheme={() => setDark((d) => !d)} />

  const selectSummary = (id) => {
    setSelectedId(id)
    setSidebarOpen(false)
  }

  const sidebar = (
    <UploadSummaries
      session={session}
      selectedId={selectedId}
      onSelect={selectSummary}
      onDataChanged={() => setRefreshKey((k) => k + 1)}
    />
  )

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir resúmenes"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <Brand />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
          <span className="hidden max-w-48 truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
            {session.user.email}
          </span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
          {sidebar}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Dashboard summaryId={selectedId} dark={dark} refreshKey={refreshKey} />
        </main>
      </div>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-80 max-w-[85%] overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-900 lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Resúmenes
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebar}
          </aside>
        </>
      )}
    </div>
  )
}

export default App
