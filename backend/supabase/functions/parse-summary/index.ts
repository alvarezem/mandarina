import { parse as parseCsv } from '@std/csv'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { getDocumentProxy, extractTextItems } from 'unpdf'
import { categorize } from '../_shared/categorize.ts'
import { detectPeriod, detectSummaryType } from './detection.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  buildAnalysis,
  detectSeparator,
  mapRows,
  parseAmount,
  parseDate,
  pdfColumn,
  type Transaction,
} from './parser.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Columnas X para el PDF posicional de BBVA.
const PDF_DATE = /^\d{2}-[A-Za-z]{3}-\d{2}$/
const PDF_DATE_IN_DESC = /(\^|\D)\d{2}-[A-Za-z]{3}-\d{2}(\D|$)/

// Deno.serve solo se registra al ejecutarse como entry point (deploy edge);
// en tests se importa el módulo y handleParse sin levantar el servidor.
if (import.meta.main) {
  Deno.serve(async (req) => {
    const cors = corsHeaders(req.headers.get('Origin'))

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: cors })
    }

    let summaryId
    try {
      const body = await req.json()
      summaryId = body?.summary_id
    } catch {
      return json({ error: 'Body JSON inválido' }, 400, cors)
    }
    if (!summaryId) {
      return json({ error: 'summary_id es requerido' }, 400, cors)
    }
    if (typeof summaryId !== 'string' || !UUID_RE.test(summaryId)) {
      return json({ error: 'summary_id inválido' }, 400, cors)
    }

    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } },
    )

    return handleParse(supabase as unknown as ParseClient, summaryId, cors)
  })
}

// Lógica del handler separada para poder testearla con un client fake.
// Interfaz mínima del client (solo lo que parse-summary usa), así el test
// puede pasar un fake sin coaccionar al SupabaseClient completo.
// Se usa PromiseLike (no Promise) porque los builders de supabase-js
// (`PostgrestFilterBuilder`) son thenables sin ser `Promise` a nivel de tipos.
export type QueryResult = { data: unknown; error: { message: string } | null }

// Builder `select().eq()`: es thenable (await devuelve QueryResult) y además
// permite `.single()` (también resuelve a QueryResult).
export type SelectBuilder = PromiseLike<QueryResult> & {
  single(): PromiseLike<QueryResult>
}

export type SummaryRow = {
  id: string
  user_id: string
  file_name: string
  file_path: string
  [key: string]: unknown
}

export type MerchantOverride = { merchant: string; category: string }

export type ParseClient = {
  from(table: string): {
    select(cols: string): {
      eq(key: string, value: unknown): SelectBuilder
    }
    update(payload: Record<string, unknown>): {
      eq(key: string, value: unknown): PromiseLike<QueryResult>
    }
  }
  storage: {
    from(bucket: string): {
      download(
        path: string,
      ): PromiseLike<{ data: Blob | null; error: { message: string } | null }>
    }
  }
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<QueryResult>
}

export async function handleParse(
  supabase: ParseClient,
  summaryId: string,
  cors: Record<string, string>,
) {
  const { data: summaryRaw, error: sumError } = await supabase
    .from('card_summaries')
    .select('*')
    .eq('id', summaryId)
    .single()
  if (sumError || !summaryRaw) {
    return json({ error: 'Resumen no encontrado' }, 404, cors)
  }
  const summary = summaryRaw as SummaryRow

  const setStatus = async (status: string, errorMessage: string | null = null) => {
    try {
      await supabase.from('card_summaries').update({ status, error: errorMessage }).eq('id', summaryId)
    } catch (e) {
      console.error('parse-summary: no se pudo actualizar el status del resumen', e)
    }
  }

  await setStatus('parsing')

  const { data: blob, error: dlError } = await supabase.storage
    .from('card-resumes')
    .download(summary.file_path)
  if (dlError || !blob) {
    const message = 'No se pudo leer el archivo desde storage'
    await setStatus('error', message)
    return json({ error: message }, 500, cors)
  }

  let transactions: Transaction[] = []
  let pdfText: string | null = null
  try {
    if (isPdf(summary.file_name)) {
      const res = await extractPdfTransactions(blob)
      transactions = res.txs
      pdfText = res.text
    } else {
      const rows = await extractRows(summary, blob)
      transactions = mapRows(rows).map((t) => ({
        ...t,
        currency: 'ARS',
        category: categorize(t.merchant),
      }))
    }
  } catch (e) {
    console.error('parse-summary: error al procesar el archivo', e)
    const message = 'Error al procesar el archivo'
    await setStatus('error', message)
    return json({ error: message }, 400, cors)
  }

  if (transactions.length === 0) {
    const message = 'No se encontraron transacciones con el formato esperado (Fecha | Descripción | Importe)'
    await setStatus('error', message)
    return json({ error: message }, 400, cors)
  }

  const { data: overrides } = await supabase
    .from('merchant_overrides')
    .select('merchant, category')
    .eq('user_id', summary.user_id)
  const overrideList = (overrides ?? []) as MerchantOverride[]
  const overrideMap = new Map(overrideList.map((o) => [o.merchant.toLowerCase(), o.category]))
  transactions = transactions.map((t) => ({
    ...t,
    category: overrideMap.get(t.merchant.toLowerCase()) ?? t.category,
  }))

  // Persistencia atómica e idempotente: delete + insert de transacciones,
  // upsert del análisis y metadata del resumen en una sola transacción.
  const result = buildAnalysis(transactions)
  const summaryType = detectSummaryType(summary.file_name, isPdf(summary.file_name), pdfText)
  const { period_year, period_month } = detectPeriod(transactions)

  const { data: count, error: finalizeError } = await supabase.rpc('finalize_parse', {
    p_user_id: summary.user_id,
    p_summary_id: summaryId,
    p_transactions: transactions,
    p_result: result,
    p_summary_type: summaryType,
    p_period_year: period_year ?? null,
    p_period_month: period_month ?? null,
  })
  if (finalizeError) {
    console.error('parse-summary: error al guardar el resultado del parse', finalizeError)
    const message = 'Error al guardar las transacciones'
    await setStatus('error', message)
    return json({ error: message }, 500, cors)
  }

  return json({ ok: true, count: count ?? transactions.length }, 200, cors)
}

