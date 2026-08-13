import { useState } from 'react'
import Dashboard from './Dashboard'
import UploadSummaries from './UploadSummaries'
import SummaryDetailModal from './SummaryDetailModal'

const TABS = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'egresos', label: 'Egresos' },
  { key: 'resumenes', label: 'Resúmenes' },
]

export default function ResumenesView({
  session,
  dark,
  summaryId,
  refreshKey,
  resetKey,
  onSelect,
  onDataChanged,
}) {
  const [tab, setTab] = useState('egresos')
  const [detail, setDetail] = useState(null)

  return (
    <div className="animate-fade-in-up">
      <div
        role="tablist"
        aria-label="Secciones de resúmenes"
        className="mb-4 inline-flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:w-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            data-tour={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
              tab === t.key
                ? 'bg-brand-600 text-white dark:bg-brand-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'ingresos' || tab === 'egresos') && (
        <Dashboard
          session={session}
          summaryId={summaryId}
          dark={dark}
          refreshKey={refreshKey}
          resetKey={resetKey}
          onSummarySelect={onSelect}
          mode={tab}
        />
      )}

      {tab === 'resumenes' && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 text-center sm:text-left">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Resúmenes
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Tus números, sin cáscara
            </p>
          </div>
          <UploadSummaries
            session={session}
            selectedId={summaryId}
            onSelect={onSelect}
            onDataChanged={onDataChanged}
            onOpenDetail={(file) => setDetail({ id: file.id, file_name: file.file_name })}
          />
        </div>
      )}

      {detail && (
        <SummaryDetailModal
          file={detail}
          session={session}
          dark={dark}
          refreshKey={refreshKey}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
