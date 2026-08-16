# Batch 6 — Análisis de consumo

**Dominio:** frontend (análisis) + backend (persistencia). **Índice:** #6.
**Estado:** [ ] pendiente

> **Decisiones ya tomadas**: eliminar la persistencia de `consumption_analyses`. Fuente única: la tabla `transactions` (backend, autoritativa) + `lib/analysis.js` como función pura que deriva en el front.

## Hallazgos que resuelve

- orig #5: `buildAnalysis` con solo USD → `period.days = NaN` (`lib/analysis.js:35-38`) — sin txs ARS, `from`/`to` undefined → `new Date(undefined)` inválido → NaN.
- orig #6: `consumption_analyses` se escribe y nadie lo lee (`finalize_parse` en `0014_reliability.sql:106`). Análisis duplicado y divergente:
  - Backend (`parser.ts:178-264`): `balanceTrend`, `avgPerDay`, `maxCredit`, sin filtro de Pagos.
  - Frontend (`lib/analysis.js`): `expenseTrend`, `days`, excluye Pagos.
  - El `result` persistido incluye Pagos; el dashboard los excluye.
- menores: `fmt` renderiza "NaN" (`lib/format.js:18-27`); `fmtCompact` sin guard de `null` (`lib/format.js:12-18`).

## Decisión tomada

**Eliminar persistencia.** `consumption_analyses` deja de escribirse/leerse; se borra la tabla (migración). El dashboard ya calcula en vivo con `lib/analysis.js` (función pura, testada); `transactions` es la fuente única. Esto elimina la divergencia TS/JS y la data muerta. Documentar en `DECISIONS.md`.

## Criterio de éxito

- `buildAnalysis` con solo USD (o sin txs) no produce `NaN`: `period.days` siempre número finito.
- `consumption_analyses` ya no se escribe desde `finalize_parse`; tabla eliminada (migración `0018`), sin referencias en el frontend (grep limpio).
- `fmt`/`fmtCompact` no renderizan "NaN" ni rompen con `null`.
- `npm test` verde (analysis.test.js, format.test.js) + `deno test` verde (si se tocó parse).

## Tareas

1. **`lib/analysis.js:35-38`**: `buildAnalysis` con solo USD → `from`/`to` válidos (usar las txs que haya, o default). Guard para que `Math.max(1, ...)` nunca reciba NaN.
2. **`lib/format.js:12-18` (`fmtCompact`)** y **`:18-27` (`fmt`)**: guard de `null`/`undefined` y de no-finites (no "NaN" en la UI).
3. **Backend — dejar de escribir `consumption_analyses`**: en `finalize_parse` (`0014_reliability.sql`), eliminar el INSERT de `consumption_analyses`. Verificar que el frontend no lo consulta (grep `consumption_analyses`).
4. **Migración `0018`** (nueva): `drop table if exists consumption_analyses` (y su índice/unique si lo tiene — ver `0004_analysis_unique.sql`). Revisar políticas RLS asociadas.
5. **`parser.ts:178-264`**: eliminar el branch backend de análisis (o dejarlo solo si `parse-summary` lo usa para otra cosa — verificar).
6. Tests actualizados: analysis.test.js (caso solo USD), format.test.js (null/NaN).

## Tests a tocar

- `frontend/src/lib/analysis.test.js`
- `frontend/src/lib/format.test.js`
- Backend: `deno test` (parse-summary/parser) si se tocó `parser.ts`.

## Documentación

- `DECISIONS.md`: "consumption_analyses eliminado — análisis vive en `lib/analysis.js` (función pura) sobre `transactions`".
- Nota de deploy: migración `0018` + redeploy de `parse-summary`.
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `deno test` verde (if backend touched)
- [ ] Migración `0018` aplicada en hosting + `parse-summary` redeployada
- [ ] grep `consumption_analyses` sin referencias vivas
- [ ] Índice `batches/README.md` marcado [x]