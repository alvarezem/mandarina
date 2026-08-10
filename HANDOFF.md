# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-09
- **Qué se hizo** (Fase 2 de improvements.md — seguridad y secretos):
  1. **Código de Fase 2 COMPLETO** (working tree con cambios sin commitear):
     - Borrados `backend/src/supabaseClient.js`, `backend/package*.json`, `backend/node_modules/`; `backend/.env.example` ahora documenta `SUPABASE_ANON_KEY` (sin service role).
     - `config.toml` endurecido (password ≥8 + letras/dígitos, confirmaciones on, `secure_password_change`, `max_frequency 10s`, `verify_jwt` en las 3 funciones, seed off, `realtime`/`s3_protocol`/`vector`/`analytics` apagados).
     - `_shared/cors.ts` (allowlist producción + `localhost:3000` + `*.vercel.app`, `Vary: Origin`) consumido por las 3 funciones.
     - `quotes`: cache LRU con cap 1000, `normalizeSymbols` (dedupe, máx 50, sin MEP/CCL), AbortSignal/timeouts.
     - `import-plan`: tope de `file_base64` (~5MB), reemplazo atómico vía RPC, `parseQuantity` robusto, mensajes genéricos.
     - `0013_replace_plan_rpc.sql`: `replace_user_plan(uuid, jsonb)` SECURITY INVOKER con guard `auth.uid()`.
     - `parse-summary`: UUID check, delete previo (idempotencia de re-parse), mensajes genéricos, signo PDF preservado, `setStatus` con try/catch.
     - `categorize.ts` + `telecom` → Servicios (+ test).
     - Frontend: `.eq('user_id', …)` en los 4 fetches + ~18 renders de `error.message` → mensajes amigables con `console.error`.
  2. **Verificación unitaria verde**: frontend `CI=true npm test` 149/149 + build OK; backend `deno test` 28/28.
  3. `git grep`: confirmado que el valor de la service role key nunca entró al historial.
  4. **Pendientes anotados en `improvements.md`** (sección FASE 2): rotar key en dashboard, aplicar settings de auth en dashboard, deploy de las 3 funciones, `supabase db push`, y `supabase db reset` local (requiere stack docker — abortado en esta sesión por decisión del usuario; no se levantó `supabase start`).

## En progreso

- **FASE 2** de `improvements.md` — código listo; falta la parte de hosting/manual:
  rotar service role key, aplicar auth settings en dashboard, deploy de funciones,
  `supabase db push` y verificar `supabase db reset`. Detalle y checklist en
  `improvements.md` (sección FASE 2, "Pendientes").

## Próximo paso sugerido

- Cerrar Fase 2: correr los pasos de hosting de `improvements.md` (rotar key,
  settings de auth en dashboard, `supabase functions deploy`, `supabase db push`,
  `supabase db reset` local) o pasar a **FASE 3 — Refactor del frontend**.

## Decisiones tomadas (a no re-litigar sin motivo)

- **Migración a Vite**: revertida una vez por decisión del usuario (la sesión se
  cayó a mitad); se volvió a encarar vía `improvements.md`. **HECHA en Fase 1**.
- **`instructions.md`**: borrado a propósito (spec original superada por
  TODO/DONE/README; sigue en historial git). No restaurar.
- **Memoria opencode**: por ahora solo capas 1+2 (AGENTS.md + HANDOFF.md).
  Re-evaluar skills/subagentes/DECISIONS.md cuando surja la necesidad.
- **Compromised deps** (`keyv`, `flat-cache`, `file-entry-cache`): eliminadas del
  árbol al migrar a Vite (eran transitivas de react-scripts). Ya no hay `overrides`.
- **Vercel**: el `vercel.json` (framework vite, output dist) está en el repo, pero
  las settings del dashboard se actualizaron explícitamente con `vercel project update`.
  Env vars en el dashboard: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (las `REACT_APP_*` se eliminaron).
- **JSX en `.js`**: Vite 8 con oxc no lo soporta por config; se usa el plugin
  `transform-jsx-in-js` en `vite.config.js` (discusión Vite #21505). Si en el
  futuro se refactoriza a `.jsx`, se elimina el plugin.
- **localStorage en tests**: mock in-memory en `setupTests.js` (Node 26 expone un
  global experimental undefined).
