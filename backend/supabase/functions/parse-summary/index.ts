import { parse as parseCsv } from 'jsr:@std/csv'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getDocumentProxy, extractTextItems } from 'https://esm.sh/unpdf@1.8.0'
import { categorize } from '../_shared/categorize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body, status, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })

const HEADER_ALIASES = {
  date: [
    'fecha', 'date', 'periodo', 'emision', 'liquidacion',
    'release date', 'fecha liberacion', 'fecha de liberacion',
  ],
  merchant: [
    'descripcion', 'description', 'merchant', 'detalle', 'comercio',
    'referencia', 'titular', 'concepto', 'transaction type', 'tipo de transaccion',
  ],
  amount: [
    'importe', 'monto', 'amount', 'valor', 'cargo', 'abono',
    'monto usd', 'monto gs', 'monto arg', 'monto total', 'total',
    'transaction net amount', 'monto neto', 'importe neto',
  ],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let summaryId
  try {
    const body = await req.json()
    summaryId = body?.summary_id
  } catch {
    return json({ error: 'Body JSON inválido' }, 400, corsHeaders)
  }
  if (!summaryId) {
    return json({ error: 'summary_id es requerido' }, 400, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader ?? '' } } },
  )

  const { data: summary, error: sumError } = await supabase
    .from('card_summaries')
    .select('*')
    .eq('id', summaryId)
    .single()
  if (sumError || !summary) {
    return json({ error: 'Resumen no encontrado' }, 404, corsHeaders)
  }

  const setStatus = (status, error = null) =>
    supabase.from('card_summaries').update({ status, error }).eq('id', summaryId)

  await setStatus('parsing')

  const { data: blob, error: dlError } = await supabase.storage
    .from('card-resumes')
    .download(summary.file_path)
  if (dlError || !blob) {
    const message = 'No se pudo leer el archivo desde storage'
    await setStatus('error', message)
    return json({ error: message }, 500, corsHeaders)
  }

  let transactions
  try {
    if (isPdf(summary.file_name)) {
      transactions = await extractPdfTransactions(blob)
    } else {
      const rows = await extractRows(summary, blob)
      transactions = mapRows(rows).map((t) => ({
        ...t,
        currency: 'ARS',
        category: categorize(t.merchant),
      }))
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al procesar el archivo'
    await setStatus('error', message)
    return json({ error: message }, 400, corsHeaders)
  }

  if (transactions.length === 0) {
    const message = 'No se encontraron transacciones con el formato esperado (Fecha | Descripción | Importe)'
    await setStatus('error', message)
    return json({ error: message }, 400, corsHeaders)
  }

  const { error: insError } = await supabase.from('transactions').insert(
    transactions.map((t) => ({ summary_id: summaryId, ...t })),
  )
  if (insError) {
    const message = 'Error al guardar transacciones'
    await setStatus('error', message)
    return json({ error: message }, 500, corsHeaders)
  }

  const result = buildAnalysis(transactions)
  const { error: anError } = await supabase.from('consumption_analyses').upsert(
    { summary_id: summaryId, user_id: summary.user_id, result },
    { onConflict: 'summary_id' },
  )
  if (anError) {
    const message = 'Error al guardar el análisis de consumo'
    await setStatus('error', message)
    return json({ error: message }, 500, corsHeaders)
  }

  await setStatus('done')
  return json({ ok: true, count: transactions.length }, 200, corsHeaders)
})

function computeTotals(txs) {
  let credits = 0
  let debits = 0
  for (const tx of txs) {
    if (tx.amount >= 0) credits += tx.amount
    else debits += tx.amount
  }
  return {
    credits: Math.round(credits * 100) / 100,
    debits: Math.round(debits * 100) / 100,
    net: Math.round((credits + debits) * 100) / 100,
    txCount: txs.length,
  }
}

function aggregate(txs, kind) {
  const map = new Map()
  for (const tx of txs) {
    const key = kind === 'merchant' ? tx.merchant : tx.category
    const e = map.get(key) || { [kind]: key, count: 0, total: 0 }
    e.count += 1
    e.total += tx.amount
    map.set(key, e)
  }
  return [...map.values()]
}

function buildAnalysis(txs) {
  const ars = txs.filter((t) => t.currency !== 'USD')
  const usd = txs.filter((t) => t.currency === 'USD')

  const dates = ars.map((t) => t.date).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]
  const days = Math.max(
    1,
    Math.round((new Date(to) - new Date(from)) / 86400000) + 1,
  )

  const totals = computeTotals(ars)
  totals.avgPerDay = Math.round((totals.net * 100) / days) / 100

  let maxExpense = null
  let maxCredit = null
  const byDay = new Map()
  for (const tx of ars) {
    const d = byDay.get(tx.date) || { date: tx.date, credits: 0, debits: 0 }
    if (tx.amount >= 0) d.credits += tx.amount
    else d.debits += tx.amount
    byDay.set(tx.date, d)

    if (maxExpense === null || tx.amount < maxExpense.amount) {
      maxExpense = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
    if (maxCredit === null || tx.amount > maxCredit.amount) {
      maxCredit = { amount: tx.amount, merchant: tx.merchant, date: tx.date }
    }
  }

  const byDaySorted = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  let running = 0
  const balanceTrend = byDaySorted.map((d) => {
    running += d.credits + d.debits
    return { date: d.date, runningBalance: Math.round(running * 100) / 100 }
  })

  const result = {
    period: { from, to, days },
    totals,
    maxExpense,
    maxCredit,
    byMerchant: aggregate(ars, 'merchant')
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 10),
    byCategory: aggregate(ars, 'category').sort((a, b) => b.total - a.total),
    byDay: byDaySorted,
    balanceTrend,
  }

  if (usd.length > 0) {
    result.usd = {
      totals: computeTotals(usd),
      byCategory: aggregate(usd, 'category').sort((a, b) => b.total - a.total),
    }
  }

  return result
}

