// Importa el plan de inversión desde un archivo XLSX.
// Detecta la fila de encabezados (Ticker | % Meta | Tenencia), ignora metadatos
// previos y REEMPLAZA todo el plan del usuario (de forma atómica vía RPC).

import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

// ~5MB binario (base64 ≈ +33%). Un plan de inversión real pesa KBs.
const MAX_BASE64_LENGTH = 7 * 1024 * 1024

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

// Cantidad con separador decimal/comma ambiguo. Misma lógica que parseAmount
// de parse-summary: si hay punto y coma, el último es el separador decimal;
// si solo punto, es decimal si tiene <=2 dígitos (1.5 → 1.5, 1.234 → 1234).
function parseQuantity(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[^\d.,\-]/g, '')
  if (cleaned === '' || cleaned === '-') return 0
  const sign = cleaned.startsWith('-') ? -1 : 1
  const digits = cleaned.replace(/-/g, '')

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
    normalized = parts.length === 2 && parts[1].length <= 2 ? digits : digits.replace(/\./g, '')
  } else {
    normalized = digits
  }

  const n = Number(normalized) * sign
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
  const cors = corsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  let fileBase64
  try {
    const body = await req.json()
    fileBase64 = body?.file_base64
  } catch {
    return json({ error: 'Body JSON inválido' }, 400, cors)
  }
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return json({ error: 'file_base64 es requerido' }, 400, cors)
  }
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return json({ error: 'El archivo es demasiado grande' }, 413, cors)
  }

  const authHeader = req.headers.get('Authorization')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader ?? '' } } },
  )

  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return json({ error: 'No autenticado' }, 401, cors)
  }
  const userId = userData.user.id

  let wb
  try {
    const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0))
    wb = XLSX.read(bytes, { type: 'array' })
  } catch {
    return json({ error: 'No se pudo leer el archivo XLSX' }, 400, cors)
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown as unknown[][]

  const items = extractPlan(rows)
  if (!items) {
    return json(
      { error: 'No se encontró la fila de encabezados (Ticker | % Meta | Tenencia)' },
      400,
      cors,
    )
  }
  if (items.length === 0) {
    return json({ error: 'El archivo no tiene activos para importar' }, 400, cors)
  }

  const rowsToInsert = items.map((item, i) => ({
    symbol: item.symbol,
    name: item.symbol,
    asset_type: 'otro',
    currency: 'ARS',
    target_weight: item.target,
    quantity: item.quantity,
    sort_order: i,
  }))

  // Reemplazo atómico: delete + insert en una sola transacción (RPC SECURITY
  // INVOKER, respeta RLS del caller). Sin ventana de datos perdidos.
  const { error: rpcError } = await supabase.rpc('replace_user_plan', {
    p_user_id: userId,
    p_items: rowsToInsert,
  })
  if (rpcError) {
    console.error('import-plan: replace_user_plan falló', rpcError.message)
    return json({ error: 'No se pudo reemplazar el plan' }, 500, cors)
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
    cors,
  )
})
