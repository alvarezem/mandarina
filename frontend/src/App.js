import { useEffect, useRef, useState } from 'react'
import supabase from './lib/supabaseClient'
import Auth from './components/Auth'
import UploadSummaries from './components/UploadSummaries'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'
import Sidebar, { Logo, NAV_ITEMS } from './components/Sidebar'
import ToastProvider, { useToast } from './components/Toast'

const VIEW_TITLES = { costos: 'Costos', inversiones: 'Inversiones', resumenes: 'Resúmenes' }

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/40">
      <Logo className="h-14 w-14 animate-pulse text-2xl" />
    </div>
  )
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20">
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

  if (loading) return <BootSplash />

  return (
    <ToastProvider>
      <AppContent session={session} dark={dark} setDark={setDark} />
    </ToastProvider>
  )
}

function AppContent({ session, dark, setDark }) {
  const pushToast = useToast()
  const [view, setView] = useState('costos')
  const [selectedId, setSelectedId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const mainRef = useRef(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    pushToast({ type: 'info', message: 'Sesión cerrada' })
  }

  if (!session) return <Auth dark={dark} onToggleTheme={() => setDark((d) => !d)} />

  const navigate = (key) => {
    setView(key)
    mainRef.current?.scrollTo?.({ top: 0 })
  }

  const goHome = () => {
    setView('costos')
    setSelectedId(null)
    setResetKey((k) => k + 1)
    mainRef.current?.scrollTo?.({ top: 0 })
  }

  const selectSummary = (id) => {
    setSelectedId(id)
    setView('costos')
  }

  const summariesView = (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      <UploadSummaries
        session={session}
        selectedId={selectedId}
        onSelect={selectSummary}
        onDataChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/40 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/40 dark:text-slate-100">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:px-6">
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
            onClick={handleSignOut}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onNavigate={navigate} onGoHome={goHome} />

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <div key={view}>
            {view === 'costos' ? (
              <Dashboard
                summaryId={selectedId}
                dark={dark}
                refreshKey={refreshKey}
                resetKey={resetKey}
                onSummarySelect={selectSummary}
              />
            ) : view === 'inversiones' ? (
              <ComingSoon title="Inversiones" />
            ) : (
              summariesView
            )}
          </div>
        </main>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-slate-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-3 items-stretch pt-5">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 pb-2 active:scale-[0.98] ${
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
            onClick={goHome}
            aria-label="Inicio"
            className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          >
            <Logo className="h-9 w-9 rounded-xl text-sm ring-4 ring-slate-100 dark:ring-slate-900" />
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