const PDF_DATE = /^\d{2}-[A-Za-z]{3}-\d{2}$/
const PDF_DATE_IN_DESC = /(\^|\D)\d{2}-[A-Za-z]{3}-\d{2}(\D|$)/

function pdfColumn(x) {
  if (x <= 100) return 'date'
  if (x <= 376) return 'desc'
  if (x <= 445) return 'cupon'
  if (x <= 505) return 'pesos'
  return 'dolares'
}

async function extractPdfTransactions(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const pdf = await getDocumentProxy(buf)
  const { items } = await extractTextItems(pdf, { merge: false })

  const txs = []
  for (const pageItems of items) {
    const active = pageItems
      .filter((it) => it.str && it.str.trim() && it.height > 0)
      .map((it) => ({ s: it.str.trim(), x: +it.x.toFixed(1), y: +it.y.toFixed(1) }))
    active.sort((a, b) => b.y - a.y || a.x - b.x)

    const lines = []
    let cur = null
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

      const parts = { desc: '', pesos: '', dolares: '' }
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
      txs.push({
        date: parseDate(first.s),
        merchant,
        currency: parts.dolares ? 'USD' : 'ARS',
        amount: -Math.abs(amount),
        category: categorize(merchant),
      })
    }
  }
  return txs
}

function isPdf(fileName) {
  return fileName.split('.').pop()?.toLowerCase() === 'pdf'
}

function detectSeparator(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim())
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = 0
  for (const sep of candidates) {
    const count = firstLine ? firstLine.split(sep).length - 1 : 0
    if (count > bestCount) {
      bestCount = count
      best = sep
    }
  }
  return best
}

async function extractRows(summary, blob) {
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

function mapRows(rows) {
  const headerIdx = rows.findIndex((row) =>
    Array.isArray(row) &&
    row.some((cell) =>
      HEADER_ALIASES.date.some((a) => normalizeHeader(String(cell ?? '')) === a),
    ),
  )
  if (headerIdx === -1) return []

  const columns = findColumns(rows[headerIdx])
  if (columns.amount === -1) return []

  return rows.slice(headerIdx + 1).map((row) => normalizeRow(row, columns)).filter(Boolean)
}

function normalizeRow(row, columns) {
  if (!Array.isArray(row)) return null

  const cells = row.map((c) => String(c ?? '').trim())
  if (cells.every((c) => c === '')) return null

  const date = parseDate(cells[columns.date])
  const merchant = columns.merchant >= 0 ? cells[columns.merchant] : 'Sin descripción'
  const amount = parseAmount(cells[columns.amount])

  if (!date || amount === null) return null

  return { date, merchant: merchant || 'Sin descripción', amount }
}

function findColumns(row) {
  const date = row.findIndex((cell) =>
    HEADER_ALIASES.date.some((a) => normalizeHeader(String(cell ?? '')) === a),
  )
  const merchant = row.findIndex((cell) =>
    HEADER_ALIASES.merchant.some((a) => normalizeHeader(String(cell ?? '')) === a),
  )
  const amount = row.findIndex((cell) =>
    HEADER_ALIASES.amount.some((a) => normalizeHeader(String(cell ?? '')) === a),
  )
  return { date, merchant, amount }
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MONTHS = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
}

function parseDate(value) {
  if (!value) return null
  const mon = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/)
  if (mon) {
    const mm = MONTHS[mon[2].slice(0, 3).toLowerCase()]
    if (mm) {
      const yy = mon[3].length === 2 ? String(2000 + Number(mon[3])) : mon[3]
      return `${yy}-${mm}-${mon[1].padStart(2, '0')}`
    }
  }
  const ddmm = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}

function parseAmount(value) {
  if (!value) return null
  if (typeof value === 'number') return value
  const cleaned = value.replace(/[^\d.,\-]/g, '')
  if (cleaned === '' || cleaned === '-') return null
  const sign = cleaned.startsWith('-') ? -1 : 1
  const digits = cleaned.replace('-', '')

  let normalized
  if (digits.includes('.') && digits.includes(',')) {
    const lastComma = digits.lastIndexOf(',')
    const lastDot = digits.lastIndexOf('.')
    normalized = lastComma > lastDot
      ? digits.replace(/\./g, '').replace(',', '.')
      : digits.replace(/,/g, '')
  } else if (digits.includes(',')) {
    normalized = digits.replace(',', '.')
  } else if (digits.includes('.')) {
    const parts = digits.split('.')
    normalized = parts.length === 2 && parts[1].length <= 2
      ? digits
      : digits.replace(/\./g, '')
  } else {
    normalized = digits
  }

  const n = Number(normalized) * sign
  return Number.isFinite(n) ? n : null
}
