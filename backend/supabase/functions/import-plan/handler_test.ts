import { assertEquals } from '@std/assert'
import * as XLSX from 'xlsx'
import { handleImport, type ImportClient } from './index.ts'

const USER_ID = '00000000-0000-4000-8000-000000000001'

function makeClient(overrides: Record<string, unknown> = {}) {
  const calls: { rpc: { name: string; args: Record<string, unknown> }[] } = {
    rpc: [],
  }
  const client: ImportClient = {
    auth: {
      getUser() {
        if (overrides.authError) {
          return Promise.resolve({ data: null, error: { message: 'x' } })
        }
        return Promise.resolve({ data: { user: { id: USER_ID } }, error: null })
      },
    },
    rpc(name, args) {
      calls.rpc.push({ name, args })
      if (overrides.rpcError) {
        return Promise.resolve({ data: null, error: { message: 'x' } })
      }
      return Promise.resolve({ data: null, error: null })
    },
  }
  return { client, calls }
}

function xlsxBase64(sheets: Record<string, unknown[][]>): string {
  const wb = XLSX.utils.book_new()
  for (const [name, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name)
  }
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
}

const PLAN_XLSX = xlsxBase64({
  Plan: [
    ['Ticker', '% Meta', 'Tenencia'],
    ['GGAL', '20', '1000'],
    ['YXM', '80%', '800'],
  ],
})

Deno.test('handleImport: flujo XLSX completo -> ok con count y rpc', async () => {
  const { client, calls } = makeClient()
  const res = await handleImport(client, PLAN_XLSX)
  assertEquals(res.status, 200)
  assertEquals(res.body.ok, true)
  assertEquals(res.body.count, 2)

  const rpc = calls.rpc[0]
  assertEquals(rpc.name, 'replace_user_plan')
  const args = rpc.args as {
    p_user_id: string
    p_items: Record<string, unknown>[]
  }
  assertEquals(args.p_user_id, USER_ID)
  assertEquals(args.p_items.length, 2)
  assertEquals(args.p_items[0], {
    symbol: 'GGAL',
    name: 'GGAL',
    asset_type: 'otro',
    currency: 'ARS',
    target_weight: 20,
    quantity: 1000,
    sort_order: 0,
  })
})

Deno.test('handleImport: multi-hoja usa la primera con encabezados', async () => {
  const xlsx = xlsxBase64({
    'Portada': [
      ['Mi portafolio 2026'],
      ['Cartera: Conservadora'],
    ],
    'Plan': [
      ['Ticker', '% Meta', 'Tenencia', 'Moneda', 'Tipo'],
      ['GGAL', '20', '1000', 'USD', 'Acción'],
    ],
  })
  const { client, calls } = makeClient()
  const res = await handleImport(client, xlsx)
  assertEquals(res.status, 200)
  assertEquals(res.body.count, 1)

  const args = calls.rpc[0].args as { p_items: Record<string, unknown>[] }
  assertEquals(args.p_items[0], {
    symbol: 'GGAL',
    name: 'GGAL',
    asset_type: 'accion',
    currency: 'USD',
    target_weight: 20,
    quantity: 1000,
    sort_order: 0,
  })
})

Deno.test('handleImport: sin hoja con encabezados -> 400 claro', async () => {
  const xlsx = xlsxBase64({ 'Portada': [['Mi portafolio'], ['sin datos']] })
  const { client } = makeClient()
  const res = await handleImport(client, xlsx)
  assertEquals(res.status, 400)
  assertEquals(
    res.body.error,
    'No se encontró una hoja con los encabezados (Ticker | % Meta | Tenencia)',
  )
})

Deno.test('handleImport: cantidad negativa -> 400 con el símbolo del item', async () => {
  const xlsx = xlsxBase64({
    Plan: [
      ['Ticker', '% Meta', 'Tenencia'],
      ['GGAL', '20', '-10'],
    ],
  })
  const { client } = makeClient()
  const res = await handleImport(client, xlsx)
  assertEquals(res.status, 400)
  assertEquals(
    res.body.error,
    'La cantidad de "GGAL" no puede ser negativa (-10)',
  )
})

Deno.test('handleImport: error del RPC replace_user_plan -> 500', async () => {
  const { client } = makeClient({ rpcError: true })
  const res = await handleImport(client, PLAN_XLSX)
  assertEquals(res.status, 500)
  assertEquals(res.body.error, 'No se pudo reemplazar el plan')
})

Deno.test('handleImport: no autenticado -> 401', async () => {
  const { client } = makeClient({ authError: true })
  const res = await handleImport(client, PLAN_XLSX)
  assertEquals(res.status, 401)
})

Deno.test('handleImport: file_base64 ausente -> 400', async () => {
  const { client } = makeClient()
  const res = await handleImport(client, '')
  assertEquals(res.status, 400)
  assertEquals(res.body.error, 'file_base64 es requerido')
})

Deno.test('handleImport: archivo demasiado grande -> 413', async () => {
  const { client } = makeClient()
  const res = await handleImport(client, 'a'.repeat(7 * 1024 * 1024 + 1))
  assertEquals(res.status, 413)
})
