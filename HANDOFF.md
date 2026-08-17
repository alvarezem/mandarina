# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-16)

- **Batch 6 de `post-improvements.md` — Análisis de consumo HECHO**.
  Cerró `batches/batch-06-analisis.md` ([x] en `batches/README.md`).
  `consumption_analyses` **eliminado** (data muerta y divergente del dashboard):
  migración `0020` hace `drop table` y redefine `finalize_parse` sin `p_result`;
  se borró `buildAnalysis`/`computeTotals`/`aggregate` de `parse-summary/parser.ts`
  y `index.ts` ya no pasa `p_result`. Fuente única: `transactions` +
  `lib/analysis.js` (función pura). `period.days` con guard (solo USD/sin txs ya
  no da NaN) y `fmt`/`fmtCompact` devuelven `—` para null/NaN/±Inf. Suite
  **397/397** (+4) + lint 0; deno **76/76** (−2) + lint/fmt OK; grep limpio.
  Decisión en `DECISIONS.md`. **DEPLOY APLICADO (2026-08-16)**: `supabase db
  push` (0020) ANTES de `functions deploy parse-summary`.
- **Batch 4 de `post-improvements.md` — Upload y storage HECHO**.
  Cerró `batches/batch-04-upload.md` ([x] en `batches/README.md`). `lib/upload.js`
  nuevo (puro): `fileTypeError` (extensión + ≤10 MB + magic bytes PDF/XLSX) y
  `hashFile` (SHA-256); `UploadSummaries.js` valida antes de subir, **dedupe por
  contenido** (columna `content_hash`, migración `0019`, bloquea el mismo archivo
  renombrado; el `_N` por nombre se mantiene), **rollback del blob** si el INSERT
  falla, y `removeSummary` reordenado (fila → blob). Suite **393/393** (+14) +
  lint 0 + coverage lib 96.5%. Decisión en `DECISIONS.md`.
  **DEPLOY APLICADO (2026-08-16)**: `supabase db push` (0019) ANTES del push a
  master (el insert con `content_hash` sin columna da PGRST202). Frontend-only.
- **Fix i18n del onboarding — última hoja del tour en el idioma del usuario**.
  El cuerpo del paso final estaba en `FINAL_BODY` hardcodeado en español
  (`OnboardingTour.js`); pasó a la clave `tour.finalBody` (ES/EN) en `lib/i18n.js`
  y el componente compone texto traducido + `<Logo>`. Test nuevo en EN (+1).
  Suite **379/379** + lint 0. Frontend-only (autodeploy en push a master).
- **Batch 2 de `post-improvements.md` — import-plan: validaciones backend HECHO**.
  Cerró `batches/batch-02-import-plan.md` ([x] en `batches/README.md`).
  `parsePercent` sin heurística `≤1→×100` (1 es 1%, 0.5 es 0.5%); `extractPlan`
  rechaza quantity negativa y target fuera de [0,100] con `PlanError` que nombra
  símbolo y valor; respeta moneda/tipo del Excel (fallback ARS/otro); multi-hoja
  (primera con encabezados); `handleImport` exportado (Deno.serve bajo
  `import.meta.main`); RPC `replace_user_plan` validado en `0018`. Deno **78/78**
  + lint/fmt OK. Decisión en `DECISIONS.md`. **DEPLOY APLICADO (2026-08-16)**:
  `supabase db push` (0018) + `functions deploy import-plan`.
- **Batch 3 de `post-improvements.md` — Ledger: moneda y ventas HECHO**.
  Cerró `batches/batch-03-ledger-usd.md` ([x] en `batches/README.md`). Cambios:
  `ledger.js` sin supuesto ARS + señal `exceeded` en `costBasis` + `currency` en
  `summarize` + función pura `toBase(value, currency, rate)` (base ARS);
  `RegisterOperationModal` con selector ARS/USD (insert con la moneda real) y
  rechazo de venta excedente (prop `existingOps`, toast `inv.op.err.oversell`);
  `LedgerView` con scope unificado (solo tenidos) y moneda base ARS en los
  totales, rentabilidad por símbolo en su moneda y celdas por moneda de la fila.
  Decisión en `DECISIONS.md`. Suite **378/378** + lint 0 + coverage lib ≥80%.
  Frontend-only (la columna `currency` ya existía en `0016_ledger.sql`).
- **Consolidación de docs + ideas de monetización** — se creó `DECISIONS.md`
  (log de decisiones, movido de HANDOFF), `HANDOFF.md` quedó corto (este archivo),
  `TODO.md` se deduplicó (items HECHO a una línea; los 3 GEO colapsados en 1) y
  se creó `monetization.md` (6 ideas de tier pago con tradeoffs, sin decidir).
  `AGENTS.md` actualizado con el nuevo índice de memoria.
- **Segunda pasada de auditoría (2026-08-16)** — se amplió `post-improvements.md`
  con la sección "Hallazgos adicionales (2026-08-16)": 19 hallazgos nuevos + 8
  menores (distribute/buyQty/applyBuy como bloque, ledger ARS-only, re-parse sin
  recovery, paginación del dashboard, moneda de BYMA muerta, etc.). Sin código
  tocado: sigue siendo reporte/roadmap.
- **Nota GEO**: el usuario recibió un **mail de llmaudit con score 61/100** (vs
  22/16/15 del cierre del item) → el on-page que estaba "agotado" ahora rinde;
  ver el item en `TODO.md`. Pendiente del usuario: crear los perfiles externos de
  `offpage.md` para sumar `sameAs` al JSON-LD (sin fecha).
- **Siguiente**: candidatos del roadmap — **Mandi** (asistente IA; requiere decidir
  proveedor/costo), **PWA/App Store** ($99/año Apple, choca con "100% gratis"),
  **monetización** (`monetization.md`, sin decidir rumbo).

## En progreso

- **Batches de `post-improvements.md`** — ejecutando en orden 1 → 3 → 2 → 4 → 6 → 5
  → 7 → 8 → 9 (índice y detalle en `batches/`). B1, B2, B3, B4 y B6 cerrados;
  **siguiente: B5 (parse-summary: resiliencia)** — backend (re-parse, retry,
  recovery de `parsing` colgado, categorías manuales en `finalize_parse`;
  coordinado con B6, que ya sacó `p_result`/`consumption_analyses`).
- **Nada activo del roadmap.** Los items de backend/frontend del roadmap viven en
  `TODO.md` (orden de la cola: Mandi, PWA, monetización; ONs/cauciones EN HOLD
  hasta que el usuario confirme tickers que BYMA free publique).
- **Sin fases de saneamiento activas** — las 8 fases de `improvements.md` están
  cerradas.

## Reglas de deploy

- **`supabase db push` ANTES de `functions deploy parse-summary|import-plan`** (sin
  migrar, todo parse 500 con PGRST202). Anotado en el header de `0014_reliability.sql`
  y en el README raíz.
- Frontend: cada push a `master` despliega solo a producción (autodeploy Vercel).
- Cómo queda la memoria: `AGENTS.md` (índice) + `HANDOFF.md` (este traspaso) +
  `DECISIONS.md` (decisiones a no re-litigar) + `TODO.md`/`DONE.md` (roadmap/historial).