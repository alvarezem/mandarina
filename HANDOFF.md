# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-09
- **Qué se hizo** (Fase 2 de improvements.md — cierre por CLI + docs):
  1. **Código de Fase 2 COMMITEADO** en `716e30a` (`feat: fase 2 de improvements.md — hardening de auth, funciones y datos`); tag `pre-fase2`.
  2. **Suites verificadas antes del commit**: frontend `CI=true npm test` 149/149 + `npm run build` OK (dist 210 kB gzip); backend `deno test` 28/28.
  3. **Deploy de las 3 Edge Functions** en hosting (`supabase functions deploy parse-summary import-plan quotes`): parse-summary **v17**, quotes **v7**, import-plan **v4**, todas ACTIVE.
  4. **Migración aplicada** (`supabase db push`): `0013_replace_plan_rpc.sql` aplicada en remoto (confirmada en `supabase migration list`).
  5. **Verificación en hosting**: request sin JWT a `quotes` → **401** (`verify_jwt` activo); preflight CORS desde `https://mandarina-fi.vercel.app` → refleja el origen con `Vary: Origin`; desde `https://evil.example.com` → sin `Allow-Origin`.
  6. **Paso a paso manual para el usuario** escrito en `improvements.md` (sección FASE 2, "Paso a paso manual (usuario)"): rotar service role key, aplicar auth settings, verificar signup.
  7. **Pendiente técnico**: `supabase start` local en background (descarga de imágenes Docker); cuando termine → `supabase db reset` para validar 0013 + config.

## En progreso

- **FASE 2** de `improvements.md` — resto por hacer:
  1. **Usuario (dashboard)**: rotar service role key + borrar `backend/.env`; aplicar auth settings (min 8, letters_digits, confirmaciones ON, secure_password_change ON, rate limit). PASO A PASO en `improvements.md`.
  2. **Agente (local)**: `supabase db reset` cuando termine el stack local (`supabase start` en background).

## Próximo paso sugerido

- Cerrar Fase 2: correr `supabase db reset` (local) y esperar el checklist manual del
  usuario; después marcar Fase 2 HECHA en `DONE.md` y pasar a **FASE 3 — Refactor del frontend**.

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
