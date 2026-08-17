// Importa el plan de inversión desde un archivo XLSX.
// Detecta la fila de encabezados (Ticker | % Meta | Tenencia), ignora metadatos
// previos y REEMPLAZA todo el plan del usuario (de forma atómica vía RPC).
// El XLSX puede tener varias hojas: se usa la primera que tenga los encabezados.

import * as XLSX from 'xlsx'
import { corsHeaders, json } from '../_shared/cors.ts'
import { createUserClient } from '../_shared/supabase.ts'
import { extractPlan, findHeaderRow, PlanError } from './planner.ts'

// ~5MB binario (base64 ≈ +33%). Un plan de inversión real pesa KBs.
const MAX_BASE64_LENGTH = 7 * 1024 * 1024

export type ImportClient = {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null } | null
      error: { message: string } | null
    }>
  }
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

export async function handleImport(
  supabase: ImportClient,
  fileBase64: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return { status: 400, body: { error: 'file_base64 es requerido' } }
  }
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return { status: 413, body: { error: 'El archivo es demasiado grande' } }
  }

  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return { status: 401, body: { error: 'No autenticado' } }
  }
  const userId = userData.user.id

  let wb
  try {
    const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0))
    wb = XLSX.read(bytes, { type: 'array' })
  } catch {
    return { status: 400, body: { error: 'No se pudo leer el archivo XLSX' } }
  }

  // Multi-hoja: usar la primera hoja que tenga la fila de encabezados real
  // (portadas y hojas de metadata se saltan).
  let rows: unknown[][] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const sheetRows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
    }) as unknown as unknown[][]
    if (findHeaderRow(sheetRows) !== -1) {
      rows = sheetRows
      break
    }
  }

  let items
  try {
    items = extractPlan(rows)
  } catch (err) {
    if (err instanceof PlanError) {
      return { status: 400, body: { error: err.message } }
    }
    throw err
  }
  if (!items) {
    return {
      status: 400,
      body: {
        error:
          'No se encontró una hoja con los encabezados (Ticker | % Meta | Tenencia)',
      },
    }
  }
  if (items.length === 0) {
    return {
      status: 400,
      body: { error: 'El archivo no tiene activos para importar' },
    }
  }

  const rowsToInsert = items.map((item, i) => ({
    symbol: item.symbol,
    name: item.symbol,
    asset_type: item.asset_type,
    currency: item.currency,
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
    return { status: 500, body: { error: 'No se pudo reemplazar el plan' } }
  }

  return {
    status: 200,
    body: {
      ok: true,
      count: rowsToInsert.length,
      items: rowsToInsert.map((r) => ({
        symbol: r.symbol,
        target_weight: r.target_weight,
        quantity: r.quantity,
      })),
    },
  }
}

// Deno.serve solo se registra al ejecutarse como entry point (deploy edge);
// en tests se importa el módulo y handleImport sin levantar el servidor.
if (import.meta.main) {
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

    const supabase = createUserClient(req.headers.get('Authorization'))
    const result = await handleImport(supabase, fileBase64)
    return json(result.body, result.status, cors)
  })
}
