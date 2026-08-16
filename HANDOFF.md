# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-16)

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
  **Sigue: Batch 2 (import-plan backend)**.
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
  → 7 → 8 → 9 (índice y detalle en `batches/`). B1 y B3 cerrados; **siguiente:
  B2 (import-plan: validaciones backend)** — es backend Deno (Edge Function), si
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