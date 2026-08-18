# Batch 9 — Hardening: CORS, reset de contraseña, rate limit

**Dominio:** backend (Edge Functions) + frontend (Auth). **Índice:** #9.
**Estado:** [x] HECHO (2026-08-17)

## Hallazgos que resuelve

- orig #9: CORS acepta cualquier `*.vercel.app` (`_shared/cors.ts:17-21`) — cualquier app gratuita de Vercel recibe el `Access-Control-Allow-Origin` reflejado. Requiere JWT del usuario para daño, pero el allowlist de previews es más amplio de lo necesario.
- orig #10: flujo de reset de contraseña roto — **YA RESUELTO en QW-F (2026-08-13)**: `App.js` maneja `PASSWORD_RECOVERY`, `NewPasswordScreen.js` existe y hay tests (`NewPasswordScreen.test.js` + `App.test.js`). El hallazgo del batch (escrito el 12/08) es stale; se verificó el flujo (Auth.js redirectTo → getSession del boot → recovery → updateUser → signOut) sin encontrar gaps. Solo queda la verificación manual del link en hosting.
- add #18: sin rate limit por usuario en las 3 funciones — solo `verify_jwt` (`config.toml:389-396`); un usuario autenticado puede martillar `quotes`/`parse-summary`; el cache de 60s (`quotes/index.ts:12`) solo mitiga dentro de un isolate.

## Criterio de éxito

- CORS restringido a un patrón propio del proyecto: **`localhost:3000` + `mandarina-fi.vercel.app` + `*.mandarina-fi.vercel.app`** (subdominios del dominio de producción, para futuros ambientes dev). **NO** `*.vercel.app` genérico ni prefijo `mandarina-*` (decisión del usuario: cualquier `mandarina-X.vercel.app` es ajeno al proyecto).
- Reset de contraseña funciona de punta a punta — verificado sin cambios de código (ver arriba).
- Rate limit por usuario en las 3 funciones: `_shared/rate_limit.ts` (en-memoria por isolate) + 429 con `Retry-After` y error claro.
- `deno test` verde (**98 tests**) + `deno lint` + `deno fmt --check` limpios.

## Tareas

1. **`_shared/cors.ts`**: `allowedOrigin` acepta https `mandarina-fi.vercel.app` y `*.mandarina-fi.vercel.app`, más exactos de `ALLOWED_ORIGINS` (`localhost:3000`); el resto devuelve `''`. Test nuevo `_shared/cors_test.ts` (prod, subdominio dev, localhost OK; otro `*.vercel.app`, `mandarina-evil`, preview `mandarina-fi-<hash>.vercel.app`, http, null → rechazado). Nota: los previews automáticos de Vercel (`mandarina-fi-<hash>-<scope>.vercel.app`) NO quedan permitidos; si algún día se necesita un preview, crear un subdominio dev.
2. **Reset de contraseña**: ya resuelto en QW-F — se verificó el flujo sin gaps y se cierra sin tocar código. Queda la verificación manual del link en hosting como paso de QA.
3. **Rate limit por usuario**: `_shared/rate_limit.ts` nuevo: `createRateLimiter({ limit, windowMs })` → `check(key, now?)` (Map por isolate, limpieza lazy, `now` inyectable). Límites: **quotes 30/min, parse-summary 10/min, import-plan 10/min**. Hooks: quotes tras `getUser()` en `Deno.serve`; parse-summary en `handleParse` tras resolver `summary` (usa `summary.user_id`, parámetro opcional `limiter`); import-plan en `handleImport` tras `getUser()` (parámetro opcional `limiter`). 429 con `Retry-After` + `'Demasiadas solicitudes...'`. **Limitación multi-isolate documentada** en el header del módulo y en `DECISIONS.md`.
4. Verificación: smoke test del CORS desplegado (OPTIONS con origin evil/prod/dev + JWT inválido → 401).

## Tests

- `_shared/cors_test.ts` (nuevo, 8) — allowlist.
- `_shared/rate_limit_test.ts` (nuevo, 5) — ventana, retryAfter, reset, keys independientes.
- `handler_test.ts` (parse-summary) — +1: 429 con Retry-After.
- `import-plan/handler_test.ts` — +1: 429.
- Suite backend: **98/98** (+15). Frontend sin cambios (reset ya testeado en QW-F).

## Documentación

- `DECISIONS.md`: CORS subdominios propios (usuario), rate limit en-memoria por isolate + límites, reset ya resuelto.
- Deploy aplicado (2026-08-17): `supabase functions deploy quotes parse-summary import-plan` (sin `db push`, sin migraciones).
- `DONE.md` + `HANDOFF.md` actualizados al cierre.

## Checklist de cierre

- [x] `deno test` verde (98/98)
- [x] `deno lint` + `deno fmt --check` limpios
- [x] Funciones redeployadas (quotes, parse-summary, import-plan)
- [x] Smoke test CORS en hosting (evil → sin ACAO; prod/dev → ACAO; JWT inválido → 401)
- [ ] Verificación manual del link de reset en hosting (QA del usuario)
- [x] Índice `batches/README.md` marcado [x]