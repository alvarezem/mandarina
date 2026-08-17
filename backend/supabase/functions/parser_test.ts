import { assertEquals } from '@std/assert'
import {
  detectSeparator,
  findColumns,
  mapRows,
  parseAmount,
  parseDate,
  pdfColumn,
} from './parse-summary/parser.ts'

Deno.test('detectSeparator: elige ; cuando el CSV usa ;', () => {
  assertEquals(
    detectSeparator('fecha;descripcion;importe\n01-ENE-26;super;123.45'),
    ';',
  )
})

Deno.test('detectSeparator: default , cuando no hay separador claro', () => {
  assertEquals(detectSeparator(''), ',')
})

Deno.test('findColumns: ubica Fecha, Descripción e Importe en cualquier orden', () => {
  const cols = findColumns(['Importe', 'Fecha', 'Descripción'])
  assertEquals(cols.date, 1)
  assertEquals(cols.merchant, 2)
  assertEquals(cols.amount, 0)
})

Deno.test('mapRows: parsea filas bajo la fila de encabezados', () => {
  const rows = [
    ['Metadato', 'irrelevante'],
    ['Fecha', 'Descripción', 'Importe'],
    ['01-ENE-26', 'SUPERMERCADO COTO', '-1250.50'],
    ['', '', ''],
    ['02-ENE-26', '', '500,25'],
  ]
  const txs = mapRows(rows)
  assertEquals(txs.length, 2)
  assertEquals(txs[0], {
    date: '2026-01-01',
    merchant: 'SUPERMERCADO COTO',
    amount: -1250.5,
    currency: 'ARS',
  })
  assertEquals(txs[1].merchant, 'Sin descripción')
  assertEquals(txs[1].amount, 500.25)
})

Deno.test('mapRows: Cargo y Abono en columnas separadas', () => {
  const rows = [
    ['Fecha', 'Descripción', 'Cargo', 'Abono'],
    ['01-ENE-26', 'SUPER COTO', '1250.50', ''],
    ['02-ENE-26', 'TRANSFERENCIA', '', '500'],
  ]
  const txs = mapRows(rows)
  assertEquals(txs.length, 2)
  assertEquals(txs[0].amount, -1250.5)
  assertEquals(txs[1].amount, -500)
})

Deno.test('mapRows: columna de moneda decide la moneda', () => {
  const rows = [
    ['Fecha', 'Descripción', 'Importe', 'Moneda'],
    ['01-ENE-26', 'NETFLIX', '12,50', 'USD'],
    ['02-ENE-26', 'COTO', '1000', 'ARS'],
  ]
  const txs = mapRows(rows)
  assertEquals(txs[0].currency, 'USD')
  assertEquals(txs[1].currency, 'ARS')
})

Deno.test('mapRows: encabezado de monto USD fuerza la moneda', () => {
  const txs = mapRows([
    ['Fecha', 'Descripción', 'Monto USD'],
    ['01-ENE-26', 'SPOTIFY', '10'],
  ])
  assertEquals(txs[0].currency, 'USD')
})

Deno.test('findColumns: ubica Fecha, Descripción e Importe en cualquier orden', () => {
  const cols = findColumns(['Importe', 'Fecha', 'Descripción'])
  assertEquals(cols.date, 1)
  assertEquals(cols.merchant, 2)
  assertEquals(cols.amount, 0)
  assertEquals(cols.currency, -1)
  assertEquals(cols.currencyDefault, 'ARS')
})

Deno.test('mapRows: sin fila de encabezados devuelve []', () => {
  assertEquals(mapRows([['a', 'b'], ['c', 'd']]), [])
})

Deno.test('mapRows: sin columna de importe devuelve []', () => {
  assertEquals(mapRows([['Fecha', 'Descripción'], ['01-ENE-26', 'x']]), [])
})

Deno.test('parseDate: formato 01-ENE-26 -> ISO', () => {
  assertEquals(parseDate('01-ENE-26'), '2026-01-01')
  assertEquals(parseDate('31-DIC-25'), '2025-12-31')
})

Deno.test('parseDate: formato dd/mm/yyyy e ISO', () => {
  assertEquals(parseDate('15/03/2026'), '2026-03-15')
  assertEquals(parseDate('2026-03-15'), '2026-03-15')
})

Deno.test('parseDate: inválido devuelve null', () => {
  assertEquals(parseDate('no es fecha'), null)
})

Deno.test('parseAmount: número, coma decimal y punto miles', () => {
  assertEquals(parseAmount('-1250.50'), -1250.5)
  assertEquals(parseAmount('1.234,56'), 1234.56)
  assertEquals(parseAmount('1234,56'), 1234.56)
  assertEquals(parseAmount(500), 500)
  assertEquals(parseAmount(' $ 12,50 '), 12.5)
})

Deno.test('parseAmount: inválido devuelve null', () => {
  assertEquals(parseAmount(''), null)
  assertEquals(parseAmount('-'), null)
  assertEquals(parseAmount('abc'), null)
})

Deno.test('pdfColumn: rangos posicionales de columnas', () => {
  assertEquals(pdfColumn(50), 'date')
  assertEquals(pdfColumn(200), 'desc')
  assertEquals(pdfColumn(420), 'cupon')
  assertEquals(pdfColumn(480), 'pesos')
  assertEquals(pdfColumn(600), 'dolares')
})
