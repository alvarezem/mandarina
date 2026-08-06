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
  {
    key: 'resumenes',
    label: 'Resúmenes',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
]

export function Logo({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="13.5" r="7.5" fill="#f97316" />
      <circle cx="9.7" cy="11" r="1.7" fill="#fdba74" opacity="0.65" />
      <circle cx="14.1" cy="15.3" r="1.1" fill="#fdba74" opacity="0.55" />
      <path d="M12 6.6C10 4.2 7.4 4.6 6.6 5.8 7.8 7.6 10.4 7.2 12 6.6Z" fill="#22c55e" />
      <path d="M12 6.6C14 4.2 16.6 4.6 17.4 5.8 16.2 7.6 13.6 7.2 12 6.6Z" fill="#22c55e" />
    </svg>
  )
}

export default function Sidebar({ view, onNavigate, expanded }) {
  return (
    <nav
      aria-label="Navegación"
      className={`hidden shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-slate-50 py-3 transition-all duration-300 lg:flex dark:border-slate-800 dark:bg-slate-900 ${
        expanded ? 'w-52 items-stretch px-3' : 'w-16'
      }`}
    >
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
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-500/30'
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
    </nav>
  )
}
