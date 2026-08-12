import { useRef, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAsync } from '../hooks/useAsync'
import { useToast } from './Toast'
import { sanitizeStoragePath, uniqueStoragePath } from '../lib/sanitizeFileName'
import SummaryItem from './SummaryItem'

const NOW_YEAR = new Date().getFullYear()

export default function UploadSummaries({ session, selectedId, onSelect, onDataChanged }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [metaEditingId, setMetaEditingId] = useState(null)
  const [metaDraft, setMetaDraft] = useState({ type: '', month: 1, year: NOW_YEAR })
  const pushToast = useToast()

  const {
    data,
    setData: setFiles,
    loading,
    error: loadError,
    reload: reloadSummaries,
  } = useAsync(async () => {
    if (!session?.user?.id) return []
    try {
      const { data, error } = await supabase
        .from('card_summaries')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('UploadSummaries: error al cargar resúmenes', error)
        throw new Error('No se pudieron cargar los resúmenes')
      }
      return data ?? []
    } catch (e) {
      console.error('UploadSummaries: error al cargar resúmenes', e)
      throw new Error('No se pudieron cargar los resúmenes')
    }
  }, [session?.user?.id])
  const files = data ?? []

  const parse = async (summaryId) => {
    try {
      await supabase.functions.invoke('parse-summary', { body: { summary_id: summaryId } })
    } catch {
      setError('No se pudo iniciar el procesamiento del archivo')
      pushToast({ type: 'error', message: 'No se pudo iniciar el procesamiento del archivo' })
    }
    await reloadSummaries()
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

    const existingPaths = files.map((f) => f.file_path).filter(Boolean)
    const path = uniqueStoragePath(session.user.id, file.name, existingPaths)
    const renamed = path !== sanitizeStoragePath(session.user.id, file.name)
    try {
      const { error: uploadError } = await supabase.storage
        .from('card-resumes')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        const friendly = friendlyUploadError(uploadError)
        setError(friendly)
        pushToast({ type: 'error', message: friendly })
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

      if (insertError) {
        console.error('UploadSummaries: error al registrar resumen', insertError)
        const friendly = 'No se pudo registrar el resumen'
        setError(friendly)
        pushToast({ type: 'error', message: friendly })
        return
      }

      const successMsg = renamed
        ? `Resumen ${file.name} subido como ${path.split('/').pop()} (ya existía un archivo con ese nombre)`
        : `Resumen ${file.name} subido`
      pushToast({ type: 'success', message: successMsg })
      await reloadSummaries()
      await parse(summary.id)
      onDataChanged?.()
    } catch (e) {
      console.error('UploadSummaries: error al subir el archivo', e)
      const friendly = 'No se pudo subir el archivo'
      setError(friendly)
      pushToast({ type: 'error', message: friendly })
    } finally {
      setUploading(false)
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
    try {
      if (file.file_path) {
        try {
          await supabase.storage.from('card-resumes').remove([file.file_path])
        } catch {
          // tolerar: el archivo puede no existir o el storage no responder
        }
      }
      const { error } = await supabase.from('card_summaries').delete().eq('id', file.id)
      if (error) {
        console.error('UploadSummaries: error al eliminar resumen', error)
        pushToast({ type: 'error', message: 'No se pudo eliminar el resumen' })
        return
      }
      if (selectedId === file.id) onSelect?.(null)
      onDataChanged?.()
      await reloadSummaries()
      pushToast({ type: 'success', message: `Resumen ${file.file_name} eliminado` })
    } catch (e) {
      console.error('UploadSummaries: error al eliminar resumen', e)
      pushToast({ type: 'error', message: 'No se pudo eliminar el resumen' })
    }
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

    try {
      const { error } = await supabase
        .from('card_summaries')
        .update({ file_name: name })
        .eq('id', id)
      if (error) {
        console.error('UploadSummaries: error al renombrar resumen', error)
        pushToast({ type: 'error', message: 'No se pudo renombrar el resumen' })
        return
      }
      setFiles((list) => (list ?? []).map((f) => (f.id === id ? { ...f, file_name: name } : f)))
      pushToast({ type: 'success', message: 'Nombre actualizado' })
    } catch (e) {
      console.error('UploadSummaries: error al renombrar resumen', e)
      pushToast({ type: 'error', message: 'No se pudo renombrar el resumen' })
    }
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
    setMetaDraft({ type: '', month: 1, year: NOW_YEAR })
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
    try {
      const { error } = await supabase.from('card_summaries').update(payload).eq('id', id)
      if (error) {
        console.error('UploadSummaries: error al clasificar resumen', error)
        pushToast({ type: 'error', message: 'No se pudo actualizar la clasificación' })
        return
      }
      setFiles((list) => (list ?? []).map((f) => (f.id === id ? { ...f, ...payload } : f)))
      pushToast({ type: 'success', message: 'Clasificación actualizada' })
    } catch (e) {
      console.error('UploadSummaries: error al clasificar resumen', e)
      pushToast({ type: 'error', message: 'No se pudo actualizar la clasificación' })
    }
  }

  const submitMeta = (e) => {
    e.preventDefault()
    saveMeta()
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

      {(error || loadError) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error || loadError}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Resúmenes
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {files.length > 0 ? countLabel : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800"
              >
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
            {files.map((f) => (
              <li key={f.id}>
                <SummaryItem
                  file={f}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  editingId={editingId}
                  renameDraft={draft}
                  onRenameChange={setDraft}
                  submitRename={submitRename}
                  cancelRename={cancelRename}
                  startRename={startRename}
                  confirmingId={confirmingId}
                  startDeleteConfirm={startDeleteConfirm}
                  removeSummary={removeSummary}
                  cancelDelete={() => setConfirmingId(null)}
                  metaEditingId={metaEditingId}
                  metaDraft={metaDraft}
                  onMetaChange={(patch) => setMetaDraft((d) => ({ ...d, ...patch }))}
                  submitMeta={submitMeta}
                  cancelMetaEdit={cancelMetaEdit}
                  startMetaEdit={startMetaEdit}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
