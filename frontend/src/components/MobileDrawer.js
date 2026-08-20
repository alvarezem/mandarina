import { useEffect } from 'react'
import { Logo, NAV_ITEMS } from './Sidebar'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'
import LangToggle from './LangToggle'

export default function MobileDrawer({
  open,
  onClose,
  view,
  onNavigate,
  userEmail,
  onSignOut,
  isPro,
}) {
  const { lang } = useLang()
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label={t(lang, 'shell.closeMenu')}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      />
      <nav
        aria-label={t(lang, 'nav.aria.mobile')}
        className="absolute inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl shadow-slate-950/20 animate-slide-in-left dark:bg-slate-900 dark:shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <div>
              <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Mandarina
              </span>
              <span className="block text-xs text-slate-400 dark:text-slate-500">
                {t(lang, 'shell.tagline')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'shell.closeMenu')}
            title={t(lang, 'shell.closeMenu')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700 active:scale-[0.98] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const locked = item.key === 'reportes' && !isPro
            const active = view === item.key && !locked
            const label = t(lang, item.label)
            if (locked) {
              return (
                <div
                  key={item.key}
                  aria-disabled="true"
                  title={`${label} — ${t(lang, 'pro.navTitle')}`}
                  data-tour={item.key}
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-slate-400 opacity-50 saturate-50 dark:text-slate-500"
                >
                  {item.icon}
                  <span className="flex flex-col">
                    <span className="truncate text-sm font-medium">{label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-orange-500 dark:text-orange-400">
                      {t(lang, 'pro.navHint')}
                    </span>
                  </span>
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
                data-tour={item.key}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition active:scale-[0.98] ${
                  active
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-500/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="truncate text-sm font-medium">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          {userEmail && (
            <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
              {userEmail}
            </span>
          )}
          <div className="mt-2 flex justify-end">
            <LangToggle />
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-2 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t(lang, 'shell.signOut')}
          </button>
        </div>
      </nav>
    </div>
  )
}
