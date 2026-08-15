// Cotizaciones en vivo para el Plan de inversión.
// BYMA Open Data (open.bymadata.com.ar) para activos + DolarAPI para dólar MEP/CCL.

import { bymaHistory, bymaLastClose, bymaQuote } from './byma.ts'
import { mapWithConcurrency } from './pool.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { createUserClient } from '../_shared/supabase.ts'

const DOLARAPI_CASAS = { MEP: 'bolsa', CCL: 'contadoconliqui' }
const FETCH_TIMEOUT_MS = 8_000

const CACHE_TTL_MS = 60_000
const HISTORY_CACHE_TTL_MS = 300_000
const CACHE_MAX = 1000
const MAX_SYMBOLS = 50

const cache = new Map<string, { at: number; value: unknown }>()

function cacheGet(key: string): { at: number; value: unknown } | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  // re-insert como MRU (eviction LRU simple)
  cache.delete(key)
  cache.set(key, hit)
  return hit
}

function cacheSet(key: string, entry: { at: number; value: unknown }) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, entry)
}

async function cached(
  key: string,
  fn: () => Promise<unknown>,
  ttl = CACHE_TTL_MS,
) {
  const hit = cacheGet(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  const value = await fn()
  cacheSet(key, { at: Date.now(), value })
  return value
}

// Igual que `cached` pero solo guarda resultados truthy: un fallback que falla
// no se cachea 5 minutos, así la próxima consulta reintenta contra BYMA.
async function cachedTruthy(
  key: string,
  fn: () => Promise<unknown>,
  ttl = CACHE_TTL_MS,
) {
  const hit = cacheGet(key)
  if (hit && Date.now() - hit.at < ttl && hit.value) return hit.value
  const value = await fn()
  if (value) cacheSet(key, { at: Date.now(), value })
  return value
}

type DolarRate = {
  price: number
  compra: unknown
  venta: number
  currency: unknown
  source: string
}

async function fetchRates() {
  const out: Record<'MEP' | 'CCL', DolarRate | null> = { MEP: null, CCL: null }
  for (const mode of ['MEP', 'CCL'] as const) {
    try {
      const res = await fetch(
        `https://dolarapi.com/v1/dolares/${DOLARAPI_CASAS[mode]}`,
        {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      )
      if (!res.ok) continue
      const d = await res.json()
      if (typeof d?.venta !== 'number') continue
      out[mode] = {
        price: d.venta,
        compra: d.compra ?? null,
        venta: d.venta,
        currency: d.moneda ?? 'ARS',
        source: 'dolarapi',
      }
    } catch {
      // null y seguimos con el resto
    }
  }
  return out
}

async function fetchHistory(symbol: string, range: string) {
  if (!symbol || symbol === 'MEP' || symbol === 'CCL') {
    return { symbol, range, points: [] }
  }
  const res = await cached(
    `hist:${symbol}:${range}`,
    () => bymaHistory(symbol, range),
    HISTORY_CACHE_TTL_MS,
  )
  return res ?? { symbol, range, points: [] }
}

async function resolveSymbol(symbol: string) {
  const quote = await cached(`byma:${symbol}`, () => bymaQuote(symbol))
  if (quote) return quote
  // El endpoint de cotización puede devolver ceros fuera de horario bursátil
  // (finde/feriado) o si cambia; caemos al último cierre del histórico.
  return cachedTruthy(
    `byma-last:${symbol}`,
    () => bymaLastClose(symbol),
    HISTORY_CACHE_TTL_MS,
  )
}

async function resolveWithRetry(symbol: string) {
  const first = await resolveSymbol(symbol)
  if (first) return first
  await new Promise((r) => setTimeout(r, 400))
  return resolveSymbol(symbol)
}

// BYMA throttlea las requests en paralelo (mide ~6-7 máx), así que resolvemos
// con un pool de pocas requests a la vez + reintento único ante fallo.
async function fetchQuotes(symbols: string[]) {
  const values = await mapWithConcurrency(
    symbols,
    2,
    (symbol) => resolveWithRetry(symbol).catch(() => null),
  )
  const quotes: Record<string, unknown> = {}
  symbols.forEach((symbol, i) => {
    quotes[symbol] = values[i] ?? null
  })
  return quotes
}

// Normaliza y valida el array de symbols: strings, sin MEP/CCL, dedupe, tope.
function normalizeSymbols(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw) {
    if (typeof s !== 'string') continue
    const clean = s.toUpperCase().replace(/\s+/g, '')
    if (!clean || clean === 'MEP' || clean === 'CCL') continue
    if (seen.has(clean)) continue
    seen.add(clean)
    if (out.length >= MAX_SYMBOLS) break
    out.push(clean)
  }
  return out
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  let symbols: string[]
  let history: { symbol?: string; range?: string } | undefined
  try {
    const body = await req.json()
    symbols = normalizeSymbols(body?.symbols)
    if (typeof body?.history?.symbol === 'string') {
      const h = body.history.symbol.toUpperCase().replace(/\s+/g, '')
      history = {
        symbol: h,
        range: typeof body.history.range === 'string' ? body.history.range : '',
      }
    }
  } catch {
    return json({ error: 'Body JSON inválido' }, 400, cors)
  }

  const supabase = createUserClient(req.headers.get('Authorization'))

  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return json({ error: 'No autenticado' }, 401, cors)
  }

  const [rates, quotes, historyResult] = await Promise.all([
    cached('dolarapi', fetchRates),
    fetchQuotes(symbols),
    history
      ? fetchHistory(history.symbol!, history.range ?? '')
      : Promise.resolve(undefined),
  ])
  const out: Record<string, unknown> = { quotes, rates }
  if (historyResult) out.history = historyResult
  // Mercado cerrado = todos los precios resueltos vienen del último cierre
  // (fallback histórico). Si hay algún vivo (byma) está abierto; null si no
  // hubo ningún precio y no podemos saberlo.
  const priced = (Object.values(quotes) as Array<
    { price?: unknown; source?: string } | null
  >).filter(
    (q) => q && q.price != null,
  )
  out.marketClosed = priced.length > 0
    ? priced.every((q) => q?.source === 'byma-history')
    : null
  return json(out, 200, cors)
})
