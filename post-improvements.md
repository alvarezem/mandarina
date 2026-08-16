# post-improvements — Revisión post-Fase 8

Revisión de código completa (2026-08-12, ampliada 2026-08-16) posterior al
cierre de las 8 fases de `improvements.md`. Documento de hallazgos, ordenados
por severidad, con `archivo:línea` para cada uno. **No se aplicaron cambios** —
queda como reporte/roadmap de saneamiento para próximas sesiones. Los hallazgos
de la revisión del 2026-08-16 están en la sección final.

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

---

# Hallazgos adicionales (2026-08-16)

Segunda pasada completa (frontend + edge functions + migraciones) sobre el mismo
reporte. Los puntos 1-10 de arriba siguen **sin resolver**; esto es lo nuevo que
se sumó. No reemplaza lo anterior: lo complementa.

## Bugs de lógica (impacto real)

1. **`distribute` consume presupuesto para activos sin precio → step inútil que
   siempre falla** — `frontend/src/lib/plan.js:101-114`. Un activo sin
   cotización (price null, target>0) entra a `steps` con `qty: 0` (`buyQty`
   devuelve 0 por `if (!p) return 0`) pero **`remaining -= amount` igual
   descuenta** (`plan.js:113`). Al clickear "Comprar", `applyBuy`
   (`InvestmentPlan.js:225-264`) inserta en el ledger `quantity: 0`, que viola
   `check (quantity > 0)` de `0016_ledger.sql:11` → error; el step queda roto y
   el presupuesto se muestra consumido sin efecto. `applyBuy` además no corta si
   `step.qty === 0` (solo hay guard para `step.qty > 0` en el precio calculado).

2. **`applyBuy` es un doble-write no atómico** — `InvestmentPlan.js:228-250`.
   `portfolio_plan.update` y `ledger_operations.insert` son dos llamadas
   separadas. Si el insert del ledger falla (red, constraint), la cantidad del
   plan **ya quedó incrementada** sin registro en el ledger ni descuento de
   budget → el usuario puede clickear de nuevo y duplicar la cantidad.

3. **`applyBuy` registra `price: amount/qty`, no el precio de mercado** —
   `InvestmentPlan.js:244`. Con el `buyQty` forzado a 1 (amount < price, punto 1
   del reporte original) el costo promedio del ledger queda **por debajo del
   precio real** → la rentabilidad del LedgerView se infla. El precio BYMA
   disponible en `quotes` se ignora a propósito.

4. **Ledger siempre `currency: 'ARS'`** — `InvestmentPlan.js:246` y
   `RegisterOperationModal.js:76` hardcodean ARS (el modal ni siquiera tiene
   selector de moneda, aunque la columna existe en `0016`). Un activo USD
   comprado desde el plan se anota como ARS; `ledger.js:5` lo asume explícito
   ("Todo en currency de la operación (por ahora siempre ARS)").

5. **`import-plan` fuerza `currency: 'ARS'` y `asset_type: 'otro'` para todo
   item** — `backend/supabase/functions/import-plan/index.ts:74-82`. La info de
   moneda/tipo del Excel se descarta; todo plan importado queda ARS. Divergente
   con el formulario manual (`AssetForm.js` tiene selector de moneda).

6. **Validación de `target_weight` inconsistente entre import y UI** —
   `planner.ts:27-37` acepta negativos y >100; un target >999.99 hace fallar el
   INSERT por `numeric(5,2)` → 500 atómico con mensaje genérico
   ("No se pudo reemplazar el plan"). La UI clampa a 0-100
   (`InvestmentPlan.js:170`). Además `buyAmount` devuelve **0 en silencio** para
   target ≥ 100 (`plan.js:22-24`) y para target negativo — el plan queda como
   "sin faltante" sin ninguna advertencia.

7. **`ledgerQuantity`/`costBasis` permiten vender más de lo tenido** —
   `frontend/src/lib/ledger.js:37` descarta el excedente en silencio
   (`Math.max(0, acc.quantity - qty)`). Se registra una venta que no tiene
   respaldo en la posición y el resultado se pierde sin error.

