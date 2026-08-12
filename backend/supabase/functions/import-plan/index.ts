// Importa el plan de inversión desde un archivo XLSX.
// Detecta la fila de encabezados (Ticker | % Meta | Tenencia), ignora metadatos
// previos y REEMPLAZA todo el plan del usuario (de forma atómica vía RPC).

import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { extractPlan } from './planner.ts'

// ~5MB binario (base64 ≈ +33%). Un plan de inversión real pesa KBs.
const MAX_BASE64_LENGTH = 7 * 1024 * 1024

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
