# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/DECISIONS.

## Última sesión (2026-08-16)

- **Batch 1 de `post-improvements.md` — Presupuesto y compra del plan HECHO**.
  Cerró `batches/batch-01-presupuesto.md` ([x] en `batches/README.md`). Cambios:
  `buyQty` → 0 si no alcanza (decisión en `DECISIONS.md`), `portfolioChangePct`
  guard `<= -100 → null`, `buildPlan` buy=0 para sin-precio, `distribute` con
  `skipped` (no debita presupuesto), `applyBuy` atómico (ledger primero + rollback
  si falla el update, price de mercado de `quotes`, currency del instrumento),
  fix del total 100% USD sin rate, aviso `inv.dist.skipped` + toast `err.buyQty`
  en la UI. Suite **369/369** + lint 0 + coverage lib ≥80%. Frontend-only.
  **Sigue: Batch 3 (ledger USD)** — depende de B1 que ya reescribió `applyBuy`.
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
  → 7 → 8 → 9 (índice y detalle en `batches/`). B1 cerrado; **siguiente: B3
  (ledger USD)** — requiere `supabase db push` si agrega migración (ver el batch).
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