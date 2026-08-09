# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-08
- **Qué se hizo**:
  1. Se revirtió por completo la migración a Vite iniciada (working tree limpio en `06c2d61`).
  2. Análisis a fondo de frontend y backend (duplicación, god components, service role key, CORS, RLS).
  3. Se creó **`improvements.md`**: plan de saneamiento/refactor en **8 fases** con justificación de cada decisión (D1–D13).
  4. Se implementó **memoria de opencode capas 1+2**: `AGENTS.md` (briefing auto-cargado, reemplaza a `AGENT.md`), `HANDOFF.md` (este archivo), `.opencode/opencode.json` (`instructions`).
  5. **FASE 0 de improvements.md HECHA** (2026-08-08): baseline verificado — frontend `CI=true npm test` 14 suites/149 tests verdes + `npm run build` OK (requirió `npm ci` por node_modules stale), backend `deno test` 26 tests verdes, tag **`pre-fase1`** en `13c60c6`. Documentado en `improvements.md` (sección FASE 0) y `DONE.md`.
  6. **FASE 1 de improvements.md HECHA** (2026-08-08): migración CRA → **Vite 8 + Vitest 4** completa. Detalle en `DONE.md` y hallazgos en `improvements.md`.
  7. **Autodeploy de Vercel arreglado** (2026-08-08): el proyecto seguía con framework `create-react-app` y env vars `REACT_APP_*`. Se actualizó el dashboard vía `vercel project update --framework vite --build-command "npm run build" --output-directory dist` y se renombraron las env vars a `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (production + preview). `git push origin master` (`4c01ec2`) disparó el deploy → **Ready en 8s**; `mandarina-fi.vercel.app` ya sirve el bundle Vite con las env correctas.

## En progreso

- Nada (Fase 1 cerrada). Próximo: **FASE 2 — Seguridad y secretos** de `improvements.md`.

## Próximo paso sugerido

- Ejecutar **Fase 2 de `improvements.md`** (rotar service role key, borrar el
  cliente huérfano `backend/src/supabaseClient.js` + `backend/package*.json` +
  `backend/node_modules`, `.env.example` del backend, `git grep` de secrets).

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
