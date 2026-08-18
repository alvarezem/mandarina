import { assertEquals } from '@std/assert'
import { allowedOrigin, corsHeaders } from './cors.ts'

Deno.test('allowedOrigin: localhost dev permitido', () => {
  assertEquals(allowedOrigin('http://localhost:3000'), 'http://localhost:3000')
})

Deno.test('allowedOrigin: dominio de producción permitido', () => {
  assertEquals(
    allowedOrigin('https://mandarina-fi.vercel.app'),
    'https://mandarina-fi.vercel.app',
  )
})

Deno.test('allowedOrigin: subdominio del dominio de producción permitido', () => {
  assertEquals(
    allowedOrigin('https://dev.mandarina-fi.vercel.app'),
    'https://dev.mandarina-fi.vercel.app',
  )
})

Deno.test('allowedOrigin: otro *.vercel.app ajeno NO permitido', () => {
  assertEquals(allowedOrigin('https://evil-app.vercel.app'), '')
  // Preview de un proyecto ajeno cuyo nombre arranca con "mandarina-".
  assertEquals(allowedOrigin('https://mandarina-evil.vercel.app'), '')
})

Deno.test('allowedOrigin: preview de Vercel del proyecto NO permitido', () => {
  // mandarina-fi-<hash>-<scope>.vercel.app no es subdominio de
  // mandarina-fi.vercel.app (los previews automáticos no quedan en el allowlist).
  assertEquals(
    allowedOrigin('https://mandarina-fi-abc123-alvarezem.vercel.app'),
    '',
  )
})

Deno.test('allowedOrigin: subdominio sin https NO permitido', () => {
  assertEquals(allowedOrigin('http://dev.mandarina-fi.vercel.app'), '')
})

Deno.test('allowedOrigin: origin null o inválido -> vacío', () => {
  assertEquals(allowedOrigin(null), '')
  assertEquals(allowedOrigin(''), '')
  assertEquals(allowedOrigin('no-es-una-url'), '')
})

Deno.test('corsHeaders: refleja ACAO solo para orígenes permitidos', () => {
  const ok = corsHeaders('https://mandarina-fi.vercel.app')
  assertEquals(
    ok['Access-Control-Allow-Origin'],
    'https://mandarina-fi.vercel.app',
  )
  assertEquals(ok['Vary'], 'Origin')

  const ko = corsHeaders('https://evil-app.vercel.app')
  assertEquals(ko['Access-Control-Allow-Origin'], undefined)
  assertEquals(ko['Vary'], undefined)
})
