// Procesa items con un límite de workers concurrentes.
// BYMA Open Data throttlea si le disparás muchas requests a la vez, así que
// acá limitamos la concurrencia a pocas en vez de Promise.allSettled completo.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => R | Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let i = 0
  const workerCount = Math.max(1, Math.min(limit, items.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}
