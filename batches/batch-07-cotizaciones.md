# Batch 7 — Cotizaciones y moneda de instrumento

**Dominio:** frontend (cotizaciones) + backend (quotes). **Índice:** #7.
**Estado:** [ ] pendiente

## Hallazgos que resuelve

- add #15: el `currency` de la quote de BYMA es data muerta (`quotes/byma.ts:58-59` lo devuelve, el frontend nunca lo lee). La conversión depende del campo `currency` tipeado (default ARS, e import siempre ARS) → instrumentos USD en el plan como ARS se valoran mal.
- menor: `usePortfolioQuotes` no corta en 50 ni dedupea; el server corta en silencio (`quotes/index.ts:144-158`, `MAX_SYMBOLS`) → activos >50 sin precio y sin aviso.
- menor: Watchlist acepta `MEP`/`CCL` (`lib/watchlist.js:5-18` los permite) pero la edge los filtra (`quotes/index.ts:151`) → "sin precio" permanente.
- menor: `MarketQuotes` en display USD sin rate (`MarketQuotes.js:144`) muestra precios ARS etiquetados como USD.

## Criterio de éxito

- El frontend consume el `currency` real de la quote de BYMA para decidir conversión (no solo el campo tipeado).
- Instrumentos cotizados en USD se valoran con su moneda real (en Plan y Cotizaciones).
- `usePortfolioQuotes` corta en 50 y dedupea en el cliente (consistente con el server) y avisa si hay activos >50.
- Watchlist no permite `MEP`/`CCL` (o los maneja con "sin precio" explícito y editable), coherente con la edge.
- `MarketQuotes` no muestra precios ARS como USD sin rate.
- `npm test` verde (usePortfolioQuotes.test.js, Watchlist.test.js, MarketQuotes.test.js) + `deno test` (byma/pool) si se tocó la edge.

## Tareas

1. **Consumir `currency` de BYMA**: `usePortfolioQuotes.js:48-63` (conversión según `item.currency` tipeado) → usar la moneda real de la quote cuando exista. Alinear con la valuación mixta de **B3**.
2. **`usePortfolioQuotes` cap 50 + dedupe** en el cliente (slice/dedupe) + aviso cuando hay símbolos descartados por el server.
3. **`lib/watchlist.js:5-18`**: quitar `MEP`/`CCL` de los permitidos (o agregarlos con manejo explícito de "sin precio"). Coherente con `quotes/index.ts:151`.
4. **`MarketQuotes.js:144`**: en display USD, si no hay rate, no etiquetar ARS como USD (mostrar la moneda real de la quote o un estado "sin rate").
5. Tests para cada cambio.

## Tests a tocar

- `frontend/src/hooks/usePortfolioQuotes.test.js` — currency real, cap 50, dedupe.
- `frontend/src/components/Watchlist.test.js` — MEP/CCL.
- `frontend/src/components/MarketQuotes.test.js` — display USD sin rate.
- `backend/supabase/functions/quotes/byma_test.ts` — si se toca la edge.

## Documentación

- `DECISIONS.md` si se decide el criterio de moneda base (alineado con B3).
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `deno test` verde (if backend touched)
- [ ] Índice `batches/README.md` marcado [x]