import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Dashboard from './Dashboard'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

const MODES = [{ key: 'egresos' }, { key: 'ingresos' }]

export default function SummaryDetailModal({ file, session, dark, refreshKey, onClose }) {
  const { lang } = useLang()
  const [mode, setMode] = useState('egresos')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        data-testid="summary-modal-backdrop"
      />
      <div className="relative h-full overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(lang, 'summaryDetail.aria', { name: file.file_name })}
            className="relative my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {file.file_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(lang, 'summaryDetail.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(lang, 'summaryDetail.close')}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              role="tablist"
              aria-label={t(lang, 'summaryDetail.modeAria')}
              className="mb-4 inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:w-auto"
            >
              {MODES.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.key}
                  onClick={() => setMode(tab.key)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
                    mode === tab.key
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {t(lang, `summary.tabs.${tab.key}`)}
                </button>
              ))}
            </div>

            <Dashboard
              session={session}
              summaryId={file.id}
              dark={dark}
              refreshKey={refreshKey}
              mode={mode}
              hideSummaryFilter
              compact
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
