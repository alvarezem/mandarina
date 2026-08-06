import { useCallback, useEffect, useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useToast } from './Toast'

const STATUS = {
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  parsing: { label: 'Procesando…', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  done: { label: 'Procesado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
}

export default function UploadSummaries({ session, selectedId, onSelect, onDataChanged }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
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

  const handleUpload = async (file) => {
    if (!file || uploading) return
    setUploading(true)
    setError(null)

    const path = `${session.user.id}/${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('card-resumes')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      pushToast({ type: 'error', message: uploadError.message })
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
      pushToast({ type: 'success', message: `Resumen ${file.name} subido` })
      await loadSummaries()
      await parse(summary.id)
      onDataChanged?.()
    }
  }

  const countLabel = files.length === 1 ? '1 resumen' : `${files.length} resúmenes`

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="group flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-teal-500 hover:bg-teal-50/50 active:scale-[0.98] disabled:opacity-60 dark:border-slate-700 dark:hover:bg-teal-950/30"
        >
          {uploading ? (
            <span className="mb-1 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600 dark:border-slate-600 dark:border-t-teal-500" />
          ) : (
            <svg
              className="mb-1 h-6 w-6 text-slate-400 transition group-hover:text-teal-600 dark:text-slate-500 dark:group-hover:text-teal-400"
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
                    ? 'bg-teal-50 ring-1 ring-teal-600/20 dark:bg-teal-950/40 dark:ring-teal-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    Todos los resúmenes
                  </span>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    {files.length}
                  </span>
                </div>
              </button>
            </li>
            {files.map((f) => {
              const status = STATUS[f.status] ?? STATUS.pending
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(f.id)}
                    className={`w-full rounded-lg p-2.5 text-left transition ${
                      selectedId === f.id
                        ? 'bg-teal-50 ring-1 ring-teal-600/20 dark:bg-teal-950/40 dark:ring-teal-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {f.file_name}
                      </span>
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
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
