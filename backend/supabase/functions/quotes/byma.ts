// Helpers de BYMA Open Data (open.bymadata.com.ar) para la edge `quotes`.
// Separados de index.ts para poder testearlos con fetch mockeado (sin Deno.serve).

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const BYMA_QUOTE_URL =
  'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/bnown/fichatecnica/especies/cotizacion'

const BYMA_HISTORY_URL =
  'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/chart/historical-series/history'

// Rango -> resolución BYMA + ventana en días. El 1D (intradía, res 1/5/60) no está
// disponible en el endpoint gratuito (devuelve no_data), por eso no se incluye.
const HISTORY_RANGES: Record<string, { res: string; days: number }> = {
  '1S': { res: 'D', days: 7 },
  '1M': { res: 'D', days: 35 },
  '3M': { res: 'D', days: 95 },
  '1A': { res: 'W', days: 370 },
}

const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null)

export async function bymaQuote(symbol: string) {
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
  const prev = num(quote.previousClosingPrice)
  return {
    price,
    currency: quote.denominationCcy === 'USD' ? 'USD' : 'ARS',
    changePct: prev != null ? Math.round(((price / prev - 1) * 100) * 10_000) / 10_000 : null,
    open: num(quote.openingPrice),
    high: num(quote.tradingHighPrice),
    low: num(quote.tradingLowPrice),
    prevClose: prev,
    closingPrice: num(quote.closingPrice),
    tradeHour: typeof quote.tradeHour === 'string' ? quote.tradeHour.slice(0, 5) : null,
    volume: Number(quote.tradeVolume) || null,
    source: 'byma',
  }
}

export async function bymaHistory(symbol: string, range: string) {
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

// Último cierre del histórico. Fallback para cuando el endpoint de cotización
// devuelve ceros (fin de semana / feriado / API caída): BYMA Open Data no publica
// el último precio de la sesión anterior en `cotizacion`, pero sí en el histórico.
export async function bymaLastClose(symbol: string) {
  const hist = await bymaHistory(symbol, '1S')
  if (!hist || hist.points.length === 0) return null
  const last = hist.points[hist.points.length - 1]
  const prev = hist.points[hist.points.length - 2]
  const price = num(last.c)
  if (price == null) return null
  const prevClose = prev ? num(prev.c) : null
  return {
    price,
    currency: null,
    changePct: prevClose != null ? Math.round(((price / prevClose - 1) * 100) * 10_000) / 10_000 : null,
    open: num(last.o),
    high: num(last.h),
    low: num(last.l),
    prevClose,
    closingPrice: price,
    tradeHour: null,
    volume: Number(last.v) || null,
    source: 'byma-history',
  }
}
