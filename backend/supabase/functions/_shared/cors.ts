// CORS compartido para las Edge Functions.
// Orígenes permitidos: local dev, producción y previews de Vercel (*.vercel.app).
// Se refleja el Origin del request solo si está permitido (CORS con Vary: Origin).

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://mandarina-fi.vercel.app',
]

const VERCEL_PREVIEW_SUFFIX = '.vercel.app'

export function allowedOrigin(origin: string | null): string {
  if (!origin) return ''
  try {
    const url = new URL(origin)
    if (
      url.protocol === 'https:' && url.hostname.endsWith(VERCEL_PREVIEW_SUFFIX)
    ) {
      return origin
    }
    return ALLOWED_ORIGINS.includes(origin) ? origin : ''
  } catch {
    return ''
  }
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = allowedOrigin(origin)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin
    headers['Vary'] = 'Origin'
  }
  return headers
}

export const json = (
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
