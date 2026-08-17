import { assertEquals, assertThrows } from '@std/assert'
import {
  extractPlan,
  findColumns,
  findHeaderRow,
  parsePercent,
  parseQuantity,
  PlanError,
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
  assertEquals(cols.currency, -1)
  assertEquals(cols.assetType, -1)
})

Deno.test('findColumns: sin fila de Ticker no se usan las demás', () => {
  const cols = findColumns(['Peso', 'Cantidad'])
  assertEquals(cols.symbol, -1)
})

Deno.test('findColumns: detecta columnas de Moneda y Tipo de activo', () => {
  const cols = findColumns([
    'Ticker',
    '% Meta',
    'Tenencia',
    'Moneda',
    'Tipo de activo',
  ])
  assertEquals(cols.symbol, 0)
  assertEquals(cols.target, 1)
  assertEquals(cols.quantity, 2)
  assertEquals(cols.currency, 3)
  assertEquals(cols.assetType, 4)
})

Deno.test('parsePercent: toma el valor tal cual (el header ya es % Meta)', () => {
  assertEquals(parsePercent('10'), 10)
  assertEquals(parsePercent('10.5'), 10.5)
  assertEquals(parsePercent('10,5'), 10.5)
  assertEquals(parsePercent('5 %'), 5)
  assertEquals(parsePercent('1'), 1)
  assertEquals(parsePercent(0.5), 0.5)
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

Deno.test('parseQuantity: parsea el signo (la validación vive en extractPlan)', () => {
  assertEquals(parseQuantity('-10'), -10)
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
    {
      symbol: 'GGAL',
      target: 20,
      quantity: 1000,
      currency: 'ARS',
      asset_type: 'otro',
    },
    {
      symbol: 'YXM',
      target: 80,
      quantity: 800,
      currency: 'ARS',
      asset_type: 'otro',
    },
  ])
})

Deno.test('extractPlan: lee moneda y tipo del Excel con fallback documentado', () => {
  const rows = [
    ['Ticker', '% Meta', 'Tenencia', 'Moneda', 'Tipo'],
    ['GGAL', '20', '1000', 'USD', 'Acción'],
    ['BCAR', '30', '500', '', 'FCI'],
  ]
  const items = extractPlan(rows)
  assertEquals(items, [
    {
      symbol: 'GGAL',
      target: 20,
      quantity: 1000,
      currency: 'USD',
      asset_type: 'accion',
    },
    {
      symbol: 'BCAR',
      target: 30,
      quantity: 500,
      currency: 'ARS',
      asset_type: 'fci',
    },
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
  assertEquals(items, [
    {
      symbol: 'AAPL',
      target: 30,
      quantity: 200,
      currency: 'ARS',
      asset_type: 'otro',
    },
  ])
})

Deno.test('extractPlan: cantidad negativa se rechaza con el símbolo del item', () => {
  const rows = [
    ['Ticker', '% Meta', 'Tenencia'],
    ['GGAL', '20', '-10'],
  ]
  assertThrows(
    () => extractPlan(rows),
    PlanError,
    'La cantidad de "GGAL" no puede ser negativa',
  )
})

Deno.test('extractPlan: target > 100 se rechaza con el símbolo y el valor', () => {
  const rows = [
    ['Ticker', '% Meta', 'Tenencia'],
    ['GGAL', '150', '10'],
  ]
  assertThrows(
    () => extractPlan(rows),
    PlanError,
    'El porcentaje de "GGAL" (150%) debe estar entre 0 y 100',
  )
})

Deno.test('extractPlan: target negativo se rechaza', () => {
  const rows = [
    ['Ticker', '% Meta', 'Tenencia'],
    ['GGAL', '-5', '10'],
  ]
  assertThrows(
    () => extractPlan(rows),
    PlanError,
    'El porcentaje de "GGAL" (-5%) debe estar entre 0 y 100',
  )
})
