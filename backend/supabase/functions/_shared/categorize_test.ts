import { categorize } from './categorize.ts'
import { assertEquals } from '@std/assert'

Deno.test('categorize: telecom va a Servicios (alineado con migración 0009)', () => {
  assertEquals(categorize('Telecom Argentina'), 'Servicios')
  assertEquals(categorize('TELEFONICA ARGENTINA'), 'Servicios')
  assertEquals(categorize('servicio electrico'), 'Servicios')
  assertEquals(categorize('Telecentro internet'), 'Servicios')
})

Deno.test('categorize: reglas conocidas intactas', () => {
  assertEquals(categorize('SUPERMERCADOS COTO'), 'Supermercados')
  assertEquals(categorize('Pizzeria Guerrin'), 'Gastronomía')
  assertEquals(categorize('Inversiones Bull Market'), 'Inversiones')
  assertEquals(categorize('algo desconocido'), 'Otros')
})
