import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

export const NAV_ITEMS = [
  {
    key: 'resumenes',
    label: 'nav.item.resumenes',
    icon: (
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
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    key: 'inversiones',
    label: 'nav.item.inversiones',
    icon: (
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
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    key: 'reportes',
    label: 'reports.nav.item',
    icon: (
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
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    ),
  },
]

export function Logo({ className = '' }) {
  return (
    <img
      src={`/logo.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`object-contain ${className}`}
    />
  )
}

export default function Sidebar({ view, onNavigate, expanded, isPro }) {
  const { lang } = useLang()
  const labelFor = (item) => t(lang, item.label)
  return (
    <nav
      aria-label={t(lang, 'nav.aria')}
      className={`hidden shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-slate-50 py-3 transition-all duration-300 lg:flex dark:border-slate-800 dark:bg-slate-900 ${
        expanded ? 'w-52 items-stretch px-3' : 'w-16'
      }`}
    >
      {NAV_ITEMS.map((item) => {
        const locked = item.key === 'reportes' && !isPro
        const active = view === item.key && !locked
        const label = labelFor(item)
        if (locked) {
          return (
            <div
              key={item.key}
              aria-disabled="true"
              title={`${label} — ${t(lang, 'pro.navTitle')}`}
              data-tour={item.key}
              className={`relative flex items-center gap-3 rounded-xl opacity-50 saturate-50 ${
                expanded ? 'w-full px-3 justify-start' : 'w-10 justify-center'
              }`}
            >
              {item.icon}
              {expanded ? (
                <span className="flex flex-col">
                  <span className="truncate text-sm font-medium">{label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-orange-500 dark:text-orange-400">
                    {t(lang, 'pro.navHint')}
                  </span>
                </span>
              ) : (
                <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1 text-[8px] font-bold leading-3 text-white">
                  {t(lang, 'pro.navShort')}
                </span>
              )}
            </div>
          )
        }
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            title={label}
            data-tour={item.key}
            className={`relative flex h-10 items-center gap-3 rounded-xl transition active:scale-[0.98] ${
              expanded ? 'w-full px-3 justify-start' : 'w-10 justify-center'
            } ${
              active
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-500/30'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {item.icon}
            {expanded && <span className="truncate text-sm font-medium">{label}</span>}
          </button>
        )
      })}
    </nav>
  )
}