type PdfToken = { s: string; x: number; y: number }
type PdfLine = { y: number; toks: PdfToken[] }

async function extractPdfTransactions(
  blob: Blob,
): Promise<{ txs: Transaction[]; text: string }> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const pdf = await getDocumentProxy(buf)
  const { items } = await extractTextItems(pdf) as unknown as {
    items: { str: string; x: number; y: number; height: number }[][]
  }

  const text = items.length
    ? items[0].map((it) => it.str ?? '').join(' ')
    : ''

  const txs: Transaction[] = []
  for (const pageItems of items) {
    const active: PdfToken[] = pageItems
      .filter((it) => it.str && it.str.trim() && it.height > 0)
      .map((it) => ({ s: it.str.trim(), x: +it.x.toFixed(1), y: +it.y.toFixed(1) }))
    active.sort((a, b) => b.y - a.y || a.x - b.x)

    const lines: PdfLine[] = []
    let cur: PdfLine | null = null
    for (const it of active) {
      if (!cur || Math.abs(it.y - cur.y) > 2.5) {
        cur = { y: it.y, toks: [] }
        lines.push(cur)
      }
      cur.toks.push(it)
    }

    for (const ln of lines) {
      const first = ln.toks[0]
      if (!first || !PDF_DATE.test(first.s)) continue
      const hasAmount = ln.toks.some((t) => {
        const c = pdfColumn(t.x)
        return c === 'pesos' || c === 'dolares'
      })
      if (!hasAmount) continue

      const parts: { desc: string; pesos: string; dolares: string } = { desc: '', pesos: '', dolares: '' }
      for (const t of ln.toks) {
        const c = pdfColumn(t.x)
        if (c === 'desc') parts.desc += (parts.desc ? ' ' : '') + t.s
        else if (c === 'pesos') parts.pesos = t.s
        else if (c === 'dolares') parts.dolares = t.s
      }

      if (!parts.desc || PDF_DATE_IN_DESC.test(parts.desc)) continue
      const amountStr = parts.pesos || parts.dolares
      if (!amountStr) continue
      const amount = parseAmount(amountStr)
      if (amount === null) continue

      const merchant = parts.desc
      const date = parseDate(first.s)
      if (!date) continue
      txs.push({
        date,
        merchant,
        currency: parts.dolares ? 'USD' : 'ARS',
        amount,
        category: categorize(merchant),
      })
    }
  }
  return { txs, text }
}

function isPdf(fileName: string): boolean {
  return fileName.split('.').pop()?.toLowerCase() === 'pdf'
}

async function extractRows(
  summary: { file_name: string },
  blob: Blob,
): Promise<unknown[][]> {
  const ext = summary.file_name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') {
    const text = await blob.text()
    const separator = detectSeparator(text)
    return parseCsv(text, { separator, trim: true }) as unknown as string[][]
  }
  if (ext === 'xlsx') {
    const wb = XLSX.read(await blob.arrayBuffer())
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown as unknown[][]
  }
  throw new Error(`Formato .${ext ?? ''} no soportado (solo CSV, XLSX y PDF)`)
}