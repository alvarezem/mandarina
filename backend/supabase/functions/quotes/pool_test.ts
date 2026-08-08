import { mapWithConcurrency } from './pool.ts'
import { assertEquals } from 'jsr:@std/assert'

Deno.test('mapWithConcurrency: nunca supera el límite de concurrencia', async () => {
  let active = 0
  let maxActive = 0
  const items = [1, 2, 3, 4, 5, 6, 7, 8]
  const res = await mapWithConcurrency(items, 2, async (x) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((r) => setTimeout(r, 10))
    active -= 1
    return x * 2
  })
  assertEquals(res, [2, 4, 6, 8, 10, 12, 14, 16])
  assertEquals(maxActive <= 2, true)
})

Deno.test('mapWithConcurrency: resuelve todos los índices en orden', async () => {
  const res = await mapWithConcurrency(['a', 'b', 'c'], 1, async (x, i) => `${i}:${x}`)
  assertEquals(res, ['0:a', '1:b', '2:c'])
})

Deno.test('mapWithConcurrency: con límite 1 corre secuencial', async () => {
  const order: number[] = []
  await mapWithConcurrency([1, 2, 3], 1, async (x) => {
    order.push(x)
  })
  assertEquals(order, [1, 2, 3])
})
