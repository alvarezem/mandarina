// Cotizaciones en vivo para el Plan de inversión.
// BYMA Open Data (open.bymadata.com.ar) para activos + DolarAPI para dólar MEP/CCL.

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

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const BYMA_QUOTE_URL =
  'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/bnown/fichatecnica/especies/cotizacion'

const BYMA_HISTORY_URL =
  'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/chart/historical-series/history'

const DOLARAPI_CASAS = { MEP: 'bolsa', CCL: 'contadoconliqui' }

// Rango -> resolución BYMA + ventana en días. El 1D (intradía, res 1/5/60) no está
// disponible en el endpoint gratuito (devuelve no_data), por eso no se incluye.
const HISTORY_RANGES: Record<string, { res: string; days: number }> = {
  '1S': { res: 'D', days: 7 },
  '1M': { res: 'D', days: 35 },
  '3M': { res: 'D', days: 95 },
  '1A': { res: 'W', days: 370 },
}

const CACHE_TTL_MS = 60_000
const HISTORY_CACHE_TTL_MS = 300_000
const cache = new Map<string, { at: number; value: unknown }>()

async function cached(key: string, fn: () => Promise<unknown>, ttl = CACHE_TTL_MS) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  const value = await fn()
  cache.set(key, { at: Date.now(), value })
  return value
}

async function fetchRates() {
  const out = { MEP: null, CCL: null }
  for (const mode of ['MEP', 'CCL'] as const) {
    try {
      const res = await fetch(`https://dolarapi.com/v1/dolares/${DOLARAPI_CASAS[mode]}`)
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

async function bymaQuote(symbol: string) {
  const res = await fetch(BYMA_QUOTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      Accept: 'application/json',
      Origin: 'https://open.bymadata.com.ar',
    },
    body: JSON.stringify({ symbol, settlementType: '2', 'Content-Type': 'application/json' }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const quote = data?.data?.[0]
  if (!quote) return null
  const price = Number(quote.trade)
  if (!Number.isFinite(price) || price <= 0) return null
  const prev = Number(quote.previousClosingPrice)
  return {
    price,
    currency: quote.denominationCcy === 'USD' ? 'USD' : 'ARS',
    changePct: Number.isFinite(prev) && prev > 0 ? (price / prev - 1) * 100 : null,
    volume: Number(quote.tradeVolume) || null,
    source: 'byma',
  }
}

async function bymaHistory(symbol: string, range: string) {
  const cfg = HISTORY_RANGES[range]
  if (!cfg) return null
  const to = Math.floor(Date.now() / 1000)
  const from = to - cfg.days * 86400
  const params = new URLSearchParams({
    symbol: `${symbol} 24HS`,
    resolution: cfg.res,
    from: String(from),
    to: String(to),
  })
  let data: any
  try {
    const res = await fetch(`${BYMA_HISTORY_URL}?${params.toString()}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json', Origin: 'https://open.bymadata.com.ar' },
    })
    if (!res.ok) return null
    data = await res.json()
  } catch {
    return null
  }
  if (data?.s !== 'ok' || !Array.isArray(data?.t)) return { symbol, range, points: [], source: 'byma' }
  const points = data.t.map((t: number, i: number) => ({
    t: t * 1000,
    o: Number(data.o?.[i]) || null,
    h: Number(data.h?.[i]) || null,
    l: Number(data.l?.[i]) || null,
    c: Number(data.c?.[i]) || null,
    v: Number(data.v?.[i]) || 0,
  }))
  return { symbol, range, points, source: 'byma' }
}

async function fetchHistory(symbol: string, range: string) {
  const clean = (symbol || '').toUpperCase().replace(/\s+/g, '')
  if (!clean || clean === 'MEP' || clean === 'CCL') return { symbol, range, points: [] }
  const res = await cached(`hist:${clean}:${range}`, () => bymaHistory(clean, range), HISTORY_CACHE_TTL_MS)
  return res ?? { symbol, range, points: [] }
}

async function fetchQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map((raw) => {
      const symbol = raw.toUpperCase().replace(/\s+/g, '')
      if (!symbol || symbol === 'MEP' || symbol === 'CCL') return Promise.resolve(null)
      return cached(`byma:${symbol}`, () => bymaQuote(symbol))
    }),
  )
  const quotes: Record<string, unknown> = {}
  symbols.forEach((raw, i) => {
    const symbol = raw.toUpperCase().replace(/\s+/g, '')
    if (!symbol) return
    quotes[symbol] = results[i].status === 'fulfilled' ? results[i].value : null
  })
  return quotes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let symbols: string[]
  let history: { symbol?: string; range?: string } | undefined
  try {
    const body = await req.json()
    symbols = Array.isArray(body?.symbols) ? body.symbols : []
    if (typeof body?.history?.symbol === 'string') {
      history = { symbol: body.history.symbol, range: body.history.range }
    }
  } catch {
    return json({ error: 'Body JSON inválido' }, 400, corsHeaders)
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

  const [rates, quotes, historyResult] = await Promise.all([
    cached('dolarapi', fetchRates),
    fetchQuotes(symbols),
    history ? fetchHistory(history.symbol, history.range ?? '') : Promise.resolve(undefined),
  ])
  const out: Record<string, unknown> = { quotes, rates }
  if (historyResult) out.history = historyResult
  return json(out, 200, corsHeaders)
})