8. **`buildPlan` usa `total` = suma de valores con precio, tratando los
   sin-precio como 0** — `plan.js:44`. Un activo sin cotización (FCI/efectivo)
   distorsiona los `actualPct`/`gap`/`buy` de **todo el resto** del plan, no
   solo el suyo; la receta "recalcular en vivo" parte de un total incorrecto.

## Integridad de datos

9. **Dashboard sin paginación: corta en silencio a 1000 filas** —
   `Dashboard.js:123-127` es el único fetch de transacciones y no usa
   `.limit()`/`.range()` (el único `.limit` del frontend es `App.js:35`, 3
   filas). PostgREST hosted corta por defecto en 1000 (declarado en
   `config.toml:18`). Con >1000 txs el dashboard queda incompleto sin aviso ni
   indicación de que hay más.

10. **CSV/XLSX: columna USD ignorada, todo se fuerza ARS** —
    `parser.ts:34-45` toma la **primera** columna de monto que matchee un alias
    y `parse-summary/index.ts:152-156` setea `currency: 'ARS'` siempre. Un
    resumen CSV/XLSX con montos en USD se cuenta como ARS (el PDF sí detecta
    USD). El impacto de la duplicación ya reportada de `mapRows` es este.

11. **Re-parse borra categorías manuales por transacción** —
    `finalize_parse` (`0014_reliability.sql:89-104`) hace delete+insert y solo
    re-aplica los `merchant_overrides` (`parse-summary/index.ts:172-183`). Los
    cambios puntuales de categoría hechos en la tabla (sin "recordar") se
    pierden al re-procesar un resumen.

12. **Estado `parsing` sin timeout ni recuperación** — `parse-summary/index.ts:132`.
    Si la edge muere entre `setStatus('parsing')` y el RPC, el resumen queda
    amber "parsing" para siempre. **No hay botón de re-parse** (grep sin
    matches): el único camino es borrar y resubir. Un parse fallido también
    requiere borrar+resubir; no hay retry.

13. **Otro caso de blob huérfano en storage** — `UploadSummaries.js:97-113`: si
    el INSERT de `card_summaries` falla (red/RLS) después del upload, el blob
    queda en storage sin fila que lo referencie (el punto 7 cubre el PDF roto;
    este es el path del insert fallido, sin rollback del upload).

14. **Sin dedupe por contenido** — subir dos veces el mismo archivo crea
    `<nombre>_1.<ext>` (`sanitizeFileName.js:27-37`) y duplica transacciones
    parseadas; no hay comparación de contenido ni advertencia.

## Moneda / conversión

15. **El `currency` de la quote de BYMA es data muerta** — `byma.ts:58-59` lo
    devuelve, pero el frontend nunca lo lee. La conversión depende del campo
    `currency` tipeado por el usuario (default ARS, e import siempre ARS). Un
    instrumento cotizado en USD en el plan como ARS se valora mal, y un activo
    ARS marcado USD se multiplica por el rate de más.

## Backend / hardening

16. **`parse-summary` sin tope de tamaño del blob** — `parse-summary/index.ts:134-141`
    descarga sin check (a diferencia de `import-plan`, que limita el base64 a
    ~7MB, `import-plan/index.ts:11`). Un PDF gigante puede tumbar la edge
    (timeout/OOM) y dejar el resumen en 'parsing' (punto 12).

17. **`import-plan` solo lee la primera hoja del XLSX** —
    `import-plan/index.ts:50`. Un workbook con hoja de portada u otras hojas
    importa lo incorrecto o falla con "No se encontró la fila de encabezados".

18. **Sin rate limit por usuario en las 3 funciones** — solo `verify_jwt`
    (`config.toml:389-396`). Un usuario autenticado puede martillar `quotes`
    (BYMA/dolarapi) y `parse-summary`; el cache de 60s (`quotes/index.ts:12`)
    solo mitiga dentro de un mismo isolate.

