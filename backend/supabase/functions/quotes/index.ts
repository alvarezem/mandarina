// Cotizaciones en vivo para el Plan de inversión.
// Yahoo Finance (BYMA con sufijo .BA) + DolarAPI para dólar MEP/CCL.

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

const YAHOO_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const DOLARAPI_CASAS = { MEP: 'bolsa', CCL: 'contadoconliqui' }

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
      // dejamos null y seguimos con el resto
    }
  }
  return out
}

async function yahooQuote(symbol: string) {
  const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.BA`
  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      })
      if (res.status === 429) {
        await delay(600)
        continue
      }
      if (!res.ok) return null
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null
      const prev =
        meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? meta.previousClose
      return {
        price: meta.regularMarketPrice,
        currency: meta.currency ?? 'ARS',
        changePct: typeof prev === 'number' && prev !== 0
          ? ((meta.regularMarketPrice / prev) - 1) * 100
          : null,
        volume: meta.regularMarketVolume ?? null,
        source: 'yahoo',
      }
    } catch {
      return null
    }
  }
  return null
}

async function fetchQuotes(symbols: string[]) {
  const quotes: Record<string, unknown> = {}
  for (const raw of symbols) {
    const symbol = raw.toUpperCase().replace(/\s+/g, '')
    if (!symbol) continue
    if (symbol === 'MEP' || symbol === 'CCL') {
      quotes[symbol] = null
      continue
    }
    quotes[symbol] = await yahooQuote(symbol)
  }
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

  const [rates, quotes] = await Promise.all([fetchRates(), fetchQuotes(symbols)])
  return json({ quotes, rates }, 200, corsHeaders)
})
