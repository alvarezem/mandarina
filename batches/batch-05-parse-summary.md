# Batch 5 — parse-summary: resiliencia

**Dominio:** backend Deno (Edge Function `parse-summary`) + migración. **Índice:** #5.
**Estado:** [ ] pendiente

> Depende de **B6** (se elimina `consumption_analyses`, que `finalize_parse` hoy escribe — tocar `finalize_parse` acá debe respetar ese cambio).

## Hallazgos que resuelve

- add #16: `parse-summary` sin tope de tamaño del blob (`parse-summary/index.ts:134-141`) — un PDF gigante tumbar la edge y deja el resumen en 'parsing' (a diferencia de `import-plan`, que limita base64 a ~7MB).
- add #12: estado `parsing` sin timeout ni recuperación (`parse-summary/index.ts:132`) — si la edge muere entre `setStatus('parsing')` y el RPC, queda amber "parsing" para siempre. No hay botón de re-parse (grep sin matches).
- add #11: re-parse borra categorías manuales por transacción (`finalize_parse` en `0014_reliability.sql:89-104` hace delete+insert y solo re-aplica `merchant_overrides`).
- add #10 (parcial): CSV/XLSX columna USD ignorada, todo se fuerza ARS (`parser.ts:34-45`, `parse-summary/index.ts:152-156`).
- menores: PDF con columnas Pesos+Dólares simultáneas → `amount = pesos` pero `currency = USD` (`parse-summary/index.ts:277-288`); re-parse sobrescribe `summary_type` autodetectado (default `'Banco'`, `detection.ts:40`); `detectSummaryType` matchea `visa` como substring sin word boundary (`detection.ts:2`); `mapRows`/`findColumns` toman el primer header que matchee (`parser.ts:34-45`).

## Criterio de éxito

- Blob con tamaño > umbral se rechaza con error claro (no se parsea ni queda colgado).
- Estado `parsing` no queda para siempre: timeout/recuperación + botón de re-parse en la UI (o mecanismo que permita recuperar). Re-parse idempotente.
- Re-parse preserva las categorías manuales por transacción que no fueron sobreescritas por un override nuevo.
- CSV/XLSX con montos USD se parsean como USD (y el PDF pesos+dólares no produce filas con moneda inconsistente).
- `summary_type` no se sobreescribe en re-parse si el usuario lo clasificó manualmente.
- `detectSummaryType` con word boundary (`visa` no matchea "Avisación…").
- `deno test` verde (parser, detection, handler) + `npm test` verde si cambió la UI (botón re-parse).
- Deploy aplicado con el orden correcto (db push → deploy).

## Tareas

1. **`parse-summary/index.ts`**: tope de tamaño del blob antes de descargar/parsear (umbral definido, alineado con `import-plan`). Error claro.
2. **Recuperación de `parsing`**: mecanismo de timeout/recuperación (puede ser en la edge: setear status de vuelta a `error`/`ready` si pasó X tiempo, o en la UI: botón que reintenta/limpiar). Decidir dónde vive la señal de "re-procesable".
3. **Botón de re-parse** en la UI (`UploadSummaries.js` o el detalle del resumen): llama al parse de nuevo (la edge ya es idempotente por `finalize_parse`). Verificación de que re-parse funciona end-to-end.
4. **`finalize_parse`/parse**: preservar categorías manuales. Estrategia propuesta: en el delete+insert, conservar el `category` existente por transacción cuando el nuevo parse no lo cambia (o re-aplicar solo lo que cambia). **Coordinar con B6** (que toca la escritura de `consumption_analyses` en la misma función).
5. **Moneda en CSV/XLSX** (`parser.ts`): detectar columna USD / no forzar ARS; **`parse-summary/index.ts:152-156`**: usar la moneda detectada. **PDF pesos+dólares**: o bien descartar la columna de pesos cuando hay dólares, o bien marcar la moneda correcta (decidir con B7 el criterio de moneda del instrumento).
6. **`summary_type`**: no pisar el valor del usuario en re-parse (conservar si fue clasificado manualmente).
7. **`detection.ts`**: word boundary en `visa`. Tests.
8. **`parser.ts` `mapRows`/`findColumns`**: decidir cómo manejar columnas con alias duplicados ("Cargo"/"Abono") sin tomar solo la primera.

## Tests a tocar

- `backend/supabase/functions/parser_test.ts` — moneda CSV, pesos+dólares, mapRows.
- `backend/supabase/functions/parse-summary/detection_test.ts` — word boundary visa.
- `backend/supabase/functions/handler_test.ts` — tope de tamaño, idempotencia, recuperación.
- Frontend si hay botón de re-parse: `UploadSummaries.test.js`.

## Documentación

- `DECISIONS.md` si se decide criterio de moneda/overshadow en re-parse.
- Nota de deploy (orden db push → deploy) si cambia la migración.
- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `deno test` verde en functions
- [ ] `deno lint` + `deno fmt --check` OK
- [ ] Migración aplicada en hosting (si aplica)
- [ ] `npm test` verde (si tocó UI)
- [ ] Índice `batches/README.md` marcado [x]