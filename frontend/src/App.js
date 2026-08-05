import { useEffect, useRef, useState } from 'react'
import supabase from './lib/supabaseClient'
import Auth from './components/Auth'
import UploadSummaries from './components/UploadSummaries'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'
import Sidebar, { Logo, NAV_ITEMS } from './components/Sidebar'

const VIEW_TITLES = { costos: 'Costos', inversiones: 'Inversiones' }

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
          />
        </svg>
      </div>
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Próximamente.</p>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('costos')
  const [selectedId, setSelectedId] = useState(null)
  const [mobileSummariesOpen, setMobileSummariesOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const mainRef = useRef(null)
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

  const navigate = (key) => {
    setView(key)
    setMobileSummariesOpen(false)
  }

  const goHome = () => {
    setView('costos')
    setSelectedId(null)
    setMobileSummariesOpen(false)
    setResetKey((k) => k + 1)
    mainRef.current?.scrollTo({ top: 0 })
  }

  const selectSummary = (id) => {
    setSelectedId(id)
    setMobileSummariesOpen(false)
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/60 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/40 dark:text-slate-100">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/70 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:px-6">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {VIEW_TITLES[view]}
        </span>
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
        <Sidebar view={view} onNavigate={navigate} onGoHome={goHome} />

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80 lg:block">
          {sidebar}
        </aside>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {view === 'costos' ? (
            <Dashboard
              summaryId={selectedId}
              dark={dark}
              refreshKey={refreshKey}
              resetKey={resetKey}
              onSummarySelect={selectSummary}
            />
          ) : (
            <ComingSoon title="Inversiones" />
          )}
        </main>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          <button
            type="button"
            onClick={goHome}
            aria-label="Ir al inicio"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 dark:text-slate-400"
          >
            <Logo className="h-6 w-6 rounded-md text-xs" />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          {NAV_ITEMS.map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
                  active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setMobileSummariesOpen(true)}
            aria-label="Resúmenes"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 dark:text-slate-400"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-[10px] font-medium">Resúmenes</span>
          </button>
        </div>
      </nav>

      {mobileSummariesOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSummariesOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85%] overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-900 lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Resúmenes</span>
              <button
                type="button"
                onClick={() => setMobileSummariesOpen(false)}
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
