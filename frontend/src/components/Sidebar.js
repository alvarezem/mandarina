import { useState } from 'react'

export const NAV_ITEMS = [
  {
    key: 'costos',
    label: 'Costos',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    key: 'inversiones',
    label: 'Inversiones',
    soon: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
  },
]

export function Logo({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 font-bold text-white shadow-md shadow-teal-500/30 ${className}`}
    >
      F
    </div>
  )
}

export default function Sidebar({ view, onNavigate, onGoHome }) {
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem('fimplify-rail-expanded') === 'true',
  )

  const toggle = () => {
    setExpanded((prev) => {
      localStorage.setItem('fimplify-rail-expanded', String(!prev))
      return !prev
    })
  }

  return (
    <nav
      aria-label="Navegación"
      className={`hidden shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-white py-3 transition-all duration-300 lg:flex dark:border-slate-800 dark:bg-slate-900 ${
        expanded ? 'w-52 items-stretch px-3' : 'w-16'
      }`}
    >
      <button
        type="button"
        onClick={onGoHome}
        aria-label="Ir al inicio"
        title="Fimplify"
        className="mb-2 flex items-center justify-center rounded-lg transition hover:opacity-85"
      >
        {expanded ? (
          <span className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-base" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">fimplify</span>
          </span>
        ) : (
          <Logo className="h-8 w-8 text-base" />
        )}
      </button>

      {NAV_ITEMS.map((item) => {
        const active = view === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            title={item.soon ? `${item.label} (próximamente)` : item.label}
            className={`relative flex h-10 items-center gap-3 rounded-xl transition active:scale-[0.98] ${
              expanded ? 'w-full px-3 justify-start' : 'w-10 justify-center'
            } ${
              active
                ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-500/30'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {item.icon}
            {expanded && (
              <span className="truncate text-sm font-medium">{item.label}</span>
            )}
            {item.soon && (
              <span
                className={`absolute h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 ${
                  expanded ? 'right-3 top-1.5' : '-right-0.5 -top-0.5'
                }`}
              />
            )}
          </button>
        )
      })}

      <button
        type="button"
        onClick={toggle}
        aria-label={expanded ? 'Colapsar barra' : 'Expandir barra'}
        title={expanded ? 'Colapsar barra' : 'Expandir barra'}
        className="mt-auto flex h-8 w-full items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
    </nav>
  )
}
