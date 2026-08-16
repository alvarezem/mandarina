# Batch 8 — Dashboard: paginación y filtros

**Dominio:** frontend (Dashboard). **Índice:** #8.
**Estado:** [ ] pendiente

## Hallazgos que resuelve

- add #9: dashboard sin paginación — `Dashboard.js:123-127` es el único fetch de transacciones y no usa `.limit()`/`.range()` (el único `.limit` del frontend es `App.js:35`). PostgREST hosted corta en 1000 por defecto (`config.toml:18`) → con >1000 txs el dashboard queda incompleto sin aviso.
- menor: `paymentsCount` sin filtro de moneda/categoría (`Dashboard.js:206-209`) → muestra "X pagos excluidos" aunque el filtro USD esté activo.
- menor: resumen sin transacciones no aparece en el dropdown de resúmenes (`Dashboard.js:224-234` lo deriva de `allTx`).
- menor: fetch de `transactions` sin filtro de `user_id` (defensa en profundidad) — `Dashboard.js:123-127` no aplica `.eq('user_id', …)` (perdido en refactor Fase 3/4, ver `post-improvements.md` D11).

## Criterio de éxito

- Dashboard pagina las transacciones (paginación visible o "cargar más") sin perder el corte silencioso de 1000. Indicación de que hay más filas.
- `paymentsCount` respeta el filtro de moneda/categoría activo (no cuenta pagos excluidos cuando el filtro USD está on).
- Resúmenes sin transacciones aparecen en el dropdown (fetch de resúmenes independiente, no derivado solo de `allTx`).
- Fetch de `transactions` incluye `.eq('user_id', userId)` (defensa en profundidad, consistente con los otros fetches).
- `npm test` verde (Dashboard.test.js).

## Tareas

1. **Paginación** (`Dashboard.js:123-127`): usar `.range(start, end)` con paginación incremental ("ver más") o páginas. Indicar cuándo hay más filas. Cuidar que los cálculos de análisis/totales usen todas las filas (o se documente el alcance de la página actual).
2. **`paymentsCount` (`Dashboard.js:206-209`)**: aplicar el mismo filtro de moneda/categoría que el resto del dashboard.
3. **Dropdown de resúmenes (`Dashboard.js:224-234`)**: derivar de un fetch de `card_summaries` (o incluir resúmenes sin txs), no solo de `allTx`.
4. **`.eq('user_id', …)`** en el fetch de `transactions`.
5. Tests para cada cambio.

## Tests a tocar

- `frontend/src/components/Dashboard.test.js` — paginación, paymentsCount con filtro, dropdown, user_id.

## Documentación

- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `npm run lint` sin issues
- [ ] Índice `batches/README.md` marcado [x]