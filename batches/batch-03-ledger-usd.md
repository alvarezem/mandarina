# Batch 3 — Ledger: moneda y ventas

**Dominio:** frontend (ledger + registro de operaciones). **Índice:** #3.
**Estado:** [ ] pendiente

> Depende de **B1** (reescribe `applyBuy`, que también registra en el ledger).

## Hallazgos que resuelve

- add #4: ledger siempre `currency: 'ARS'` (`components/InvestmentPlan.js:246`, `components/RegisterOperationModal.js:76`). El modal no tiene selector de moneda aunque la columna existe en `0016_ledger.sql`.
- add #7: `ledgerQuantity`/`costBasis` permiten vender más de lo tenido (`lib/ledger.js:37`, `Math.max(0, ...)`) → venta sin respaldo registrada en silencio.
- menor: cards del LedgerView mezclan scope (`LedgerView.js:70-74`) — `totalInvested` incluye símbolos totalmente vendidos mientras `totalCost`/`totalValue` solo los tenidos.

## Decisión tomada

**Ledger soporta USD completo.** Decidir e implementar:
- Selector de moneda (ARS/USD) en `RegisterOperationModal`.
- `applyBuy` registra la moneda del instrumento (del plan/quotes), no ARS fijo.
- Valuación: decidir moneda base de los totales. Opción recomendada: todo valuado en **ARS** (multiplicando USD por el rate de `quotes`/dolarapi) con las columnas por moneda visibles, y la rentabilidad calculada por símbolo en su moneda.
- `ledger.js` deja de asumir ARS (`ledger.js:5`).

## Criterio de éxito

- Se puede registrar una operación en USD desde el modal y se guarda con su moneda real.
- `applyBuy` registra la moneda correcta del instrumento (no ARS fijo).
- Una venta que excede la posición se **rechaza con error claro** (no `Math.max(0, ...)` silencioso).
- `totalInvested`/`totalCost`/`totalValue` del LedgerView usan el mismo criterio de scope (tenidos vs vendidos) y moneda base consistente.
- `npm test` verde (ledger.test.js, LedgerView.test.js, InvestmentPlan.test.js, RegisterOperationModal si tiene tests).
- Decisión de moneda base documentada en `DECISIONS.md`.

## Tareas

1. **`lib/ledger.js`**: quitar el supuesto "siempre ARS" (`ledger.js:5`). Agregar soporte de moneda por operación. En `ledgerQuantity`/`costBasis`, cambiar `Math.max(0, ...)` por rechazo de ventas que exceden la posición (o señal de error que la UI muestra).
2. **`components/RegisterOperationModal.js:76`**: agregar selector de moneda (ARS/USD) y pasar la moneda al insert.
3. **`components/InvestmentPlan.js:246`**: `applyBuy` usa la moneda del instrumento (del plan/quotes) en el insert del ledger.
4. **`components/LedgerView.js:70-74`**: unificar scope y moneda base de los totales; mostrar rentabilidad por símbolo en su moneda y total en ARS (rate de `quotes`).
5. **`lib/ledger.js`** (conversión): función pura que convierte a moneda base usando el rate provisto (no fetch adentro).
6. Tests: ledger.test.js (venta excedente, moneda mixta, conversión), LedgerView.test.js (totales consistentes), InvestmentPlan.test.js (applyBuy con moneda).

## Tests a tocar

- `frontend/src/lib/ledger.test.js`
- `frontend/src/components/LedgerView.test.js`
- `frontend/src/components/InvestmentPlan.test.js`

## Documentación

- `DECISIONS.md`: "Ledger soporta USD + moneda base ARS" (y el criterio de ventas excedentes).
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `npm run lint` sin issues
- [ ] Índice `batches/README.md` marcado [x]