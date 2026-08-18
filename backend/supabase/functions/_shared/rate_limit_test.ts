import { assertEquals } from '@std/assert'
import { createRateLimiter } from './rate_limit.ts'

Deno.test('rate limit: dentro del límite permite', () => {
  const check = createRateLimiter({ limit: 2, windowMs: 60_000 })
  assertEquals(check('u1', 1000), { allowed: true })
  assertEquals(check('u1', 1001), { allowed: true })
})

Deno.test('rate limit: superado -> denegado con retryAfter', () => {
  const check = createRateLimiter({ limit: 2, windowMs: 60_000 })
  check('u1', 1000)
  check('u1', 1001)
  assertEquals(check('u1', 1002), { allowed: false, retryAfterSec: 60 })
  assertEquals(check('u1', 1003), { allowed: false, retryAfterSec: 60 })
})

Deno.test('rate limit: retryAfter baja según el tiempo restante', () => {
  const check = createRateLimiter({ limit: 1, windowMs: 60_000 })
  check('u1', 1000)
  assertEquals(check('u1', 1010), { allowed: false, retryAfterSec: 60 })
  assertEquals(check('u1', 30_010), { allowed: false, retryAfterSec: 31 })
})

Deno.test('rate limit: la ventana vencida resetea el contador', () => {
  const check = createRateLimiter({ limit: 1, windowMs: 60_000 })
  check('u1', 1000)
  assertEquals(check('u1', 1001), { allowed: false, retryAfterSec: 60 })
  // 60s después: ventana nueva, vuelve a permitir.
  assertEquals(check('u1', 61_000), { allowed: true })
})

Deno.test('rate limit: contadores independientes por key', () => {
  const check = createRateLimiter({ limit: 1, windowMs: 60_000 })
  check('u1', 1000)
  assertEquals(check('u1', 1001), { allowed: false, retryAfterSec: 60 })
  // Otro usuario no se ve afectado.
  assertEquals(check('u2', 1001), { allowed: true })
})
