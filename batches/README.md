# Batches — Plan de implementación post-improvements

Plan de ejecución de los hallazgos de `post-improvements.md` (2026-08-12 +
2026-08-16). Cada batch agrupa hallazgos por dominio y es **autocontenido**:
implementación + tests + documentación (DONE/DECISIONS/HANDOFF según aplique).

Decisiones tomadas (ver `DECISIONS.md` al cerrar cada batch):
- **B1**: `buyQty` → qty 0 + aviso (re-litigar `plan.test.js:43-45`). No exceder presupuesto.
- **B3**: ledger **soporta USD completo** (selector de moneda + valuación mixta).
- **B6**: `consumption_analyses` → **eliminar persistencia**; `analysis.js` queda como función pura (fuente única: tabla `transactions`).
- Estructura: carpeta `batches/` + índice (este archivo).

## Status board

| # | Batch | Dominio | Hallazgos | Estado |
|---|-------|---------|-----------|--------|
| 1 | `batch-01-presupuesto.md` | Presupuesto y compra del plan | orig #1, #4; add #1, #2, #3, #6, #8; menor InvestmentPlan:375 | [x] |
| 2 | `batch-02-import-plan.md` | import-plan: validaciones backend | orig #2, #3; add #5, #6, #17, #19 | [x] |
| 3 | `batch-03-ledger-usd.md` | Ledger: moneda y ventas | add #4, #7; menor LedgerView scope | [x] |
| 4 | `batch-04-upload.md` | Upload y storage | orig #7, #8; add #13, #14 | [ ] |
| 5 | `batch-05-parse-summary.md` | parse-summary: resiliencia | add #10, #11, #12, #16; menores PDF pesos+dólares, summary_type, visa, mapRows | [ ] |
| 6 | `batch-06-analisis.md` | Análisis de consumo | orig #5, #6; menores fmt NaN, fmtCompact null | [ ] |
| 7 | `batch-07-cotizaciones.md` | Cotizaciones y moneda de instrumento | add #15; menores Watchlist MEP/CCL, MarketQuotes display, usePortfolioQuotes cap 50 | [ ] |
| 8 | `batch-08-dashboard.md` | Dashboard: paginación y filtros | add #9; menores paymentsCount, dropdown sin txs, fetch sin user_id | [ ] |
| 9 | `batch-09-hardening.md` | Hardening: CORS, reset, rate limit | orig #9, #10; add #18 | [ ] |

## Orden de ejecución

1 → 3 → 2 → 4 → 6 → 5 → 7 → 8 → 9

Racional:
- **B1 antes de B3**: B3 toca `applyBuy` (registro en el ledger), que B1 reescribe.
- **B6 antes de B5**: B5 cambia `finalize_parse`, que hoy escribe `consumption_analyses` (se elimina en B6).
- **B3 antes de B7**: B3 introduce valuación mixta que consume el rate de `quotes`; B7 afina la fuente de moneda.

## Reglas de deploy (recordatorio)

- `supabase db push` ANTES de `functions deploy parse-summary|import-plan` si el batch toca migraciones (B2, B5, B6).
- Frontend: push a `master` autodeploya Vercel.

## Cierre de un batch

1. Implementar + tests verdes (`npm test` / `deno test` según lado).
2. Lint/format: `npm run lint` / `deno lint` + `deno fmt --check` (según lado).
3. Marcar `[x]` en este índice y en el checklist del archivo del batch.
4. Actualizar `DONE.md` (qué se hizo) + `DECISIONS.md` (si hay decisión) + `HANDOFF.md` (resumen).