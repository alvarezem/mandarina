# Batch 9 — Hardening: CORS, reset de contraseña, rate limit

**Dominio:** backend (Edge Functions) + frontend (Auth). **Índice:** #9.
**Estado:** [ ] pendiente

## Hallazgos que resuelve

- orig #9: CORS acepta cualquier `*.vercel.app` (`_shared/cors.ts:17-21`) — cualquier app gratuita de Vercel recibe el `Access-Control-Allow-Origin` reflejado. Requiere JWT del usuario para daño, pero el allowlist de previews es más amplio de lo necesario.
- orig #10: flujo de reset de contraseña roto — `Auth.js:126-144` manda `redirectTo: window.location.origin` pero `App.js` no maneja `PASSWORD_RECOVERY` ni canjea el token → el link de Supabase vuelve a la home y no hay pantalla de nueva contraseña.
- add #18: sin rate limit por usuario en las 3 funciones — solo `verify_jwt` (`config.toml:389-396`); un usuario autenticado puede martillar `quotes`/`parse-summary`; el cache de 60s (`quotes/index.ts:12`) solo mitiga dentro de un isolate.

## Criterio de éxito

- CORS restringido a un patrón propio del proyecto (ej. `mandarina-fi.vercel.app` + previews del proyecto + `localhost:3000`), no `*.vercel.app` genérico.
- Reset de contraseña funciona de punta a punta: link de Supabase → pantalla de nueva contraseña (`NewPasswordScreen.js` ya existe) → sesión actualizada.
- Rate limit básico por usuario en las funciones (al menos en `quotes` y `parse-summary`): límite de requests en ventana, con 429 y error claro.
- `npm test` verde (Auth.test.js, NewPasswordScreen.test.js, App.test.js) + `deno test` verde.

## Tareas

1. **`_shared/cors.ts:17-21`**: reemplazar `*.vercel.app` por un allowlist específico del proyecto (dominio de producción + patrón de previews del proyecto + localhost). Verificar que los previews de Vercel del proyecto sigan funcionando.
2. **Reset de contraseña**:
   - `App.js`: manejar el evento `PASSWORD_RECOVERY` de Supabase (`supabase.auth.onAuthStateChange`) y renderizar `NewPasswordScreen` cuando el token esté presente.
   - Verificar que el `redirectTo` en `Auth.js:126-144` aterriza en la pantalla correcta.
   - Tests del flujo (App.test.js, NewPasswordScreen.test.js).
3. **Rate limit por usuario**: en `quotes/index.ts` y `parse-summary/index.ts` (y evaluar `import-plan`), agregar un contador por `user_id` en ventana de tiempo (estado en-memoria por isolate — documentar la limitación de multi-isolate) con respuesta 429. Test del límite.
4. Verificación end-to-end del reset (deploy + prueba manual del link de Supabase).

## Tests a tocar

- `frontend/src/components/Auth.test.js` — redirectTo / PASSWORD_RECOVERY.
- `frontend/src/components/NewPasswordScreen.test.js` — canje de token.
- `frontend/src/App.test.js` — render de NewPasswordScreen en PASSWORD_RECOVERY.
- Backend: handler_test.ts (429) si aplica.

## Documentación

- `DECISIONS.md` si se decide el criterio de rate limit (y su limitación multi-isolate).
- Nota de deploy: redeploy de las 3 funciones.
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `deno test` verde
- [ ] Funciones redeployadas
- [ ] Reset de contraseña verificado en hosting
- [ ] Índice `batches/README.md` marcado [x]