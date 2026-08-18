// Rate limit básico por usuario en memoria, compartido por las Edge Functions.
// Cada isolate mantiene su propio contador: el límite es POR INSTANCIA, no
// global (con N isolates el tope real se multiplica por N). Es una defensa
// razonable para una app personal; un límite global requeriría un contador en
// DB o el Edge Rate Limiting de Supabase.

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number }

export type RateLimiter = (key: string, now?: number) => RateLimitResult

// `now` es inyectable para tests deterministas; en producción usa Date.now().
export function createRateLimiter(opts: {
  limit: number
  windowMs: number
}): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return function check(key: string, now = Date.now()): RateLimitResult {
    let entry = hits.get(key)
    // Entrada vencida: se resetea (limpieza lazy, no hace falta un timer).
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs }
      hits.set(key, entry)
    }
    entry.count += 1
    if (entry.count > opts.limit) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      }
    }
    return { allowed: true }
  }
}
