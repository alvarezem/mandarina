# Batch 1 — Presupuesto y compra del plan

**Dominio:** frontend (lógica de inversión). **Índice:** `batches/README.md` #1.
**Estado:** [x] hecho

## Hallazgos que resuelve

Referencias a `post-improvements.md`:
- orig #1: `buyQty` fuerza mínimo 1 unidad aunque el monto no alcance (`lib/plan.js:27-33`) → excedés el presupuesto.
- orig #4: `portfolioChangePct` divide por `1 + chg/100` (`lib/plan.js:61-73`) → con `-100` devuelve `-100` fantasma; con `< -100` prev negativo.
- add #1: `distribute` consume presupuesto para activos sin precio → step con `qty: 0` que falla en el ledger (`lib/plan.js:101-114`).
- add #2: `applyBuy` es doble-write no atómico (`components/InvestmentPlan.js:228-250`) → plan incrementado sin registro en ledger.
- add #3: `applyBuy` registra `price: amount/qty`, no el precio de mercado (`InvestmentPlan.js:244`) → costo promedio y rentabilidad inflados.
- add #6 (parcial): `buyAmount` devuelve 0 en silencio para target ≥ 100 o negativo (`lib/plan.js:22-24`).
- add #8: `buildPlan` usa `total` = suma de valores con precio, tratando los sin-precio como 0 (`lib/plan.js:44`) → distorsiona todo el plan.
- menor: `InvestmentPlan.js:375` muestra `—` en plan 100% USD en modo USD si dolarapi cae, sin conversión que hacer.

## Decisión tomada

**`buyQty`: qty 0 + aviso.** Si `amount < price` (o no hay precio), el step se genera con `qty: 0` y la UI avisa que no alcanza; **no se debita presupuesto** ni se intenta comprar 1 unidad que no se puede pagar. Re-litiga el caso codificado en `plan.test.js:43-45` ("al menos 1 si hay faltante aunque no alcance"). Registrar en `DECISIONS.md`.

## Criterio de éxito

- Con un activo cuyo `amount < price`, el plan no muestra un step de compra que exceda el presupuesto; `remaining` no baja.
- `portfolioChangePct` con `chg = -100` devuelve `null` (no `-100` fantasma) y con `chg < -100` no produce valores negativos.
- `distribute` no genera steps con `qty: 0` que luego fallen en el ledger; activos sin precio no consumen presupuesto.
- `applyBuy` no deja el plan incrementado si falla el insert del ledger (rollback manual o validación previa).
- `applyBuy` registra el precio real (de `quotes`) en el ledger, no `amount/qty`.
- `buildPlan` con activos sin precio no distorsiona los pct del resto.
- `buyAmount` no devuelve 0 en silencio: el estado del step comunica "sin faltante" vs "no alcanza".
- `npm test` verde (plan.test.js e InvestmentPlan.test.js actualizados).

## Tareas

1. **`lib/plan.js` — `buyQty`**: si `!p || amount < price` devolver `0` (no 1). Actualizar `plan.test.js:43-45` al nuevo contrato.
2. **`lib/plan.js` — `portfolioChangePct`**: agregar guard `chg <= -100 → return null` (y validar prev > 0 ya existente).
3. **`lib/plan.js` — `distribute`**: no consumir `remaining` para activos con `qty === 0`; decidir si el step se genera con flag `unaffordable` para la UI o se omite (pero no silenciosamente: avisar).
4. **`lib/plan.js` — `buildPlan`**: separar el denominador del total: los sin-precio entran al total global pero no al cálculo de `actualPct`/`gap`/`buy` de los demás (o se documenta el criterio).
5. **`lib/plan.js` — `buyAmount`**: retornar `0` solo para target válido sin faltante; para target inválido (negativo/≥100) comunicar estado distinto.
6. **`components/InvestmentPlan.js` — `applyBuy`**: cortar si `step.qty === 0` (con toast/aviso); hacer el write atómico (o validar el insert antes del update del plan, y revertir si falla); registrar `price` = precio de la cotización (via `usePortfolioQuotes`/quotes) en lugar de `amount / qty`.
7. **`components/InvestmentPlan.js:375`**: en modo USD no exigir rate si no hay conversión (el 100% del plan es USD).
8. Tests para cada cambio (ver criterio de éxito).

## Tests a tocar

- `frontend/src/lib/plan.test.js` — buyQty, portfolioChangePct, distribute, buildPlan, buyAmount.
- `frontend/src/components/InvestmentPlan.test.js` — applyBuy (qty 0, rollback, price de mercado, caso 100% USD sin rate).

## Documentación

- `DECISIONS.md`: entrada "buyQty → qty 0 + aviso" (re-litiga el tradeoff de `plan.test.js:43-45`).
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [x] `npm test` verde (frontend completo)
- [x] `npm run lint` sin issues
- [x] Cobertura meta ≥80% en `src/lib` (plan.js)
- [x] Índice `batches/README.md` marcado [x]