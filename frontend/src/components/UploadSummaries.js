import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

const STATUS_LABEL = {
  pending: 'Pendiente',
  parsing: 'Procesando…',
  done: 'Procesado',
  error: 'Error',
}

export default function UploadSummaries({ session, selectedId, onSelect }) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSummaries()
  }, [])

  const loadSummaries = async () => {
    const { data, error } = await supabase
      .from('card_summaries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setFiles(data)
      if (data.length > 0 && !selectedId) onSelect(data[0].id)
    }
  }

  const parse = async (summaryId) => {
    try {
      await supabase.functions.invoke('parse-summary', { body: { summary_id: summaryId } })
    } catch {
      setError('No se pudo iniciar el procesamiento del archivo')
    }
    await loadSummaries()
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    const path = `${session.user.id}/${selectedFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('card-resumes')
      .upload(path, selectedFile, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: summary, error: insertError } = await supabase
      .from('card_summaries')
      .insert({
        user_id: session.user.id,
        file_name: selectedFile.name,
        file_path: path,
      })
      .select()
      .single()

    setUploading(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      setSelectedFile(null)
      await loadSummaries()
      await parse(summary.id)
    }
  }

  return (
    <div>
      <h2>Resúmenes de tarjeta</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.csv,.xlsx"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <button type="submit" disabled={!selectedFile || uploading}>
          {uploading ? 'Subiendo…' : 'Subir resumen'}
        </button>
      </form>
      {error && <p>{error}</p>}
      {files.length === 0 ? (
        <p>No subiste resúmenes todavía.</p>
      ) : (
        <ul className="summary-list">
          {files.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`summary-item ${selectedId === f.id ? 'active' : ''}`}
                onClick={() => onSelect(f.id)}
              >
                <span className="summary-name">{f.file_name}</span>
                <span className={`badge ${f.status}`}>
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                {f.status === 'error' && f.error ? <em className="error-text">{f.error}</em> : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}