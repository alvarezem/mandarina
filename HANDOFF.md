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

## En progreso

- **FASE 1 de `improvements.md`**: migración CRA → Vite + Vitest.

## Próximo paso sugerido

- Ejecutar **Fase 1 de `improvements.md`**: migración CRA → Vite + Vitest
  (instala `vite`/`@vitejs/plugin-react`/`vitest`, crea `vite.config.js`, mueve
  `index.html`, renombra env vars `REACT_APP_*` → `VITE_*`, migra los 14 tests,
  actualiza `vercel.json`). Baseline ya verificado (149 frontend + 26 Deno).

## Decisiones tomadas (a no re-litigar sin motivo)

- **Migración a Vite**: revertida una vez por decisión del usuario (la sesión se
  cayó a mitad); se volverá a encarar vía `improvements.md`.
- **`instructions.md`**: borrado a propósito (spec original superada por
  TODO/DONE/README; sigue en historial git). No restaurar.
- **Memoria opencode**: por ahora solo capas 1+2 (AGENTS.md + HANDOFF.md).
  Re-evaluar skills/subagentes/DECISIONS.md cuando surja la necesidad.
- **Compromised deps** (`keyv`, `flat-cache`, `file-entry-cache`): contenidas hoy
  por `overrides` en `frontend/package.json`; desaparecen al migrar a Vite.
