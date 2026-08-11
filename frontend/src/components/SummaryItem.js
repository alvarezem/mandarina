import { MONTHS } from '../lib/constants'
import MetaForm from './MetaForm'

const STATUS = {
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  parsing: { label: 'Procesando…', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  done: { label: 'Procesado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
}

function metaLabel(file) {
  const parts = []
  if (file.summary_type) parts.push(file.summary_type)
  if (file.period_month) parts.push(`${MONTHS[file.period_month - 1] ?? file.period_month} ${file.period_year}`)
  return parts.join(' · ')
}

export default function SummaryItem({
  file,
  selectedId,
  onSelect,
  editingId,
  renameDraft,
  onRenameChange,
  submitRename,
  cancelRename,
  startRename,
  confirmingId,
  startDeleteConfirm,
  removeSummary,
  cancelDelete,
  metaEditingId,
  metaDraft,
  onMetaChange,
  submitMeta,
  cancelMetaEdit,
  startMetaEdit,
}) {
  const status = STATUS[file.status] ?? STATUS.pending
  const locked = editingId !== null || metaEditingId !== null
  return (
    <div
      className={`w-full rounded-lg p-2.5 transition ${
        selectedId === file.id
          ? 'bg-brand-50 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:ring-brand-500/30'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
    >
      {editingId === file.id ? (
        <form onSubmit={submitRename} className="flex items-center gap-1.5">
          <input
            value={renameDraft}
            onChange={(e) => onRenameChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelRename()
            }}
            autoFocus
            aria-label="Nombre del resumen"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            aria-label="Guardar nombre"
            className="shrink-0 rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelRename}
            aria-label="Cancelar"
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => onSelect(file.id)} className="min-w-0 flex-1 text-left">
              <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {file.file_name}
              </span>
            </button>
            {confirmingId === file.id ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Borrar?</span>
                <button
                  type="button"
                  onClick={() => removeSummary(file)}
                  className="rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startDeleteConfirm(file)}
                  disabled={locked}
                  aria-label={`Eliminar ${file.file_name}`}
                  title="Eliminar"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.327L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => startRename(file)}
                  disabled={locked}
                  aria-label={`Renombrar ${file.file_name}`}
                  title="Renombrar"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
              </>
            )}
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
            >
              {file.status === 'parsing' && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              )}
              {status.label}
            </span>
          </div>
          {file.status === 'error' && file.error && (
            <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">{file.error}</p>
          )}
          {metaEditingId === file.id ? (
            <MetaForm draft={metaDraft} onChange={onMetaChange} onSubmit={submitMeta} onCancel={cancelMetaEdit} />
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => startMetaEdit(file)}
                disabled={locked}
                aria-label={`Clasificar ${file.file_name}`}
                title="Clasificar"
                className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-brand-400"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              </button>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  metaLabel(file)
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {metaLabel(file) || 'Sin clasificar'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}