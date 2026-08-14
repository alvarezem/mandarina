import { useEffect, useRef, useState } from 'react'
import supabase from './lib/supabaseClient'
import { useTheme } from './hooks/useTheme'
import Auth from './components/Auth'
import NewPasswordScreen from './components/NewPasswordScreen'
import ResumenesView from './components/ResumenesView'
import InvestmentsView from './components/InvestmentsView'
import ThemeToggle from './components/ThemeToggle'
import Sidebar, { Logo, NAV_ITEMS } from './components/Sidebar'
import ToastProvider, { useToast } from './components/Toast'
import OnboardingTour from './components/OnboardingTour'

const VIEW_TITLES = { resumenes: 'Resúmenes', inversiones: 'Inversiones' }

const TOUR_VERSION = 1
const tourSeenKey = (userId) => `mandarina:tour:${userId}`

const isFirstLogin = (user) => {
  if (!user?.last_sign_in_at) return true
  const created = new Date(user.created_at).getTime()
  const last = new Date(user.last_sign_in_at).getTime()
  return !Number.isFinite(created) || !Number.isFinite(last) || last - created < 60_000
}

async function pushTopPositions(pushToast) {
  try {
    const { data: plan, error } = await supabase
      .from('portfolio_plan')
      .select('*')
      .order('target_weight', { ascending: false })
      .limit(3)
    if (error || !Array.isArray(plan) || plan.length === 0) return
    const symbols = plan.map((i) => i.symbol).filter(Boolean)
    if (symbols.length === 0) return
    const { data } = await supabase.functions.invoke('quotes', { body: { symbols } })
    const quotes = data?.quotes || {}
    const parts = plan
      .map((i) => {
        const q = quotes[i.symbol]
        if (!q?.price) return null
        const pct = q.changePct
        const arrow =
          pct == null
            ? '—'
            : pct >= 0
              ? `▲${Math.abs(pct).toFixed(2)}%`
              : `▼${Math.abs(pct).toFixed(2)}%`
        const tone = pct == null ? 'neutral' : pct >= 0 ? 'up' : 'down'
        return { text: `${i.symbol} ${arrow}`, tone }
      })
      .filter(Boolean)
    if (parts.length === 0) return
    const msg = `Tus posiciones: ${parts.map((p) => p.text).join(' · ')}`
    pushToast({
      type: 'info',
      icon: 'trend',
      message: msg,
      segments: [
        { text: 'Tus posiciones: ' },
        ...parts.map((p, i) => ({ text: `${i === 0 ? '' : ' · '}${p.text}`, tone: p.tone })),
      ],
    })
  } catch {
    // silencioso: no hay plan, sin precios o error de red
  }
}

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/40">
      <Logo className="h-14 w-14 animate-pulse" />
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [dark, setDark] = useTheme()

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch(() => {
        setSession(null)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        setRecovery(false)
      }
      if (event === 'SIGNED_IN' && session) {
        setGreeting(isFirstLogin(session.user) ? 'first' : 'return')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <BootSplash />

  return (
    <ToastProvider>
      <AppContent
        session={session}
        dark={dark}
        setDark={setDark}
        greeting={greeting}
        setGreeting={setGreeting}
        recovery={recovery}
      />
    </ToastProvider>
  )
}

function AppContent({ session, dark, setDark, greeting, setGreeting, recovery }) {
  const pushToast = useToast()
  const [view, setView] = useState('resumenes')
  const [selectedId, setSelectedId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [railExpanded, setRailExpanded] = useState(() => {
    const stored =
      localStorage.getItem('mandarina-rail-expanded') ??
      localStorage.getItem('mandarine-rail-expanded') ??
      localStorage.getItem('fimplify-rail-expanded')
    return stored ? stored === 'true' : true
  })
  const mainRef = useRef(null)

  const [tourOpen, setTourOpen] = useState(false)

  // Ajuste en render (patrón de React): abre el tour cuando llega el id de
  // sesión y el usuario aún no lo vio, sin setState síncrono en el effect.
  const tourUserId = session?.user?.id ?? null
  const [prevSessionId, setPrevSessionId] = useState(null)
  if (tourUserId !== prevSessionId) {
    setPrevSessionId(tourUserId)
    if (tourUserId && localStorage.getItem(tourSeenKey(tourUserId)) !== String(TOUR_VERSION)) {
      setTourOpen(true)
    }
  }

  const closeTour = () => {
    if (session?.user?.id) localStorage.setItem(tourSeenKey(session.user.id), String(TOUR_VERSION))
    setTourOpen(false)
  }

  useEffect(() => {
    if (!greeting) return
    pushToast({
      type: 'success',
      icon: greeting === 'first' ? 'wave' : 'none',
      message: greeting === 'first' ? '¡Bienvenido/a a Mandarina!' : '¡Volviste! 😂',
    })
    if (session) pushTopPositions(pushToast)
    setGreeting(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting])

  const toggleRail = () => {
    setRailExpanded((prev) => {
      localStorage.setItem('mandarina-rail-expanded', String(!prev))
      return !prev
    })
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      pushToast({ type: 'success', icon: 'wave', message: '¡Nos vemos!' })
    } catch {
      pushToast({ type: 'error', message: 'No se pudo cerrar la sesión' })
    }
  }

  if (session && recovery) {
    return <NewPasswordScreen dark={dark} onToggleTheme={() => setDark((d) => !d)} />
  }

  if (!session) return <Auth dark={dark} onToggleTheme={() => setDark((d) => !d)} />

  const navigate = (key) => {
    setView(key)
    mainRef.current?.scrollTo?.({ top: 0 })
  }

  const goHome = () => {
    setView('resumenes')
    setSelectedId(null)
    setResetKey((k) => k + 1)
    mainRef.current?.scrollTo?.({ top: 0 })
  }

  const selectSummary = (id) => {
    setSelectedId(id)
    setView('resumenes')
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/40 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/40 dark:text-slate-100">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:px-6">
        <div className="-ml-4 hidden items-center gap-1 lg:flex sm:-ml-6">
          <div className="flex w-16 shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={toggleRail}
              aria-label={railExpanded ? 'Colapsar barra' : 'Expandir barra'}
              title={railExpanded ? 'Colapsar barra' : 'Expandir barra'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 active:scale-[0.98] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={goHome}
            aria-label="Ir al inicio"
            title="Mandarina"
            className="flex items-center gap-2 rounded-lg px-1 transition hover:opacity-85"
          >
            <Logo className="h-8 w-8" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mandarina</span>
          </button>
          <span className="hidden border-l border-slate-200 pl-3 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500 xl:block">
            a tu plata, sacale todo el jugo
          </span>
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 lg:hidden">
          {VIEW_TITLES[view]}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            aria-label="Ver guía"
            title="Ver guía de Mandarina"
            data-tour="help"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </button>
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
        <Sidebar view={view} onNavigate={navigate} expanded={railExpanded} />

        <main
          ref={mainRef}
          className={`flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8 ${tourOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          <div key={view}>
            {view === 'inversiones' ? (
              <InvestmentsView session={session} />
            ) : (
              <ResumenesView
                session={session}
                summaryId={selectedId}
                dark={dark}
                refreshKey={refreshKey}
                resetKey={resetKey}
                onSelect={selectSummary}
                onDataChanged={() => setRefreshKey((k) => k + 1)}
              />
            )}
          </div>
        </main>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-slate-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-2 items-stretch pt-5">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                aria-current={active ? 'page' : undefined}
                data-tour={item.key}
                className={`flex flex-col items-center justify-center gap-0.5 pb-2 active:scale-[0.98] ${
                  active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-slate-400'
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
            <Logo className="h-9 w-9" />
          </button>
        </div>
      </nav>

      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </div>
  )
}

export default App
