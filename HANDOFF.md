# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-17)

- **Batch 7 de `post-improvements.md` — Cotizaciones y moneda de instrumento HECHO**.
  Cerró `batches/batch-07-cotizaciones.md` ([x] en `batches/README.md`). **Frontend-only**
  (la edge ya devolvía `currency` por quote; sin `db push` ni redeploy de functions).
  **Moneda efectiva de la quote** en `usePortfolioQuotes.js`: `quote.currency ?? item.currency
  ?? 'ARS'` manda en la conversión (add #15: USD en el plan como ARS se valora `× rate`; ARS
  tipeado USD ya no multiplica de más) + cada item expone `valueCurrency`. **Cap 50 + dedupe +
  sin MEP/CCL** en el request (espejo de la edge) + toast `inv.quotes.limit` si >50 únicos.
  **`totalCurrency`** para el total (con rate → display; sin rate → moneda única; mixto → `—`).
  **Etiquetado por moneda real** en `QuotesTable`/`PlanTable`/`MarketQuotes`/`InvestmentPlan` +
  `Watchlist` → display USD sin rate ya no etiqueta ARS como USD; gráfico/modal con `chartDisplay`
  + nota `inv.quotes.noRate`. `validateSymbol` rechaza `MEP`/`CCL`. Suite **npm 412/412** (+12)
  + lint 0 + coverage lib 96% + build OK. Decisión en `DECISIONS.md`. Frontend-only.
- **Batch 5 de `post-improvements.md` — parse-summary: resiliencia HECHO**.
  Cerró `batches/batch-05-parse-summary.md` ([x] en `batches/README.md`).
  Migración `0021`: `category_override` en `transactions` y `summary_type_manual`
  en `card_summaries`; `finalize_parse` snapshot las categorías manuales por
  `(merchant, date, amount)` antes del delete+insert y las re-aplica tras el
  insert, y no pisa `summary_type` clasificado a mano. `parse-summary`:
  `MAX_BLOB_BYTES = 10 MB` (blob gigante → status error claro, sin quedar en
  'parsing'), **moneda real en CSV/XLSX** (columna Moneda/Currency o header
  "Monto USD"; se dejó de forzar ARS), **PDF pesos+dólares consistente** (dólares
  si la fila los tiene). `detection.ts`: `/\bvisa\b/`. `parser.ts`: Cargo/Abono en
  columnas separadas (abono negativizado, no se pierden filas). **Frontend**:
  botón re-parse en `SummaryItem.js` (error/done, reusa `parse()` de
  UploadSummaries), `Dashboard.js` setea `category_override` al editar categoría,
  MetaForm setea `summary_type_manual`. Suites **deno 83/83** (+2) + lint/fmt OK;
  **npm 400/400** (+1) + lint 0 + coverage lib 96%. Decisión en `DECISIONS.md`.
  **DEPLOY APLICADO (2026-08-17)**: `supabase db push` (0021) ANTES de
  `functions deploy parse-summary`.
- **QA del usuario → 2 bugs arreglados + 1 limitación aceptada (2026-08-17)**.
  **(1) Toast detrás del modal**: el contenedor de toasts usaba `z-[60]` y los
  modales `z-[70]` (RegisterOperationModal/QuoteModal/SummaryDetailModal) y el
  onboarding `z-[80]` → el toast de oversell quedaba bajo el backdrop. `Toast.js`
  subido a `z-[90]`. **(2) Hint con `{currency}` literal**: `t()` usaba
  `String.replace` (solo reemplaza la primera ocurrencia) y `inv.op.hint` tiene
  `{currency}` dos veces → la de "Comisión" quedaba literal; ahora `replaceAll`
  (fix general para cualquier clave con var repetida). **(3) Dedupe por contenido
  NO aplica a resúmenes subidos antes de la migración `0019`** (su `content_hash`
  es NULL → re-subir ese archivo vuelve a subirlo con sufijo `_1`) — el bundle
  desplegado sí tiene el dedupe; el usuario **decidió aceptar la limitación**
  (ya documentada en `DECISIONS.md`/`DONE.md`), sin backfill. Tests: +1 toast
  (z-index del contenedor), +1 i18n (var repetida es/en). Suite **399/399** +
  lint 0 + coverage lib 96%. Commit `521790b`, push a master (autodeploy).
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

- **Batches de `post-improvements.md`** — ejecutando en orden 1 → 3 → 2 → 4 → 6 → 5 → 7
  → 8 → 9 (índice y detalle en `batches/`). B1 a B7 cerrados;
  **siguiente: B8 (dashboard: paginación y filtros)** — add #9 (paginación del dashboard)
  + menores paymentsCount con filtro de moneda/categoría, resumen sin transacciones en el
  dropdown, fetch sin user_id.
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