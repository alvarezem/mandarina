import { createClient } from '@supabase/supabase-js'

function publishableKey(): string {
  try {
    const keys = JSON.parse(
      Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}',
    ) as Record<string, string>
    return keys['default'] ?? ''
  } catch {
    return ''
  }
}

export function createUserClient(authHeader: string | null) {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', publishableKey(), {
    global: { headers: { Authorization: authHeader ?? '' } },
  })
}
