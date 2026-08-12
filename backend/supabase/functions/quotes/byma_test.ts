import { bymaLastClose, bymaQuote } from './byma.ts'
import { assert, assertEquals } from '@std/assert'

const ZEROS_QUOTE = {
  data: [
    {
      symbol: 'GGAL',
      trade: 0,
      openingPrice: 0,
      tradingHighPrice: 0,
      tradingLowPrice: 0,
      previousClosingPrice: 0,
      closingPrice: 0,
      tradeVolume: 0,
      denominationCcy: 'ARS',
    },
  ],
}

const HISTORY_OK = {
  s: 'ok',
  t: [1785726000, 1785812400, 1785898800],
  o: [9000, 9100, 9200],
  h: [9100, 9200, 9300],
  l: [8900, 9000, 9100],
  c: [9000, 10000, 11000],
  v: [100, 200, 300],
}

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  globalThis.fetch =
    ((input: string | URL, init?: RequestInit) =>
      Promise.resolve(
        new Response(JSON.stringify(handler(String(input), init))),
      )) as typeof fetch
}

Deno.test('bymaQuote: devuelve null cuando el endpoint devuelve todo en ceros', async () => {
  mockFetch(() => ZEROS_QUOTE)
  const quote = await bymaQuote('GGAL')
  assertEquals(quote, null)
})

Deno.test('bymaQuote: devuelve null cuando el endpoint responde sin data', async () => {
  mockFetch(() => ({ data: [] }))
  assertEquals(await bymaQuote('INEXISTENTE'), null)
})

Deno.test('bymaQuote: parsea precio y variación con datos reales', async () => {
  mockFetch(() => ({
    data: [{
      trade: 11000,
      previousClosingPrice: 10000,
      denominationCcy: 'ARS',
      openingPrice: 10800,
      tradingHighPrice: 11200,
      tradingLowPrice: 10700,
      closingPrice: 11000,
      tradeVolume: 5000,
      tradeHour: '15:20:00',
    }],
  }))
  const q = await bymaQuote('GGAL')
  assert(q != null)
  assertEquals(q.price, 11000)
  assertEquals(q.changePct, 10)
  assertEquals(q.prevClose, 10000)
  assertEquals(q.tradeHour, '15:20')
  assertEquals(q.currency, 'ARS')
})

Deno.test('bymaLastClose: usa el último cierre del histórico como fallback', async () => {
  mockFetch(() => HISTORY_OK)
  const q = await bymaLastClose('GGAL')
  assert(q != null)
  assertEquals(q.price, 11000)
  assertEquals(q.changePct, 10)
  assertEquals(q.prevClose, 10000)
  assertEquals(q.open, 9200)
  assertEquals(q.high, 9300)
  assertEquals(q.low, 9100)
  assertEquals(q.volume, 300)
  assertEquals(q.source, 'byma-history')
})

Deno.test('bymaLastClose: null cuando el histórico viene vacío o falla', async () => {
  mockFetch(() => ({ s: 'no_data' }))
  assertEquals(await bymaLastClose('GGAL'), null)

  mockFetch(() => {
    throw new Error('network')
  })
  assertEquals(await bymaLastClose('GGAL'), null)
})

Deno.test('bymaLastClose: sin variación si hay una sola barra', async () => {
  mockFetch(() => ({
    ...HISTORY_OK,
    t: [1785726000],
    o: [9000],
    h: [9000],
    l: [9000],
    c: [9000],
    v: [100],
  }))
  const q = await bymaLastClose('GGAL')
  assert(q != null)
  assertEquals(q.price, 9000)
  assertEquals(q.changePct, null)
})
