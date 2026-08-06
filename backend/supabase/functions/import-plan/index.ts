// Importa el plan de inversión desde un archivo XLSX.
// Detecta la fila de encabezados (Ticker | % Meta | Tenencia), ignora metadatos
// previos y REEMPLAZA todo el plan del usuario.

import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
  symbol: ['ticker', 'symbol', 'simbolo', 'activo', 'codigo', 'especie'],
  target: [
    'meta', 'target', 'peso meta', 'porcentaje meta', 'meta %',
    '% meta', 'target weight', 'peso objetivo', '% objetivo',
  ],
  quantity: [
    'tenencia', 'cantidad', 'cant', 'qty', 'quantity', 'shares',
    'tenencia (cant)', 'cantidad (cant)', 'unidades',
  ],
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

function matchesAlias(cell, alias) {
  const norm = normalizeHeader(String(cell ?? ''))
  if (!norm) return false
  if (norm === alias) return true
  if (!alias.includes(' ')) {
    return norm.split(/[\s()%]+/).includes(alias)
  }
  return norm.includes(alias)
}

function findHeaderRow(rows) {
  return rows.findIndex((row) =>
    Array.isArray(row) &&
    row.some((cell) => HEADER_ALIASES.symbol.some((a) => matchesAlias(cell, a))),
  )
}

function findColumns(row) {
  const find = (aliases) =>
    row.findIndex((cell) => aliases.some((a) => matchesAlias(cell, a)))
  return {
    symbol: find(HEADER_ALIASES.symbol),
    target: find(HEADER_ALIASES.target),
    quantity: find(HEADER_ALIASES.quantity),
  }
}

function parsePercent(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return value <= 1 ? value * 100 : value
  }
  const cleaned = String(value).replace('%', '').replace(',', '.').trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return n <= 1 ? n * 100 : n
}

function parseQuantity(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function extractPlan(rows) {
  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) return null
  const columns = findColumns(rows[headerIdx])
  if (columns.symbol === -1) return null

  const items = []
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue
    const cells = row.map((c) => String(c ?? '').trim())
    if (cells.every((c) => c === '')) continue

    const symbol = cells[columns.symbol]?.toUpperCase().replace(/\s+/g, '')
    if (!symbol) continue

    const target = columns.target >= 0 ? parsePercent(row[columns.target]) : null
    const quantity = columns.quantity >= 0 ? parseQuantity(row[columns.quantity]) : 0

    items.push({
      symbol,
      target: target ?? 0,
      quantity,
    })
  }
  return items
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let fileBase64
  try {
    const body = await req.json()
    fileBase64 = body?.file_base64
  } catch {
    return json({ error: 'Body JSON inválido' }, 400, corsHeaders)
  }
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return json({ error: 'file_base64 es requerido' }, 400, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader ?? '' } } },
  )

  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return json({ error: 'No autenticado' }, 401, corsHeaders)
  }
  const userId = userData.user.id

  let wb
  try {
    const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0))
    wb = XLSX.read(bytes, { type: 'array' })
  } catch {
    return json({ error: 'No se pudo leer el archivo XLSX' }, 400, corsHeaders)
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown as unknown[][]

  const items = extractPlan(rows)
  if (!items) {
    return json(
      { error: 'No se encontró la fila de encabezados (Ticker | % Meta | Tenencia)' },
      400,
      corsHeaders,
    )
  }
  if (items.length === 0) {
    return json({ error: 'El archivo no tiene activos para importar' }, 400, corsHeaders)
  }

  const rowsToInsert = items.map((item, i) => ({
    user_id: userId,
    symbol: item.symbol,
    name: item.symbol,
    asset_type: 'otro',
    currency: 'ARS',
    target_weight: item.target,
    quantity: item.quantity,
    manual_price: null,
    sort_order: i,
  }))

  const { data: previousRows, error: readError } = await supabase
    .from('portfolio_plan')
    .select('*')
    .eq('user_id', userId)
  if (readError) {
    return json({ error: 'No se pudo leer el plan actual' }, 500, corsHeaders)
  }

  const { error: delError } = await supabase
    .from('portfolio_plan')
    .delete()
    .eq('user_id', userId)
  if (delError) {
    return json({ error: 'No se pudo reemplazar el plan' }, 500, corsHeaders)
  }

  const { error: insError } = await supabase.from('portfolio_plan').insert(rowsToInsert)
  if (insError) {
    const rollbackRows = (previousRows ?? []).map((r) => ({
      user_id: userId,
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      asset_type: r.asset_type ?? 'otro',
      currency: r.currency ?? 'ARS',
      target_weight: r.target_weight ?? 0,
      quantity: r.quantity ?? 0,
      manual_price: r.manual_price ?? null,
      sort_order: r.sort_order ?? 0,
    }))
    if (rollbackRows.length > 0) {
      await supabase.from('portfolio_plan').insert(rollbackRows)
    }
    return json(
      { error: `Error al guardar el plan: ${insError.message}` },
      500,
      corsHeaders,
    )
  }

  return json(
    {
      ok: true,
      count: rowsToInsert.length,
      items: rowsToInsert.map((r) => ({
        symbol: r.symbol,
        target_weight: r.target_weight,
        quantity: r.quantity,
      })),
    },
    200,
    corsHeaders,
  )
})
