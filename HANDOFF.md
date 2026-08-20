# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-19)

- **Iteración de UX sobre el gating — item Reportes siempre visible en el nav, deshabilitado para no-Pro**.
  En vez de ocultar el item `reportes`, ahora **siempre aparece** en `Sidebar`/`MobileDrawer` y para
  no-Pro se ve **deshabilitado de verdad** (sin click) con hint naranja "Mejora a Pro" debajo del label
  (o píldora "PRO" en colapsado). El paywall no cambia (no-Pro no accede); solo agrega señal de Pro que
  tenta a la suscripción. i18n `pro.navHint`/`pro.navTitle`/`pro.navShort`. Suite **474/474** + lint 0 +
  build OK. Frontend-only (autodeploy en push). Detalle en `DONE.md`.

- **Monetización de la idea C — Gating de Reportes Pro HECHO (billing MP diferido a paso 2)**.
  Rumbo monetario decidido: los **reportes avanzados** (C1+C2+C3, gratis desde el 18/08) pasan a
  ser el **primer feature del tier Pro**, completos detrás del paywall (sin freemium).
  **Activación manual** por ahora (SQL editor: `insert into subscriptions (user_id, plan, status)
  values ('<uid>', 'pro', 'active')`); el billing de MercadoPago (checkout + webhook) se anotó en
  `TODO.md` como paso 2 sin construir (sin checkout que lo dispare es código especulativo).
  Backend: migración **`0023_subscriptions.sql`** (tabla `subscriptions`: plan/status con check,
  `mp_preapproval_id`/`current_period_end` reservados, índice único `(user_id)`, RLS own,
  trigger `set_updated_at`). Frontend: `lib/subscriptions.js` (puro, `isProActive`),
  `ProProvider.js`/`usePro()` (3er contexto global, fetch por `user_id`), gating en 3 puntos
  (Sidebar/MobileDrawer filtran el item Reportes, `App.js` branch → `ProUpsell`),
  `ProUpsell.js` (features + CTA con toast `pro.upcoming`), i18n `pro.*` es/en.
  Suite **npm 474/474** (+14) + lint 0 + coverage lib 96.32% + build OK.
  **Deploy APLICADO (2026-08-19)**: `supabase db push` (0023) ANTES del push a master (autodeploy Vercel).
  Detalle en `DONE.md`; decisión en `DECISIONS.md`.

## Sesiones anteriores (hasta 2026-08-18)

- **Reportes avanzados C1+C2+C3 — exportación Excel/CSV/PDF HECHO (frontend-only)**.
  Idea C de `monetization.md` implementada **100% gratis**; pasa a ser el primer
  candidato del futuro tier Pro (gating + billing MercadoPago = paso futuro).
  `lib/reports.js` nuevo (puro: `buildExpenseReport`/`buildFiscalReport`/
  `buildLedgerReport` + `toCsv` con BOM+CRLF / `toXlsx` exceljs / `toPdf`
  jsPDF v4 + jspdf-autotable v5) + `components/ReportsView.js` (3 secciones,
  botones Excel/CSV/PDF, filtros período/moneda/categoría, doughnut a PNG en el
  PDF fiscal) + wiring (Sidebar `NAV_ITEMS`, App `VIEW_TITLES` + branch).
  **Code-splitting con `React.lazy`** para ReportsView: exceljs+jspdf subían el
  chunk principal 832→2215 kB; con lazy vuelve a ~838 kB. Deps agregadas:
  `exceljs ^4.4.0`, `jspdf ^4.2.1`, `jspdf-autotable ^5.0.8` (package.json+lock).
  Suite **npm 460/460** (41 files, +39) + lint 0 + coverage lib 95.9% + build OK
  (chunk warning pre-existente del baseline). Detalle en `DONE.md`; decisiones en
  `DECISIONS.md`.
- **QA del usuario en el reset de contraseña (B9) → 2 fixes frontend (autodeploy en push)**.
  Probando el link de recuperación en hosting encontró: **(1)** al poner la misma contraseña,
  la notificación llegaba **en inglés** — `authErrors.js` no mapeaba `same_password` (código ni
  mensaje) → `authErrorToMessage` devolvía el `error.message` crudo; ahora `BY_CODE` + regex
  `/different from the old password/i` cubren es/en ("La contraseña nueva debe ser diferente de
  la actual"). **(2)** la pantalla de nueva contraseña **no tenía toggle de idioma** (quedaba fija
  en el detectado) — `NewPasswordScreen` no renderizaba `LangToggle`; se agregó junto al
  `ThemeToggle` (mismo patrón de `Landing.js`; al togglear se traduce toda la pantalla vía
  `LangProvider`). Suite **npm 421/421** (+2) + lint 0 + coverage lib 96.6% + build OK.
  Detalle en `DONE.md`.

## Sesiones anteriores (hasta 2026-08-17)

