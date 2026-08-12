# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-11
- **Qué se hizo** — **FASE 5 CERRADA** (refactor y fiabilidad del backend):
  1. **`_shared/` consolidado**: `normalize.ts` (`normalizeHeader`/`HEADER_ALIASES`/`matchExact`/`matchFuzzy`, usado por parse-summary e import-plan) y `cors.ts` compartidos; `categorize.ts` ya tenía `telecom`→Servicios.
  2. **Lógica pura extraída y testeable**: `parse-summary/parser.ts` (detectSeparator, mapRows, parseAmount, pdfColumn, buildAnalysis, …) e `import-plan/planner.ts` (findHeaderRow, parsePercent, parseQuantity, extractPlan). Handler `handleParse` extraído con interfaz mínima `ParseClient` (testeable con fake); `setStatus` con try/catch intencional (no tapar el error del parse).
  3. **Migración `0014_reliability.sql`**: índices (`transactions.summary_id`/`date`, `card_summaries.user_id`), trigger `set_updated_at` en `portfolio_plan`, backfill telecom→Servicios y RPC atómico **`finalize_parse`** (delete+insert+upsert en una tx, `for update` serialize parses). Sin guard de status: el RPC es idempotente por sí mismo → re-proceso legítimo reescribe bien. `import-plan` ya usa `replace_user_plan`.
  4. **Reproducibilidad**: `deno.json` + `deno.lock` (imports pinneados: supabase-js, xlsx, unpdf).
  5. **Verificado**: `deno check` verde en las 3 funciones (se arreglaron los TS2322/2345 pre-existentes de `quotes/index.ts`) y `deno test` **64/64** con type-check (suites: handler 6, parser 12, planner 9, normalize, categorize, byma, pool).
- **Fase 4** (anterior, ya cerrada): ver sección "Decisiones" y DONE.md; `npm test` **183/183**, `npm run build` OK, lint pendiente (Fase 7).

## En progreso

- **Deploy**: orden obligatorio **`supabase db push` (0014) ANTES de `functions deploy parse-summary|import-plan`** (sin migrar, todo parse 500ea con PGRST202). Anotado también en el header de `0014_reliability.sql`.
- **Cleanup `/tmp/opencode/`**: directorio vacío, descartado.
- **Tarea aparte** (anotada, sin empezar): flujo de **cambio de contraseña** (link del email → pantalla de nueva contraseña; hoy el redirect maneja el token de Supabase).
- Siguiente por roadmap: **FASE 6** (tests: mocks compartidos y cobertura de huecos) o **FASE 7** (ESLint/Prettier + CI GH Actions), ver `improvements.md`.

## Decisiones tomadas (a no re-litigar sin motivo)

- **Fase 5 — guard de status de `finalize_parse`**: eliminado. El delete+insert atómico (con lock de fila) ya es idempotente; el guard `v_status <> 'parsing'` solo agregaba un camino de éxito-silencioso `{ok:true,count:0}`. Un re-proceso (futuro botón de la UI) reescribe el resultado correcto.
- **Fase 5 — regla duplicada `bull market|broker` (0010 vs 0006)**: se deja sin tocar a propósito — es un UPDATE idempotente ya aplicado en prod; editar historial de migraciones aplicadas rinde menos que el ruido que quita.
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
- **Fase 4**: los mensajes de error de fetch son **amigables y estables** (el try/catch
  interno de cada load re-lanza el mensaje estable tanto ante `error` de Supabase como
  ante rechazo de red). No se expone `e.message` crudo del backend en la UI.