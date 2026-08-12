import { assertEquals } from '@std/assert'
import {
  extractPlan,
  findColumns,
  findHeaderRow,
  parsePercent,
  parseQuantity,
} from './import-plan/planner.ts'

Deno.test('findHeaderRow: encuentra la fila con Ticker y metadatos previos', () => {
  const rows = [
    ['Mi portafolio enero 2026'],
    ['Cartera: Conservadora'],
    ['Ticker', '% Meta', 'Tenencia'],
    ['GGAL', '10', '1000'],
  ]
  assertEquals(findHeaderRow(rows), 2)
})

Deno.test('findColumns: evita "Meta" como columna de symbol (solo Ticker)', () => {
  const cols = findColumns(['Meta', 'Ticker', '% Meta', 'Tenencia (cant)'])
  assertEquals(cols.symbol, 1)
  assertEquals(cols.target, 0)
  assertEquals(cols.quantity, 3)
})

Deno.test('findColumns: sin fila de Ticker no se usan las demás', () => {
  const cols = findColumns(['Peso', 'Cantidad'])
  assertEquals(cols.symbol, -1)
})

Deno.test('parsePercent: porcentaje y fracción equivalente', () => {
  assertEquals(parsePercent('10'), 10)
  assertEquals(parsePercent('10.5'), 10.5)
  assertEquals(parsePercent('10,5'), 10.5)
  assertEquals(parsePercent('5 %'), 5)
  assertEquals(parsePercent(0.5), 50)
  assertEquals(parsePercent(50), 50)
})

Deno.test('parsePercent: inválido devuelve null', () => {
  assertEquals(parsePercent(''), null)
  assertEquals(parsePercent('abc'), null)
})

Deno.test('parseQuantity: números, comas, puntos miles y vacío', () => {
  assertEquals(parseQuantity(1000), 1000)
  assertEquals(parseQuantity('1.500,50'), 1500.5)
  assertEquals(parseQuantity('1500,50'), 1500.5)
  assertEquals(parseQuantity('1500.50'), 1500.5)
  assertEquals(parseQuantity(''), 0)
  assertEquals(parseQuantity('abc'), 0)
})

Deno.test('extractPlan: arma los items ignorando metadatos y filas vacías', () => {
  const rows = [
    ['Mi portafolio'],
    ['Ticker', '% Meta', 'Tenencia'],
    ['ggal ', '20', '1.000'],
    ['', '', ''],
    ['YXM', '80%', '800'],
  ]
  const items = extractPlan(rows)
  assertEquals(items, [
    { symbol: 'GGAL', target: 20, quantity: 1000 },
    { symbol: 'YXM', target: 80, quantity: 800 },
  ])
})

Deno.test('extractPlan: sin fila de encabezados devuelve null', () => {
  assertEquals(extractPlan([['a', 'b'], ['1', '2']]), null)
})

Deno.test('extractPlan: símbolo inválido se saltea, resto avanza', () => {
  const rows = [
    ['Ticker', '% Meta', 'Tenencia'],
    ['', '20', '1000'],
    ['AAPL', '30', '200'],
  ]
  const items = extractPlan(rows)
  assertEquals(items, [{ symbol: 'AAPL', target: 30, quantity: 200 }])
})
