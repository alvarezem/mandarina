import { assertEquals } from '@std/assert'
import {
  handleParse,
  type QueryResult,
  type SelectBuilder,
} from './parse-summary/index.ts'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const SUMMARY_ID = '00000000-0000-4000-8000-000000000002'
const CSV =
  'Fecha;Descripción;Importe\n01-ENE-26;SUPER COTO;-1250,50\n02-ENE-26;GYM;2000,00'

function makeClient(overrides: Record<string, unknown> = {}) {
  const calls: {
    rpc: { name: string; args: Record<string, unknown> }[]
    updates: { table: string; payload: Record<string, unknown> }[]
  } = { rpc: [], updates: [] }
  const summary = {
    id: SUMMARY_ID,
    user_id: USER_ID,
    file_name: 'resumen.csv',
    file_path: 'x.csv',
  }

  // Resultado del query `select().eq()`: promesa thenable con `.single()`.
  const selectBuilder = (result: QueryResult): SelectBuilder => {
    const p = Promise.resolve(result)
    return Object.assign(p, { single: () => Promise.resolve(result) })
  }

  const client = {
    calls,
    replies: [],
    // Respuestas `select` no `.single()` (merchant_overrides, etc).
    onSelect(table: string): QueryResult {
      if (table === 'merchant_overrides') {
        return { data: overrides.merchantOverrides ?? [], error: null }
      }
      return { data: null, error: { message: 'unexpected select' } }
    },
    from(table: string) {
      return {
        select() {
          const builder = {
            eq(_key: string, _value: unknown) {
              if (table === 'card_summaries') {
                if (overrides.summaryError) {
                  return selectBuilder({ data: null, error: { message: 'x' } })
                }
                return selectBuilder({ data: summary, error: null })
              }
              return selectBuilder(client.onSelect(table))
            },
          }
          return builder
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(_key: string, _value: unknown) {
              calls.updates.push({ table, payload })
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
      }
    },
    storage: {
      from() {
        return {
          download() {
            if (overrides.downloadError) {
              return Promise.resolve({ data: null, error: { message: 'x' } })
            }
            const data = overrides.blobSize
              ? new Blob([new Uint8Array(overrides.blobSize as number)])
              : new Blob([overrides.fileText ?? CSV] as BlobPart[])
            return Promise.resolve({ data, error: null })
          },
        }
      },
    },
    rpc(name: string, args: Record<string, unknown>) {
      calls.rpc.push({ name, args })
      if (overrides.rpcError) {
        return Promise.resolve({ data: null, error: { message: 'x' } })
      }
      return Promise.resolve({ data: overrides.rpcCount ?? 2, error: null })
    },
  }
  return client
}

async function bodyOf(res: Response) {
  return JSON.parse(await res.text())
}

type FinalizeArgs = {
  p_transactions: {
    date: string
    merchant: string
    amount: number
    category: string
    currency: string
  }[]
  p_period_year: number
  p_period_month: number
  p_summary_id: string
  p_user_id: string
}

function finalizeArgsOf(client: ReturnType<typeof makeClient>): FinalizeArgs {
  const finalize = client.calls.rpc.find((r) => r.name === 'finalize_parse')
  assertEquals(finalize != null, true)
  return finalize!.args as unknown as FinalizeArgs
}

Deno.test('handleParse: flujo CSV completo -> ok:true con count', async () => {
  const client = makeClient()
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 200)
  const body = await bodyOf(res)
  assertEquals(body.ok, true)
  assertEquals(body.count, 2)

  const args = finalizeArgsOf(client)
  assertEquals(args.p_summary_id, SUMMARY_ID)
  assertEquals(args.p_user_id, USER_ID)
  assertEquals(args.p_transactions.length, 2)

  const tx = args.p_transactions[0]
  assertEquals(tx.date, '2026-01-01')
  assertEquals(tx.merchant, 'SUPER COTO')
  assertEquals(tx.amount, -1250.5)
  assertEquals(tx.category, 'Supermercados')
  assertEquals(tx.currency, 'ARS')
  assertEquals(args.p_period_year, 2026)
  assertEquals(args.p_period_month, 1)
})

Deno.test('handleParse: resumen inexistente -> 404', async () => {
  const client = makeClient({ summaryError: true })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 404)
})

Deno.test('handleParse: sin transacciones parseadas -> 400', async () => {
  const client = makeClient({
    fileText: 'no hay fila de fecha acá\nsolo texto',
  })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 400)
})

Deno.test('handleParse: error de RPC finalize_parse -> 500 y status error', async () => {
  const client = makeClient({ rpcError: true })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 500)
  const last = client.calls.updates.at(-1)!
  assertEquals(last.payload.status, 'error')
})

Deno.test('handleParse: error de descarga -> 500 con status error', async () => {
  const client = makeClient({ downloadError: true })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 500)
  const last = client.calls.updates.at(-1)!
  assertEquals(last.payload.status, 'error')
})

Deno.test('handleParse: archivo mayor a 10 MB -> 400 sin parsear', async () => {
  const client = makeClient({ blobSize: 10 * 1024 * 1024 + 1 })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 400)
  const last = client.calls.updates.at(-1)!
  assertEquals(last.payload.status, 'error')
})

Deno.test('handleParse: columna de moneda define la moneda de cada fila', async () => {
  const client = makeClient({
    fileText:
      'Fecha;Descripción;Importe;Moneda\n01-ENE-26;NETFLIX;12,50;USD\n02-ENE-26;COTO;1000;ARS',
  })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 200)
  const args = finalizeArgsOf(client)
  const usd = args.p_transactions.find((t) => t.merchant === 'NETFLIX')
  assertEquals(usd?.currency, 'USD')
  const ars = args.p_transactions.find((t) => t.merchant === 'COTO')
  assertEquals(ars?.currency, 'ARS')
})

Deno.test('handleParse: aplica overrides de categoría del usuario', async () => {
  const client = makeClient({
    merchantOverrides: [{ merchant: 'SUPER COTO', category: 'Compras' }],
  })
  const res = await handleParse(client, SUMMARY_ID, {})
  assertEquals(res.status, 200)
  const args = finalizeArgsOf(client)
  const gim = args.p_transactions.find((t) => t.merchant === 'SUPER COTO')
  assertEquals(gim?.category, 'Compras')
})
