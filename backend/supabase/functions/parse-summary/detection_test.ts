import { detectPeriod, detectSummaryType } from './detection.ts'
import { assertEquals } from '@std/assert'

Deno.test('detectSummaryType: alias de tarjetas de crédito', () => {
  assertEquals(detectSummaryType('visa-julio.pdf', true), 'VISA')
  assertEquals(detectSummaryType('VISA.pdf', true), 'VISA')
  assertEquals(detectSummaryType('mastercard-junio.pdf', true), 'MASTERCARD')
  assertEquals(detectSummaryType('mc-junio.csv', false), 'MASTERCARD')
  assertEquals(detectSummaryType('master resumen.csv', false), 'MASTERCARD')
  assertEquals(detectSummaryType('amex.pdf', true), 'AMEX')
  assertEquals(detectSummaryType('american express julio.pdf', true), 'AMEX')
})

Deno.test('detectSummaryType: billeteras virtuales', () => {
  for (const n of ['mercadopago.csv', 'MercadoPago.csv', 'mp-2026.csv', 'MP julio.csv', 'uala.csv', 'brubank.csv', 'naranja x.csv', 'lemon.csv', 'binance.csv', 'belo.csv', 'crypto-julio.pdf']) {
    assertEquals(detectSummaryType(n, n.endsWith('.pdf')), 'Billetera virtual', n)
  }
})

Deno.test('detectSummaryType: brokers', () => {
  for (const n of ['iol-resumen.csv', 'balanz.csv', 'bull market.pdf', 'ppi.csv', 'cocos.csv', 'adcap.csv', 'del sur.csv', 'socma.csv', 'portfolio.csv']) {
    assertEquals(detectSummaryType(n, n.endsWith('.pdf')), 'Broker', n)
  }
})

Deno.test('detectSummaryType: bancos', () => {
  for (const n of ['banco gallego.pdf', 'bbva.pdf', 'BBVA.pdf', 'santander.csv', 'galicia.csv', 'nacion.csv', 'Nación.csv', 'provincia.csv', 'frances.csv', 'ciudad.csv', 'hipotecario.csv', 'macro.csv', 'supervielle.csv', 'patagonia.csv', 'hsbc.csv', 'comafi.csv']) {
    assertEquals(detectSummaryType(n, n.endsWith('.pdf')), 'Banco', n)
  }
})

Deno.test('detectSummaryType: el tipo de tarjeta tiene prioridad sobre el banco', () => {
  assertEquals(detectSummaryType('bbva-visa.pdf', true), 'VISA')
  assertEquals(detectSummaryType('santander mastercard.pdf', true), 'MASTERCARD')
  assertEquals(detectSummaryType('nacion amex.csv', false), 'AMEX')
})

Deno.test('detectSummaryType: fallback PDF sin alias → Banco', () => {
  assertEquals(detectSummaryType('resumen-julio.pdf', true), 'Banco')
  assertEquals(detectSummaryType('estado-cuenta-2026.pdf', true), 'Banco')
})

Deno.test('detectSummaryType: detecta la marca en el contenido del PDF', () => {
  assertEquals(detectSummaryType('resumen.pdf', true, 'Resumen con vencimiento Visa OCASA'), 'VISA')
  assertEquals(detectSummaryType('resumen.pdf', true, 'Resumen con vencimiento Mastercard Black'), 'MASTERCARD')
  assertEquals(detectSummaryType('resumen.pdf', true, 'American Express tarjeta de credito'), 'AMEX')
  assertEquals(detectSummaryType('resumen.pdf', true, 'Mercado Pago cuenta'), 'Billetera virtual')
  assertEquals(detectSummaryType('resumen.pdf', true, 'resumen de cuenta comafi'), 'Banco')
})

Deno.test('detectSummaryType: el nombre tiene prioridad sobre el contenido', () => {
  assertEquals(detectSummaryType('mastercard.pdf', true, 'Resumen Visa OCASA'), 'MASTERCARD')
  assertEquals(detectSummaryType('visa.pdf', true, 'Mastercard Black'), 'VISA')
})

Deno.test('detectSummaryType: contenido sin alias → fallback Banco (PDF)', () => {
  assertEquals(detectSummaryType('resumen.pdf', true, 'titular emmanuel arganaraz consolidado cierre'), 'Banco')
  assertEquals(detectSummaryType('resumen.pdf', true, ''), 'Banco')
})

Deno.test('detectSummaryType: CSV sin alias se ignora el texto (filename-only)', () => {
  assertEquals(detectSummaryType('resumen.csv', false, 'Mastercard Black'), null)
})

Deno.test('detectSummaryType: sin alias en CSV/XLSX → null', () => {
  assertEquals(detectSummaryType('resumen-julio.csv', false), null)
  assertEquals(detectSummaryType('Finance.xlsx', false), null)
  assertEquals(detectSummaryType(undefined, false), null)
  assertEquals(detectSummaryType(null, false), null)
})

Deno.test('detectSummaryType: nombres con slash y solo el nombre de archivo', () => {
  assertEquals(detectSummaryType('MC Julio/26.pdf', true), 'MASTERCARD')
  assertEquals(detectSummaryType('VISA Julio/26.csv', false), 'VISA')
})

Deno.test('detectPeriod: todas las transacciones en un mes', () => {
  const txs = [
    { date: '2026-07-01' },
    { date: '2026-07-05' },
    { date: '2026-07-31' },
  ]
  assertEquals(detectPeriod(txs), { period_month: 7, period_year: 2026 })
})

Deno.test('detectPeriod: elige el mes modal (mayoría)', () => {
  const txs = [
    { date: '2026-07-01' },
    { date: '2026-07-02' },
    { date: '2026-07-03' },
    { date: '2026-07-04' },
    { date: '2026-06-15' },
    { date: '2026-06-16' },
  ]
  assertEquals(detectPeriod(txs), { period_month: 7, period_year: 2026 })
})

Deno.test('detectPeriod: empate → primer mes en orden de aparición', () => {
  const txs = [
    { date: '2026-05-01' },
    { date: '2026-05-02' },
    { date: '2026-06-01' },
    { date: '2026-06-02' },
  ]
  assertEquals(detectPeriod(txs), { period_month: 5, period_year: 2026 })
})

Deno.test('detectPeriod: sin transacciones → null', () => {
  assertEquals(detectPeriod([]), { period_month: null, period_year: null })
})

Deno.test('detectPeriod: ignora fechas vacías', () => {
  const txs = [{ date: null }, { date: '2026-08-10' }]
  assertEquals(detectPeriod(txs), { period_month: 8, period_year: 2026 })
})
