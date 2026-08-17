# Batch 2 — import-plan: validaciones del backend

**Dominio:** backend Deno (Edge Function `import-plan`). **Índice:** #2.
**Estado:** [x] hecho (2026-08-16)

## Hallazgos que resuelve

- orig #2: `parsePercent` convierte "1" en 100% (`import-plan/planner.ts:27-37`). Heurística `value <= 1 ? value * 100 : value` toma un target real de `1%` como `100%`.
- orig #3: `parseQuantity` acepta tenencias negativas (`planner.ts:42-70`) → `-10` entra al plan sin rechazo.
- add #5: `import-plan` fuerza `currency: 'ARS'` y `asset_type: 'otro'` para todo item (`import-plan/index.ts:74-82`) — la info del Excel se descarta.
- add #6 (parcial): `target_weight` sin validar en `planner.ts:27-37` (acepta negativos, >100; >999.99 rompe el `numeric(5,2)` del INSERT → 500 atómico con mensaje genérico).
- add #17: `import-plan` solo lee la primera hoja del XLSX (`import-plan/index.ts:50`) — portadas/otras hojas rompen el parse.
- add #19: `replace_user_plan` sin clamp (`0013_replace_plan_rpc.sql:27-38`) — cast directo del JSON; valores fuera de rango → 500 sin diagnóstico.

## Criterio de éxito

- `parsePercent`: un target real de `1%` queda en `1`, no `100`. Sin heurística ambigua.
- `parseQuantity`: valores negativos se rechazan con error claro (no entran al plan).
- El import respeta moneda/tipo del Excel cuando vienen (con fallback documentado a ARS/otro).
- `target_weight` fuera de `0-100` se rechaza con mensaje que identifica el item problemático, antes del RPC.
- XLSX multi-hoja: encuentra la hoja con los encabezados reales (o rechaza con mensaje claro).
- `deno test` verde en las suites de import-plan/planner/handler.
- Deploy aplicado (ver regla: `supabase db push` antes de `functions deploy import-plan`).

## Tareas

1. **`planner.ts` — `parsePercent`**: eliminar la heurística `<1 → *100`. Definir el criterio: si la columna ya trae porcentaje (`%`), tomar tal cual; si viene como fracción, requerir formato explícito. Documentar el contrato en un test.
2. **`planner.ts` — `parseQuantity`**: rechazar negativos (error con el símbolo del item). Test.
3. **`planner.ts` — `target_weight`**: validar `0 <= w <= 100` por item; error que nombre el item y el valor. Test.
4. **`import-plan/index.ts`**: en vez de hardcodear `currency: 'ARS'` / `asset_type: 'otro'`, intentar leer del Excel (columnas moneda/tipo) con fallback documentado. Alinear con el contrato de B3 (si el ledger soporta USD, el import debe poder traer USD).
5. **`import-plan/index.ts` — multi-hoja**: iterar hojas del workbook y elegir la que tiene el header real (o devolver error claro). Test con fixture de 2 hojas.
6. **`0013_replace_plan_rpc.sql`** (o nueva migración `0018`): agregar clamp/validación de `target_weight`/`quantity` en el RPC como segunda barrera + mensaje de error que identifique el item. **No editar `0013` aplicada en prod**: si hay cambio, nueva migración y `supabase db push`.
7. Tests unitarios para cada cambio (ver criterio de éxito).

## Tests a tocar

- `backend/supabase/functions/planner_test.ts` — parsePercent, parseQuantity, target_weight.
- `backend/supabase/functions/import-plan/handler_test.ts` (o donde estén los tests del handler) — moneda/tipo, multi-hoja, errores.
- Si nueva migración: verificar `supabase db reset` / `db push` local.

## Documentación

- `DONE.md` + `HANDOFF.md` al cierre.
- Nota de deploy en el header si aplica (orden db push → deploy).

## Checklist de cierre

- [x] `deno test` verde en functions (78/78)
- [x] `deno lint` + `deno fmt --check` OK
- [x] Migración `0018` aplicada en hosting (`supabase db push`) + `functions deploy import-plan` (2026-08-16)
- [x] Índice `batches/README.md` marcado [x]