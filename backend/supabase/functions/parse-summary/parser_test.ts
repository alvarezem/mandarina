import {
  type ColumnMap,
  detectSeparator,
  findColumns,
  mapRows,
  normalizeRow,
  parseAmount,
  parseDate,
} from './parser.ts'
import { assertEquals } from '@std/assert'

const MP_HEADER = [
  'SOURCE_ID',
  'PAYMENT_METHOD_TYPE',
  'TRANSACTION_TYPE',
  'TRANSACTION_AMOUNT',
  'TRANSACTION_DATE',
  'FEE_AMOUNT',
  'SETTLEMENT_DATE',
  'REAL_AMOUNT',
  'TAXES_AMOUNT',
  'BUSINESS_UNIT',
  'SUB_UNIT',
  'MONEY_RELEASE_DATE',
]

const MP_ROW = [
  175586038427,
  'bank_transfer',
  'SETTLEMENT',
  2428963.00,
  '2026-08-31T14:03:58.000-04:00',
  0.00,
  '2026-08-31T14:03:58.000-04:00',
  2428963.00,
  0.00,
  'Mercado Pago',
  'QR',
  '2026-08-31T14:03:58.000-04:00',
]

const MP_NEGATIVE_ROW = [
  175954220904,
  'available_money',
  'SETTLEMENT',
  -28472.00,
  '2026-08-27T19:26:51.000-04:00',
  0.00,
  '2026-08-28T20:51:08.000-04:00',
  -28472.00,
  0.00,
  '',
  '',
  '',
]

const MP_NO_UNIT_ROW = [
  1749157618628,
  '',
  'SETTLEMENT',
  1295.33,
  '2026-08-31T01:21:02.000-04:00',
  0.00,
  '2026-08-31T01:21:02.000-04:00',
  1295.33,
  0.00,
  '',
  '',
  '',
]

const MP_HEADER_ALT = [
  'SOURCE_ID',
  'PAYMENT_METHOD_TYPE',
  'TRANSACTION_TYPE',
  'REAL_AMOUNT',
  'TRANSACTION_DATE',
  'FEE_AMOUNT',
  'SETTLEMENT_DATE',
  'TAXES_AMOUNT',
  'BUSINESS_UNIT',
  'SUB_UNIT',
  'MONEY_RELEASE_DATE',
]

Deno.test('detectSeparator: CSV de MercadoPago usa punto y coma', () => {
  const csv = 'SOURCE_ID;PAYMENT_METHOD_TYPE;TRANSACTION_AMOUNT\n1;MP;100'
  assertEquals(detectSeparator(csv), ';')
})

Deno.test('findColumns: detecta columnas de MercadoPago', () => {
  const cols: ColumnMap = findColumns(MP_HEADER)
  assertEquals(cols.date, 4)
  assertEquals(cols.amount, 3)
  assertEquals(cols.merchant, -1)
  assertEquals(cols.businessUnit, 9)
  assertEquals(cols.subUnit, 10)
  assertEquals(cols.sourceId, 0)
  assertEquals(cols.amountIsDebit, false)
})

Deno.test('findColumns: detecta REAL_AMOUNT como monto cuando TRANSACTION_AMOUNT no existe', () => {
  const cols: ColumnMap = findColumns(MP_HEADER_ALT)
  assertEquals(cols.date, 4)
  assertEquals(cols.amount, 3)
  assertEquals(cols.merchant, -1)
  assertEquals(cols.businessUnit, 8)
  assertEquals(cols.subUnit, 9)
  assertEquals(cols.sourceId, 0)
  assertEquals(cols.amountIsDebit, false)
})

Deno.test('normalizeRow: parsea fila de MercadoPago', () => {
  const cols = findColumns(MP_HEADER)
  const result = normalizeRow(MP_ROW, cols)
  assertEquals(result, {
    date: '2026-08-31',
    merchant: 'Mercado Pago / QR',
    amount: 2428963,
    currency: 'ARS',
  })
})

Deno.test('normalizeRow: respeta signo negativo (no fuerza)', () => {
  const cols = findColumns(MP_HEADER)
  const result = normalizeRow(MP_NEGATIVE_ROW, cols)
  assertEquals(result?.amount, -28472)
})

Deno.test('normalizeRow: merchant Sin descripción cuando no hay BUSINESS_UNIT ni SUB_UNIT', () => {
  const cols = findColumns(MP_HEADER)
  const result = normalizeRow(MP_NO_UNIT_ROW, cols)
  assertEquals(result?.merchant, 'Sin descripción')
})

Deno.test('mapRows: parsea CSV completo de MercadoPago', () => {
  const header = MP_HEADER as unknown as string[]
  const row = MP_ROW as unknown as string[]
  const rows = [header, row]
  const result = mapRows(rows)
  assertEquals(result.length, 1)
  assertEquals(result[0], {
    date: '2026-08-31',
    merchant: 'Mercado Pago / QR',
    amount: 2428963,
    currency: 'ARS',
  })
})

Deno.test('parseDate: acepta ISO 8601 con timezone', () => {
  assertEquals(
    parseDate('2026-08-31T14:03:58.000-04:00'),
    '2026-08-31',
  )
})

Deno.test('parseAmount: parsea montos numéricos sin formato', () => {
  assertEquals(parseAmount(2428963.00), 2428963)
  assertEquals(parseAmount(-28472), -28472)
})
