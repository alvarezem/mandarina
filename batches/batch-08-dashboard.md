# Batch 8 — Dashboard: paginación y filtros

**Dominio:** frontend (Dashboard) + backend (migración `0022`). **Índice:** #8.
**Estado:** [x] hecho

## Hallazgos que resuelve

- add #9: dashboard sin paginación — `Dashboard.js:123-127` es el único fetch de transacciones y no usa `.limit()`/`.range()` (el único `.limit` del frontend es `App.js:35`). PostgREST hosted corta en 1000 por defecto (`config.toml:18`) → con >1000 txs el dashboard queda incompleto sin aviso.
- menor: `paymentsCount` sin filtro de moneda/categoría (`Dashboard.js:206-209`) → muestra "X pagos excluidos" aunque el filtro USD esté activo.
- menor: resumen sin transacciones no aparece en el dropdown de resúmenes (`Dashboard.js:224-234` lo deriva de `allTx`).
- menor: fetch de `transactions` sin filtro de `user_id` — **resuelto con fix real (migración `0022`)**. El hallazgo original (post-improvements.md) lo planteaba como "defensa en profundidad" porque la columna no existía; **decidido con el usuario**: agregar `user_id` a `transactions` (backfill desde `card_summaries`), simplificar RLS a `auth.uid() = user_id` y filtrar en el fetch. Histórico: en Fase 2 se intentó el filtro y rompió el dashboard por columna inexistente (test de regresión `Dashboard.test.js:96`); ahora el test se actualiza para **esperar** el filtro.

## Criterio de éxito

- Dashboard pagina las transacciones: fetch por chunks (`.range`, pageSize 1000) que carga **todas** las filas (análisis/totales intactos) + tabla con "Ver más" incremental (100 filas, botón con restantes). Sin corte silencioso.
- `paymentsCount` respeta el filtro de moneda/categoría activo (no cuenta pagos excluidos cuando el filtro USD está on).
- Resúmenes sin transacciones aparecen en el dropdown (fetch de `card_summaries` independiente, no derivado solo de `allTx`).
- Fetch de `transactions` incluye `.eq('user_id', userId)` (columna nueva en `0022`).
- `npm test` verde (Dashboard.test.js + lib/transactions.test.js).

## Tareas

1. **Fetch paginado por chunks**: nuevo `lib/transactions.js` con `fetchAllTransactions(builder, pageSize = 1000)` — loop `.range(start, end)` que acumula y corta cuando un batch devuelve `< pageSize` (robusto ante el cap de PostgREST). Reemplaza el fetch de `Dashboard.js:123-136`. `allTx` conserva **todas** las filas → cards/charts/análisis calculan sobre el total.
2. **Tabla "Ver más"** (`TransactionsTable.js`): estado `pageSize = 100`, render `sorted.slice(0, pageSize)`, botón footer "Ver más (N restantes)" (`tn('table.showMore', n)`, clave es/en) que suma 100; reset en `useEffect` sobre `filterKey`.
3. **`paymentsCount` (`Dashboard.js:206-209`)**: aplicar sobre `base` los mismos filtros `currency`/`categories` que `filtered` (sin `query` ni signo; preserva el toggle incluir/excluir).
4. **Dropdown de resúmenes** (`Dashboard.js:224-234`): derivar de un fetch de `card_summaries` (`.eq('user_id', userId)`, plegado en el `Promise.all` de `refs`) → incluye resúmenes sin txs.
5. **`.eq('user_id', …)`** en el fetch de `transactions` + **migración `0022_transactions_user_id.sql`**: columna `user_id` + backfill desde `card_summaries` por `summary_id` + `set not null` + índice `(user_id)` + políticas RLS de `transactions` reemplazadas por `auth.uid() = user_id` + `finalize_parse` redefinido (INSERT con `user_id = p_user_id` y guard de que el resumen pertenezca al usuario; misma firma → **sin redeploy de la edge**).
6. Tests para cada cambio.

## Tests a tocar

- `frontend/src/lib/transactions.test.js` — multipágina (2500 filas → 3 calls `.range`, concatena, corta en batch corto).
- `frontend/src/components/Dashboard.test.js` — mock `card_summaries` en `mockTx`; test de regresión `:96` **actualizado** (ahora espera `.eq('user_id', …)`); "Ver más"; paymentsCount con filtro; dropdown con resumen sin txs.

## Documentación

- `DECISIONS.md` (fix real de user_id + enfoque de paginación) + `DONE.md` + `HANDOFF.md` al cierre.

## Deploy

- **`supabase db push` (0022) ANTES del push a master** (el filtro `.eq('user_id', …)` da PGRST202 sin migrar). Frontend-only + 0022; sin redeploy de functions (firma de `finalize_parse` intacta).

## Checklist de cierre

- [x] `npm test` verde (419/419, +7)
- [x] `npm run lint` sin issues
- [x] `npm run coverage` (lib 96.2% stmts / 98.4% lines; thresholds ≥80%)
- [x] `npm run build` OK
- [x] Índice `batches/README.md` marcado [x]