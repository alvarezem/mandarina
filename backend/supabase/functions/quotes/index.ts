// Cotizaciones en vivo para el Plan de inversión.
// BYMA Open Data (open.bymadata.com.ar) para activos + DolarAPI para dólar MEP/CCL.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { bymaQuote, bymaHistory, bymaLastClose } from './byma.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body, status, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })

const DOLARAPI_CASAS = { MEP: 'bolsa', CCL: 'contadoconliqui' }

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

async function fetchHistory(symbol: string, range: string) {
  const clean = (symbol || '').toUpperCase().replace(/\s+/g, '')
  if (!clean || clean === 'MEP' || clean === 'CCL') return { symbol, range, points: [] }
  const res = await cached(`hist:${clean}:${range}`, () => bymaHistory(clean, range), HISTORY_CACHE_TTL_MS)
  return res ?? { symbol, range, points: [] }
}

async function fetchQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map(async (raw) => {
      const symbol = raw.toUpperCase().replace(/\s+/g, '')
      if (!symbol || symbol === 'MEP' || symbol === 'CCL') return null
      const quote = await cached(`byma:${symbol}`, () => bymaQuote(symbol))
      if (quote) return quote
      // El endpoint de cotización puede devolver ceros fuera de horario bursátil
      // (finde/feriado) o si cambia; caemos al último cierre del histórico.
      return cached(`byma-last:${symbol}`, () => bymaLastClose(symbol), HISTORY_CACHE_TTL_MS)
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
