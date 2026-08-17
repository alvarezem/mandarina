# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-16)

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
  → 7 → 8 → 9 (índice y detalle en `batches/`). B1, B2 y B3 cerrados; **siguiente:
  B4 (upload y storage)** — es backend (parse-summary: removeSummary/upload + storage), si
  toca migraciones requiere `supabase db push` antes del `functions deploy`.
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