19. **`replace_user_plan` sin clamp de `target_weight`/`quantity`** —
    `0013_replace_plan_rpc.sql:27-38`: cast directo de JSON; valores fuera de
    rango → 500 con mensaje genérico. El import completo falla atómico (bien),
    pero sin diagnóstico del item que lo rompe.

## Imprecisiones menores (nuevas)

- **PDF con columnas Pesos y Dólares simultáneas**: `amount = parts.pesos` pero
  `currency = 'USD'` (`parse-summary/index.ts:277-288`) — moneda e importe
  inconsistentes en la misma fila.
- **Re-parse sobrescribe `summary_type`** autodetectado (default `'Banco'` para
  PDFs, `detection.ts:40`) pisando la clasificación manual del usuario
  (`finalize_parse`, `0014_reliability.sql:111-117`).
- **Watchlist acepta `MEP`/`CCL`** (`watchlist.js:5-18` los permite) pero la
  edge los filtra (`quotes/index.ts:151`) → "sin precio" permanente.
- **`MarketQuotes` en display USD sin rate** (`MarketQuotes.js:144`): muestra
  precios ARS etiquetados como USD.
- **Cards del Ledger mezclan scope** (`LedgerView.js:70-74`): `totalInvested`
  incluye símbolos totalmente vendidos (el costo nunca se descuenta en
  `costBasis`), mientras `totalCost`/`totalValue` solo cubren los tenidos.
- **`paymentsCount` sin filtro de moneda/categoría** (`Dashboard.js:206-209`):
  muestra "X pagos excluidos" aunque el filtro USD esté activo.
- **Resumen sin transacciones no aparece en el dropdown** de resúmenes
  (`Dashboard.js:224-234` lo deriva de `allTx`).
- **`fmt` renderiza "NaN"** para valores no finitos (`format.js:18-27`),
  propagando el `period.days = NaN` del punto 5 a los cards del dashboard.
- **Fetch de `transactions` sin filtro de `user_id` (defensa en profundidad)** —
  `Dashboard.js:123-127` no aplica `.eq('user_id', …)` y depende solo de RLS.
  `improvements.md` Fase 2 (borrado en 2026-08-16) afirmaba el filtro en "los 4
  fetches", pero hoy solo lo tienen `InvestmentPlan.js:64`, `MarketQuotes.js:108`,
  `UploadSummaries.js:42` y overrides/categorías (`Dashboard.js:142-143`); se
  perdió en el refactor Fase 3/4 (hook `useAsync`). Sin riesgo real (RLS cubre),
  pero es código divergente de lo documentado.

## Nota de sesgo de confirmación

El bug #1 del reporte original (`buyQty` fuerza 1 aunque el monto no alcance)
está **codificado como comportamiento esperado** en `plan.test.js:43-45`
("al menos 1 si hay faltante aunque no alcance para una unidad"). No es un
defecto sin test: es un tradeoff aceptado que igual rompe el presupuesto del
plan — evidencia de que la receta "se recalcula en vivo" nunca se validó contra
el caso real de amount < price. A la hora de priorizar, conviene tratarlo como
decisión a re-litigar (ver DECISIONS.md), no solo como fix mecánico.

## Prioridad propuesta ampliada (2026-08-16)

1. Budget inconsistente del plan: `distribute`+`buyQty`+`applyBuy` (puntos 1-3
   nuevos + punto 1 original) como un solo bloque, con test que falle hoy.
2. Ledger: moneda única ARS hardcodeada (4, 5) y venta sin respaldo (7) —
   decide si el ledger soporta USD o se documenta como ARS-only.
3. Persistencia del parse: re-parse sin recuperación ni re-parse UI (12), tope
   de tamaño (16), y categorías manuales que se pierden (11).
4. Paginación del dashboard (9) y moneda del instrumento ignorada (15).
5. El resto de hardening sin resolver del reporte original (CORS, reset).