- **Batch 9 de `post-improvements.md` — Hardening: CORS, reset, rate limit HECHO. ÚLTIMO batch de la cola (B1–B9 cerrados)**.
  Cerró `batches/batch-09-hardening.md` ([x] en `batches/README.md`). **Deploy APLICADO
  (2026-08-17)**: `supabase functions deploy quotes parse-summary import-plan` (sin `db push`,
  sin migraciones). Backend-only; frontend sin cambios. **(1) CORS** (`_shared/cors.ts`):
  `allowedOrigin` acepta `localhost:3000` + https `mandarina-fi.vercel.app` o `*.mandarina-fi.vercel.app`
  (subdominios, para futuros ambientes dev); se eliminó el `*.vercel.app` genérico y, por decisión
  del usuario, el prefijo `mandarina-*` (cualquier `mandarina-X.vercel.app` es ajeno). Consecuencia
  asumida: los previews automáticos de Vercel (`mandarina-fi-<hash>-<scope>.vercel.app`) dejan de
  recibir ACAO → si se necesita un preview, crear subdominio dev. **(2) Rate limit** (`_shared/rate_limit.ts`
  nuevo): `createRateLimiter({limit, windowMs})` en-memoria por isolate (limitación multi-isolate
  documentada) — **quotes 30/min, parse-summary 10/min, import-plan 10/min**, 429 con `Retry-After`
  + error claro. Hooks: quotes tras `getUser()`, parse-summary en `handleParse` (usa `summary.user_id`,
  param opcional `limiter`), import-plan en `handleImport` (param opcional `limiter`). **(3) Reset de
  contraseña: hallazgo orig #10 STALE** — ya resuelto en QW-F (13/08); se verificó el flujo sin gaps,
  sin tocar código; queda QA manual del link en hosting (usuario). Suites **deno 98/98** (+15) + lint
  + fmt OK + `deno check` de las 3 functions. **Smoke test en hosting**: evil origin → sin ACAO; prod
  y `dev.mandarina-fi.vercel.app` → ACAO; JWT inválido → 401. Decisiones en `DECISIONS.md`.
- **Batch 8 de `post-improvements.md` — Dashboard: paginación, filtros consistentes y `user_id` real HECHO**.
  Cerró `batches/batch-08-dashboard.md` ([x] en `batches/README.md`). **Deploy APLICADO
  (2026-08-17)**: `supabase db push` (0022) ANTES del push a master (commit `da4ec59`); sin redeploy
  de functions (firma de `finalize_parse` intacta).
  **(1) Migración `0022_transactions_user_id.sql`**: `transactions` gana `user_id` (backfill desde
  `card_summaries`, NOT NULL, índice) + RLS simplificada a `auth.uid() = user_id` + `finalize_parse`
  con INSERT `user_id = p_user_id` y guard de pertenencia del resumen. **(2) `lib/transactions.js`**
  (puro): `fetchAllTransactions` por chunks `.range()` de 1000 → elimina el corte silencioso de
  PostgREST (add #9); `Dashboard.js` lo usa → `allTx` conserva **todas** las filas (análisis sobre el
  total) y agrega `.eq('user_id', userId)`. **(3) Tabla "Ver más"** (`TransactionsTable.js`): 100
  filas + botón `tn('table.showMore', n)` (reset por patrón de ajuste en render, no en effect).
  **(4) `paymentsCount` con filtros** de moneda/categoría (el banner USD ya no cuenta pagos ARS).
  **(5) Dropdown de resúmenes desde `card_summaries`** (fetch independiente) → **resúmenes sin
  transacciones aparecen** en el dropdown. Suite **npm 419/419** (+7) + lint 0 + coverage lib
  96.2% + build OK. Decisiones en `DECISIONS.md`. Test de regresión de Fase 2 **actualizado** (ahora
  espera el filtro `user_id` en vez de su ausencia).
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
  **monetización paso 2** (billing MercadoPago de los reportes Pro — ver `TODO.md`).

## En progreso

- **Batches de `post-improvements.md` — COLUMNA COMPLETA (B1–B9 cerrados, 2026-08-17)**.
  Índice en `batches/README.md` con las 9 filas [x] y las decisiones acumuladas por batch.
  No quedan batches pendientes.
- **Monetización: idea C (Reportes Pro) en producción (2026-08-19)** — gating activo; el
  **billing MercadoPago es el paso 2** de la cola de monetización (anotado en `TODO.md`).
  Los demás items del roadmap viven en `TODO.md` (Mandi, PWA; ONs/cauciones EN HOLD
  hasta que el usuario confirme tickers que BYMA free publique).
- **Pendiente del usuario (QA)**: re-verificar el flujo de reset de contraseña en hosting tras el
  fix de i18n (error `same_password` en español + toggle de idioma en `NewPasswordScreen`), crear
  los perfiles externos de `offpage.md` (GEO) y **activar Pro para su usuario** (SQL editor:
  `insert into subscriptions (user_id, plan, status) values ('<uid>', 'pro', 'active')`).
- **Sin fases de saneamiento activas** — las 8 fases de `improvements.md` están
  cerradas.

## Reglas de deploy

- **`supabase db push` ANTES de `functions deploy parse-summary|import-plan`** (sin
  migrar, todo parse 500 con PGRST202). Anotado en el header de `0014_reliability.sql`
  y en el README raíz.
- Frontend: cada push a `master` despliega solo a producción (autodeploy Vercel).
- Cómo queda la memoria: `AGENTS.md` (índice) + `HANDOFF.md` (este traspaso) +
  `DECISIONS.md` (decisiones a no re-litigar) + `TODO.md`/`DONE.md` (roadmap/historial).