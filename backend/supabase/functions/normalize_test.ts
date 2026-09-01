import { assertEquals } from '@std/assert'
import {
  HEADER_ALIASES,
  matchExact,
  matchFuzzy,
  normalizeHeader,
} from './_shared/normalize.ts'

Deno.test('normalizeHeader: minúsculas y sin acentos', () => {
  assertEquals(normalizeHeader('Descripción  Meta'), 'descripcion meta')
})

Deno.test('normalizeHeader: guiones y underscores a espacio, colapsa whitespace', () => {
  assertEquals(normalizeHeader('Peso-Meta__%'), 'peso meta %')
  assertEquals(normalizeHeader('  Target   Weight '), 'target weight')
})

Deno.test('normalizeHeader: cadena vacía y no-string', () => {
  assertEquals(normalizeHeader(''), '')
  assertEquals(normalizeHeader('   '), '')
  assertEquals(normalizeHeader(null), '')
  assertEquals(normalizeHeader(undefined), '')
})

Deno.test('matchExact: solo coincide cuando el header ES el alias', () => {
  assertEquals(matchExact('Fecha', 'fecha'), true)
  assertEquals(matchExact('Fecha liberación', 'fecha liberacion'), true)
  assertEquals(matchExact('Fecha de liberación', 'fecha liberacion'), false)
})

Deno.test('matchExact: matchea los aliases de HEADER_ALIASES', () => {
  for (const alias of HEADER_ALIASES.date) {
    if (!alias.includes('_') && !alias.includes('-')) {
      assertEquals(matchExact(alias, alias), true)
    }
  }
  // Aliases con _/- se normalizan a espacios; verificar forma normalizada
  assertEquals(matchExact('transaction_date', 'transaction date'), true)
  assertEquals(matchExact('transaction amount', 'transaction amount'), true)
  assertEquals(matchExact('real amount', 'real amount'), true)
  assertEquals(matchExact('transaction_amount', 'transaction amount'), true)
  assertEquals(matchExact('real_amount', 'real amount'), true)
  assertEquals(matchExact('business_unit', 'business unit'), true)
  assertEquals(matchExact('sub_unit', 'sub unit'), true)
  assertEquals(matchExact('source_id', 'source id'), true)
  assertEquals(matchExact('importe', 'importe'), true)
  assertEquals(matchExact('monto usd', 'monto usd'), true)
})

Deno.test('matchFuzzy: alias completo o token incluido', () => {
  assertEquals(matchFuzzy('Ticker', 'ticker'), true)
  assertEquals(matchFuzzy('Meta %', 'meta'), true)
  assertEquals(matchFuzzy('% Meta objetivo', 'meta'), true)
  assertEquals(matchFuzzy('Tenencia (cant)', 'tenencia'), true)
  assertEquals(matchFuzzy('Peso Meta (USD)', 'peso meta'), true)
})

Deno.test('matchFuzzy: no matchea celdas vacías ni no relacionadas', () => {
  assertEquals(matchFuzzy('', 'meta'), false)
  assertEquals(matchFuzzy('', 'ticker'), false)
  assertEquals(matchFuzzy(null, 'meta'), false)
  assertEquals(matchFuzzy('Mercado', 'meta'), false)
  assertEquals(matchFuzzy('target', 'tenencia'), false)
})
