import { useCallback, useEffect, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useToast } from './Toast'
import { sanitizeStoragePath, uniqueStoragePath } from '../lib/sanitizeFileName'

const STATUS = {
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  parsing: { label: 'Procesando…', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  done: { label: 'Procesado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
}

const TYPES = ['VISA', 'MASTERCARD', 'AMEX', 'Banco', 'Billetera virtual', 'Broker', 'Otro']

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const NOW_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 8 }, (_, i) => NOW_YEAR - 6 + i)

export default function UploadSummaries({ session, selectedId, onSelect, onDataChanged }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [metaEditingId, setMetaEditingId] = useState(null)
  const [metaDraft, setMetaDraft] = useState({ type: '', month: 1, year: 2026 })
  const pushToast = useToast()

  const loadSummaries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('card_summaries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setFiles(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  const parse = async (summaryId) => {
    try {
      await supabase.functions.invoke('parse-summary', { body: { summary_id: summaryId } })
    } catch {
      setError('No se pudo iniciar el procesamiento del archivo')
      pushToast({ type: 'error', message: 'No se pudo iniciar el procesamiento del archivo' })
    }
    await loadSummaries()
  }

  const friendlyUploadError = (error) => {
    const msg = String(error?.message ?? '')
    if (/invalid.?key|invalid characters/i.test(msg)) {
      return 'El nombre del archivo tiene caracteres no permitidos'
    }
    if (/already.?exists|already_exists/i.test(msg)) {
      return 'Ya existe un resumen con ese nombre en tu cuenta'
    }
    return msg || 'No se pudo subir el archivo'
  }

  const handleUpload = async (file) => {
    if (!file || uploading) return
    setUploading(true)
    setError(null)

    const existingPaths = (files ?? []).map((f) => f.file_path).filter(Boolean)
    const path = uniqueStoragePath(session.user.id, file.name, existingPaths)
    const renamed = path !== sanitizeStoragePath(session.user.id, file.name)
    const { error: uploadError } = await supabase.storage
      .from('card-resumes')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      const friendly = friendlyUploadError(uploadError)
      setError(friendly)
      pushToast({ type: 'error', message: friendly })
      setUploading(false)
      return
    }

    const { data: summary, error: insertError } = await supabase
      .from('card_summaries')
      .insert({
        user_id: session.user.id,
        file_name: file.name,
        file_path: path,
      })
      .select()
      .single()

    setUploading(false)
    if (insertError) {
      setError(insertError.message)
      pushToast({ type: 'error', message: insertError.message })
    } else {
      const successMsg = renamed
        ? `Resumen ${file.name} subido como ${path.split('/').pop()} (ya existía un archivo con ese nombre)`
        : `Resumen ${file.name} subido`
      pushToast({ type: 'success', message: successMsg })
      await loadSummaries()
      await parse(summary.id)
      onDataChanged?.()
    }
  }

  const countLabel = files.length === 1 ? '1 resumen' : `${files.length} resúmenes`

  const startRename = (file) => {
    setEditingId(file.id)
    setConfirmingId(null)
    setDraft(file.file_name)
  }

  const cancelRename = () => {
    setEditingId(null)
    setDraft('')
  }

  const startDeleteConfirm = (file) => {
    setConfirmingId(file.id)
    setEditingId(null)
    setDraft('')
  }

  const removeSummary = async (file) => {
    setConfirmingId(null)
    if (file.file_path) {
      await supabase.storage.from('card-resumes').remove([file.file_path])
    }
    const { error } = await supabase.from('card_summaries').delete().eq('id', file.id)
    if (error) {
      pushToast({ type: 'error', message: error.message })
      return
    }
    if (selectedId === file.id) onSelect?.(null)
    onDataChanged?.()
    await loadSummaries()
    pushToast({ type: 'success', message: `Resumen ${file.file_name} eliminado` })
  }

  const saveRename = async () => {
    const id = editingId
    if (id === null) return
    const name = draft.trim()
    setEditingId(null)
    setDraft('')
    if (!name || name.length > 100) return
    const original = files.find((f) => f.id === id)
    if (!original || name === original.file_name) return

    const { error } = await supabase.from('card_summaries').update({ file_name: name }).eq('id', id)
    if (error) {
      pushToast({ type: 'error', message: error.message })
      return
    }
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, file_name: name } : f)))
    pushToast({ type: 'success', message: 'Nombre actualizado' })
  }

  const submitRename = (e) => {
    e.preventDefault()
    saveRename()
  }

  const startMetaEdit = (file) => {
    const now = new Date()
    setEditingId(null)
    setConfirmingId(null)
    setMetaEditingId(file.id)
    setMetaDraft({
      type: file.summary_type ?? '',
      month: file.period_month ?? now.getMonth() + 1,
      year: file.period_year ?? now.getFullYear(),
    })
  }

  const cancelMetaEdit = () => {
    setMetaEditingId(null)
    setMetaDraft({ type: '', month: 1, year: 2026 })
  }

  const saveMeta = async () => {
    const id = metaEditingId
    if (id === null) return
    setMetaEditingId(null)
    const original = files.find((f) => f.id === id)
    if (!original) return

    const payload = {
      summary_type: metaDraft.type || null,
      period_month: metaDraft.month,
      period_year: metaDraft.year,
    }
    const { error } = await supabase.from('card_summaries').update(payload).eq('id', id)
    if (error) {
      pushToast({ type: 'error', message: error.message })
      return
    }
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...payload } : f)))
    pushToast({ type: 'success', message: 'Clasificación actualizada' })
  }

  const submitMeta = (e) => {
    e.preventDefault()
    saveMeta()
  }

  const metaLabel = (file) => {
    const parts = []
    if (file.summary_type) parts.push(file.summary_type)
    if (file.period_month) parts.push(`${MONTHS[file.period_month - 1] ?? file.period_month} ${file.period_year}`)
    return parts.join(' · ')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="group flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-brand-500 hover:bg-brand-50/50 active:scale-[0.98] disabled:opacity-60 dark:border-slate-700 dark:hover:bg-brand-950/30"
        >
          {uploading ? (
            <span className="mb-1 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-600 dark:border-t-brand-500" />
          ) : (
            <svg
              className="mb-1 h-6 w-6 text-slate-400 transition group-hover:text-brand-600 dark:text-slate-500 dark:group-hover:text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.6}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {uploading ? 'Subiendo…' : 'Subir resumen'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">PDF, CSV o XLSX</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Resúmenes
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">{files.length > 0 ? countLabel : ''}</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800">
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-1.5 h-2 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No subiste resúmenes todavía.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            <li>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className={`w-full rounded-lg p-2.5 text-left transition ${
                  selectedId === null
                    ? 'bg-brand-50 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:ring-brand-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    Todos los resúmenes
                  </span>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                    {files.length}
                  </span>
                </div>
              </button>
            </li>
            {files.map((f) => {
              const status = STATUS[f.status] ?? STATUS.pending
              return (
                <li key={f.id}>
                  <div
                    className={`w-full rounded-lg p-2.5 transition ${
                      selectedId === f.id
                        ? 'bg-brand-50 ring-1 ring-brand-600/20 dark:bg-brand-950/40 dark:ring-brand-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {editingId === f.id ? (
                      <form onSubmit={submitRename} className="flex items-center gap-1.5">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
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
                          <button type="button" onClick={() => onSelect(f.id)} className="min-w-0 flex-1 text-left">
                            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                              {f.file_name}
                            </span>
                          </button>
                          {confirmingId === f.id ? (
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Borrar?</span>
                              <button
                                type="button"
                                onClick={() => removeSummary(f)}
                                className="rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                Cancelar
                              </button>
                            </span>
                          ) : (
                            <>
                          <button
                            type="button"
                            onClick={() => startDeleteConfirm(f)}
                            disabled={editingId !== null || metaEditingId !== null}
                            aria-label={`Eliminar ${f.file_name}`}
                            title="Eliminar"
                            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-2.327L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => startRename(f)}
                            disabled={editingId !== null || metaEditingId !== null}
                            aria-label={`Renombrar ${f.file_name}`}
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
                            {f.status === 'parsing' && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            )}
                            {status.label}
                          </span>
                        </div>
                        {f.status === 'error' && f.error && (
                          <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">{f.error}</p>
                        )}
                        {metaEditingId === f.id ? (
                          <form onSubmit={submitMeta} className="mt-2 flex flex-wrap items-center gap-1.5">
                            <select
                              value={metaDraft.type}
                              onChange={(e) => setMetaDraft((d) => ({ ...d, type: e.target.value }))}
                              aria-label="Tipo de resumen"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              <option value="">Tipo…</option>
                              {TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <select
                              value={metaDraft.month}
                              onChange={(e) => setMetaDraft((d) => ({ ...d, month: Number(e.target.value) }))}
                              aria-label="Mes del período"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={metaDraft.year}
                              onChange={(e) => setMetaDraft((d) => ({ ...d, year: Number(e.target.value) }))}
                              aria-label="Año del período"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              aria-label="Guardar clasificación"
                              className="shrink-0 rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={cancelMetaEdit}
                              aria-label="Cancelar clasificación"
                              className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </form>
                        ) : (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startMetaEdit(f)}
                              disabled={editingId !== null || metaEditingId !== null}
                              aria-label={`Clasificar ${f.file_name}`}
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
                                metaLabel(f)
                                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              {metaLabel(f) || 'Sin clasificar'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
