# post-improvements — Revisión post-Fase 8

Revisión de código completa (2026-08-12) posterior al cierre de las 8 fases de
`improvements.md`. Documento de hallazgos, ordenados por severidad, con
`archivo:línea` para cada uno. **No se aplicaron cambios** — queda como
reporte/roadmap de saneamiento para próximas sesiones.

## Bugs de lógica (impacto real)

1. **`buyQty` fuerza mínimo 1 unidad aunque el monto no alcance** —
   `frontend/src/lib/plan.js:27-33`. Si `amount < price` devuelve `1`, pero el
   usuario no puede pagar una unidad con ese monto. En `applyBuy`
   (`frontend/src/components/InvestmentPlan.js:227-251`) se debita `step.amount`
   del presupuesto pero se suman `step.qty` unidades que valen más → **excedés
   el presupuesto**. La receta "se recalcula en vivo al comprar" queda
   inconsistente con el resto del plan.

2. **`parsePercent` convierte "1" en 100%** —
   `backend/supabase/functions/import-plan/planner.ts:27-37`. La heurística
   `value <= 1 ? value * 100 : value` toma un target real de `1%` como `100%` y
   `0.5` como `50%`. Falso positivo grave justo en el rango que usa un plan real.

3. **`parseQuantity` acepta tenencias negativas** — `planner.ts:42-70`. El signo
   se multiplica (`sign * n`), así que un Excel con `-10` entra al plan sin
   rechazo.

4. **`portfolioChangePct` divide por `1 + chg/100`** —
   `frontend/src/lib/plan.js:61-73`. Con `changePct = -100` → `prev = Infinity` y
   el guard `if (prev <= 0) return null` no lo atrapa; devuelve un `-100` fantasma.
   Con `chg < -100` el valor `prev` se vuelve negativo.

5. **`buildAnalysis` con solo USD → `period.days = NaN`** —
   `frontend/src/lib/analysis.js:35-38`. Si no hay transacciones ARS, `from`/`to`
   son `undefined` → `new Date(undefined)` inválido → `Math.max(1, NaN) = NaN`.
   No se renderiza hoy, pero el campo queda con valor inválido y es el mismo
   cálculo que el backend hace **distinto** (ver punto 6).

## Duplicación que ya divergió

6. **`consumption_analyses` se escribe y nadie lo lee** —
   `finalize_parse` (`backend/supabase/migrations/0014_reliability.sql:106`)
   persiste un análisis que el frontend jamás consulta (grep sin matches). Ya
   divergió: el `result` guardado **incluye Pagos** en los totales, mientras el
   dashboard los excluye (`frontend/src/lib/analysis.js:1`, `EXCLUDED_CATEGORIES`).
   Además las dos implementaciones tienen campos distintos:
   - Backend (`backend/supabase/functions/parse-summary/parser.ts:178-264`):
     `balanceTrend`, `avgPerDay`, `maxCredit`, sin filtro de Pagos.
   - Frontend (`frontend/src/lib/analysis.js`): `expenseTrend`, `days`, sin
     `maxCredit`/`avgPerDay`, excluye Pagos.
   Resultado: análisis duplicado (TS + JS) que cuenta distinto, y data muerta
   en la DB con semántica diferente a la que muestra la UI.

## Integridad de datos

7. **Upload sin validación de tamaño/tipo** —
   `frontend/src/components/UploadSummaries.js:68-121`. Solo el `accept` del input.
   Un PDF roto o gigante se sube a storage (blob privado, no público) y luego el
   parse falla → **blob huérfano** que nadie borra.

8. **`removeSummary` borra el blob ANTES que la fila** —
   `UploadSummaries.js:142-165`. Si el `delete` de la fila falla (ej. red), el
   resumen queda apuntando a un archivo inexistente; el re-parse muere con
   "No se pudo leer el archivo". Orden correcto: borrar la fila y luego el blob.

## Seguridad / hardening

9. **CORS acepta cualquier `*.vercel.app`** —
   `backend/supabase/functions/_shared/cors.ts:17-21`. Cualquier app gratuita de
   Vercel (ajena al proyecto) recibe el `Access-Control-Allow-Origin` reflejado.
   Requiere el JWT del usuario para hacer daño, pero el allowlist de previews es
   más amplio de lo necesario (restringir a un patrón propio del proyecto).

10. **Flujo de reset de contraseña roto** —
    `frontend/src/components/Auth.js:126-144` manda `redirectTo:
    window.location.origin`, pero `App.js` no maneja `PASSWORD_RECOVERY` ni canjea
    el token → el link de Supabase vuelve a la home y **no hay pantalla de nueva
    contraseña**. Ya anotado como TODO; confirmado que está roto de punta a punta.

## Imprecisiones menores

- `detectSummaryType` matchea `visa` como substring sin word boundary
  (`backend/supabase/functions/parse-summary/detection.ts:2`) — "Avisación…"
  → VISA.
- `usePortfolioQuotes` no corta en 50 ni dedupea; el server corta en silencio
  (`backend/supabase/functions/quotes/index.ts:144-158`, `MAX_SYMBOLS`) →
  activos >50 sin precio y sin aviso.
- `InvestmentPlan.js:375`: portfolio 100% USD en modo USD muestra `—` si
  dolarapi cae, aunque no hay conversión que hacer (rate no debería ser
  necesario).
- `fmtCompact` sin guard de `null` (`frontend/src/lib/format.js:12-18`).
- `mapRows`/`findColumns` toman el **primer** header que matchee un alias
  (`backend/supabase/functions/parse-summary/parser.ts:34-45`); un CSV con
  columnas "Cargo" y "Abono" usa una sola.
- Reglas de `categorize` sin word boundaries (`broker`, `servicio`, etc.) —
  aceptado en Fase 5, documentado en HANDOFF, se deja sin tocar.

## Notas sobre documentación vs. realidad

- AGENTS.md/HANDOFF venden "análisis persistido" y categorización "fuente
  única"; en la práctica el análisis vive duplicado y divergente, y
  `consumption_analyses` es data muerta.
- `manual_price` (columna en 0007) ya se eliminó en `0012_drop_manual_price.sql`;
  los comentarios de la columna en `0007` quedaron obsoletos (menor).

## Prioridad propuesta para retomar

1. Presupuesto de compra inconsistente (`buyQty` + `applyBuy`).
2. `parsePercent` (1→100%) y `parseQuantity` (negativos) en `import-plan`.
3. Orden de `removeSummary` + borrado de blob huérfano en upload.
4. Destino de `consumption_analyses`: que el dashboard lo lea o eliminar la
   persistencia.
5. Hardening: CORS, flujo de reset de contraseña, validación de upload.
