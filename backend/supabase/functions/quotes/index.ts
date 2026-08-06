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

const DOLARAPI_CASAS = { MEP: 'bolsa', CCL: 'contadoconliqui' }

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { at: number; value: unknown }>()

async function cached(key: string, fn: () => Promise<unknown>) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value
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
  try {
    const body = await req.json()
    symbols = Array.isArray(body?.symbols) ? body.symbols : []
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

  const [rates, quotes] = await Promise.all([
    cached('dolarapi', fetchRates),
    fetchQuotes(symbols),
  ])
  return json({ quotes, rates }, 200, corsHeaders)
})
