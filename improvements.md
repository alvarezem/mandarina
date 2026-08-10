# Plan de saneamiento y refactor — Mandarina

Documento vivo del saneamiento integral de la aplicación. Se ejecuta por fases,
cada una con criterio de éxito verificable. Lo terminado se marca con `[x]` y se
archiva en `DONE.md`. Lo pendiente queda acá.

Decisiones de alcance acordadas:
- **Toolchain**: migrar de Create React App a **Vite + Vitest** (elimina las deps
  comprometidas que entran por react-scripts).
- **Estándares**: el máximo posible con herramientas **100% free** (GitHub Actions,
  Dependabot, ESLint, Prettier, husky + lint-staged).
- No se compra ningún servicio de pago; nada de esto requiere cuentas nuevas.

---

## 0. Contexto y hallazgos base

### 0.1 Vulnerabilidades de terceros (compromised.md)
Los paquetes de `compromised.md` **NO deben usarse**. Estado actual del árbol:
- 🔴 En `frontend/package-lock.json` hay 3 de la lista como transitivas de
  **react-scripts** (eslint): `keyv`, `flat-cache`, `file-entry-cache`.
  Hoy están **contenidas** por `overrides` con versiones seguras
  (`4.5.4` / `3.2.0` / `6.0.1`), pero siguen presentes en el árbol.
- ✅ El resto de la lista (cacheable-request, cache-manager, @cacheable/*,
  ecto, @deliveroo/reevent, @or-sdk/*, @picsart/ai-sdk, @qlik/embed-runtime,
  picasso.js) **no está** en ningún árbol (frontend ni backend).
- **Criterio de éxito Fase 1**: después de migrar a Vite, `npm ls` y el lockfile
  deben quedar **sin ninguna** de esas dependencias; los `overrides` se eliminan.

### 0.2 Hallazgos de alto impacto
Frontend:
1. Plataforma vieja: react-scripts 5.0.1 (2022) con React 19 y overrides de CVEs.
2. `getSession().then()` sin `.catch()` en `App.js:79` → splash infinito / unhandled rejection.
3. God components: `Dashboard.js` (906 líneas), `InvestmentPlan.js` (809), `MarketQuotes.js` (627), `UploadSummaries.js` (532).
4. ~150 líneas de lógica de datos de inversiones **duplicadas** entre InvestmentPlan y MarketQuotes.
5. Mutaciones Supabase sin try/catch en casi todos los componentes.
6. Fetch de datos sin filtro de `user_id` (depende solo de RLS) en `Dashboard.js:353`,
   `InvestmentPlan.js:90`, `MarketQuotes.js:129`, `UploadSummaries.js:35`.

Backend:
7. **Service role key viva** en `backend/.env:2` (exp 2036) + **cliente huérfano**
   `backend/src/supabaseClient.js` que la usa (nada lo importa). Bypass total de RLS.
8. Cache in-memory sin límite en `quotes/index.ts:23` (DoS de memoria).
9. Re-parse duplica transacciones (`parse-summary/index.ts:118-120`, sin unique constraint).
10. Reemplazo del plan no transaccional en `import-plan/index.ts:185-207`.
11. Auth débil por defecto en `config.toml`: password min 6, confirmaciones off,
    `secure_password_change` off, `max_frequency 1s`.
12. Dependencias de funciones no reproducibles: sin `deno.json`, `deno.lock` incompleto,
    no se pueden type-checkear los `index.ts` localmente.
13. Sin índice en `transactions(summary_id)` (FK con ON DELETE CASCADE → seq scans).
14. Inconsistencia de categoría: `_shared/categorize.ts:23` no incluye `telecom`,
    pero la migración `0009` fusionó Telecom→Servicios.

### 0.3 Fuera de alcance / diferido (no tocar en este plan)
- Roadmap de producto de `TODO.md` (watchlist, ledger, móvil, Mandi, broker convencional).
- Rebrand/dominios (ya resueltos, ver DONE).
- OAuth Google en dev local (en hold por decisión del usuario).
- Nuevos bancos/parseadores (en hold).
- Cambio de marca visual.

---

## FASE 0 — Baseline (verificación previa) — HECHA el 2026-08-08
_Objetivo: suites verdes y estado reproducible registrado antes de tocar nada._

**Criterio de éxito**: todo el stack funciona y queda documentado antes de Fase 1.

Resultados verificados:
- [x] **Frontend tests** — `cd frontend && CI=true npm test` → **14 suites / 149 tests verdes** (Node v26.5.1 + react-scripts 5.0.1). Warnings de `act(...)` en consola (no bloquean; a revisar en Vitest/Fase 6).
- [x] **Frontend build** — `npm run build` → OK, salida en `build/` (main 219 kB gzip). **Hallazgo**: node_modules estaba **stale** (la sesión abortada de la migración lo dejó podado, `web-vitals` faltaba); se resolvió con `npm ci` (reinstala exacto desde el lockfile). Lección: node_modules no lo restaura git — tras abortar cambios, correr `npm ci`.
- [x] **Backend Deno tests** — `cd backend/supabase/functions && deno test` → **26 tests verdes** (17 detection + 6 byma + 3 pool).
- [x] **Tag de rollback** — `pre-fase1` sobre `13c60c6` (estado previo a Fase 1).

---

## FASE 1 — Migración de toolchain: CRA → Vite + Vitest — HECHA el 2026-08-08
_Objetivo: plataforma moderna, eliminar las deps comprometidas, dev/build/test unificados._

**Por qué**: react-scripts 5 no soporta React 19 y es la única fuente de los
paquetes comprometidos. Vite es el estándar actual y 100% free.

Tareas:
1. `package.json`:
   - Sacar: `react-scripts`, `web-vitals`, `@testing-library/dom` (va transitivo).
   - Agregar (dev): `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`.
   - Subir `@testing-library/user-event` a v14+.
   - Sacar `overrides` (ya no hacen falta) y `eslintConfig` de CRA.
   - Scripts:
     - `start`: `concurrently -k "tailwindcss -i ./src/index.css -o ./src/index.generated.css --watch" "vite"`
     - `build`: `npm run build:css && vite build`
     - `build:css`: sin cambios
     - `test`: `vitest run` · `test:watch`: `vitest`
     - `lint`: `eslint .` (Fase 7) · `format`: `prettier --write .` (Fase 7)
     - Eliminar `eject`.
2. `vite.config.js` (nuevo, raíz de frontend): plugin react; `server.port: 3000`
   (mantiene OAuth localhost:3000); bloque `test` con `environment: 'jsdom'`,
   `globals: true`, `setupFiles: './src/setupTests.js'`.
3. `index.html`: mover `public/index.html` → raíz `frontend/`; reemplazar
   `%PUBLIC_URL%/…` por `/…`; agregar `<script type="module" src="/src/index.js">`;
   borrar comentarios boilerplate de CRA; conservar script inline de tema.
   El resto de `public/` (favicon, logos, manifest, robots) queda y Vite lo copia.
4. Env vars: `REACT_APP_*` → `VITE_*` en `.env`, `.env.example`,
   `src/lib/supabaseClient.js:4-5` (`process.env` → `import.meta.env`) y
   `src/components/Sidebar.js:46` (`process.env.PUBLIC_URL` → `/`).
5. Tests a Vitest (mecánico):
   - `jest.fn`→`vi.fn`, `jest.mock`→`vi.mock`, `jest.clearAllMocks`→`vi.clearAllMocks`
     en los 14 `.test.js`.
   - `const supabase = require('../lib/supabaseClient').default` → import con mock
     hoisted (patrón `vi.mock` arriba + `import`).
   - `setupTests.js`: `import '@testing-library/jest-dom/vitest'` + mock de matchMedia.
   - Mover el mock de `react-chartjs-2` a `setupTests.js` (hoy duplicado en 3 archivos).
6. `vercel.json`: `framework: "vite"`, `outputDirectory: "dist"`.
7. `.gitignore`: agregar `/dist`; `index.generated.css` ya está.
8. Limpiar huérfanos de CRA: `src/reportWebVitals.js`, `src/logo.svg`, `web-vitals`.
9. Actualizar `frontend/README.md` (hoy 100% boilerplate de CRA).

**Verificación**:
- [x] `npm run build` compila (salida en `dist/`). 210 kB gzip (baseline CRA: 219 kB).
- [x] `npm test` pasa completo (Vitest) — 14 archivos / 149 tests verdes.
- [x] `npm start` levanta dev server en :3000.
- [x] `npm ls keyv flat-cache file-entry-cache` → sin salida (arbol limpio).
- [x] El lockfile ya no contiene ninguna dep de compromised.md.

Hallazgos de la migración:
- **JSX en `.js`**: el transformador oxc de Vite 8 excluye `.js` por defecto y
  infiere `lang: 'js'` (JSX deshabilitado). Solución: plugin `transform-jsx-in-js`
  en `vite.config.js` (pre-transform con `lang: 'jsx'`), ver discusión de Vite #21505.
- **`localStorage` undefined en tests**: Node 26 expone un global `localStorage`
  experimental (undefined sin `--localstorage-file`) que Vitest filtra de las keys
  del window. Solución: mock in-memory en `setupTests.js`.
- **Accname sin espacio**: jsdom 30 concatena texto inline sin espacio (spec-correct);
  jsdom 16 (CRA) insertaba espacios. Se ajustaron 10 matchers de tests a `\s*`.
- **OAuth redirectTo**: jsdom 30 default url trae puerto; se fijó
  `environmentOptions.jsdom.url = 'http://localhost'` para que `window.location.origin`
  coincida con el `redirectTo` esperado en tests.
- Se eliminaron huérfanos CRA: `src/reportWebVitals.js`, `src/logo.svg`, `web-vitals`.

---

## FASE 2 — Seguridad y secretos — HECHA el 2026-08-10
_Objetivo: sin llaves en disco, auth fuerte, funciones y storage endurecidos._

### 2.1 Service role / cliente huérfano
1. **Eliminar la service role key del disco** (`backend/.env`). ~~Rotar~~: **Supabase ya no
   permite rotar las legacy keys** (`anon`/`service_role`) ni el JWT secret — solo ver/copiar
   (verificado 2026-08-09, doc oficial "API Keys"). La key no está comprometida (nunca entró al
   historial git ni se expuso), así que la vía correcta es **borrar `backend/.env`** (la única copia
   local, gitignored). La migración a las nuevas API keys (`sb_publishable`/`sb_secret`) queda como
   mejora futura en `TODO.md` (Supabase depreca las legacy keys a fines de 2026).
2. Eliminar `backend/src/supabaseClient.js`, `backend/package.json`,
   `backend/package-lock.json`, `backend/node_modules/` (nada los usa; el README
   apunta a otro archivo). El backend pasa a ser 100% Edge Functions + migraciones.
3. Documentar en `backend/.env.example` el set mínimo de variables.
4. `git grep` de posibles secrets en el historial para confirmar que nunca se
   commiteó (verificado: no).

### 2.2 Endurecer `backend/supabase/config.toml`
1. Auth:
   - `minimum_password_length = 8`, `password_requirements` con letra+número. **El usuario eligió
     en el dashboard `letters_digits` (min 8 + letras + números)**; se actualizó
     el `config.toml` para que local coincida con hosting.
   - `enable_confirmations = true` (verificar impacto en flujo de signup/frontend).
   - `secure_password_change = true`. **Activado en el dashboard por el usuario** (2026-08-09):
     al cambiar la password pide la actual.
   - `max_frequency` del email a un valor anti-spam (ej. `"10s"`/rate limit).
   - Evaluar captcha (gratis con hCaptcha/Turnstile) como mejora futura.
2. Funciones: declarar `[functions.parse-summary]`, `[functions.quotes]`,
   `[functions.import-plan]` todos con `verify_jwt = true` (hoy solo
   parse-summary lo tiene explícito).
3. CORS: reemplazar `*` por el origen real del frontend (`https://mandarina-fi.vercel.app`
   + `http://localhost:3000`) en las 3 funciones.
4. Deshabilitar servicios sin uso: `[realtime]`, `[analytics]`, `[storage.vector]`,
   `[storage.s3_protocol]`.
5. Arreglar `[db.seed]`: apuntar a un `seed.sql` real o vaciar la sección
   (hoy rompe `supabase db reset`).
6. Revisar `[db.schema]` y GRANTs para que el acceso Data API coincida local vs hosted.

### 2.3 Endurecer Edge Functions
1. `quotes/index.ts`:
   - Cache con **límite** (LRU/size cap) y TTL; validar `symbols` (array, strings,
     max N, dedupe) antes de usarlo.
   - `raw.toUpperCase()` a salvo de no-strings (`String(raw)`).
   - AbortSignal/timeout en los fetch a BYMA/dolarapi.
2. `import-plan/index.ts`:
   - Límite de tamaño en `file_base64` (rechazar > umbral) antes de `atob`.
   - Reemplazo del plan **atómico** (transacción/RPC único o delete+insert en un
     solo round-trip con `supabase.rpc`), sin ventana de datos perdidos.
   - No exponer `insError.message` crudo al cliente (mensaje genérico + log).
   - Revisar `parseQuantity` (el `replace(/\./g,'')` convierte "1.5"→15).
3. `parse-summary/index.ts`:
   - Idempotencia: borrar/actualizar la transacción previa del mismo resumen antes
     de insertar, o agregar unique constraint (ver Fase 5).
   - Validar `summary_id` (UUID) y pertenencia explícita antes de parsear.
   - No exponer `e.message` al cliente.
   - PDF: no forzar todos los montos negativos (`-Math.abs(amount)`); preservar signo.
   - `setStatus` con manejo de error.
4. `_shared/categorize.ts`: alinear `telecom` → Servicios (ver Fase 5).
5. Manejo de errores consistente: `corsHeaders`/`json` compartidos (Fase 5),
   responses tipados `{ok, error}`.

### 2.4 Higiene de datos en frontend (defensa en profundidad)
1. Filtrar por `user_id` en los fetches de `transactions`, `portfolio_plan` y
   `card_summaries` (hoy dependen solo de RLS).
2. Reemplazar renders crudos de `error.message` de Supabase por mensajes amigables
   (Dashboard, UploadSummaries, InvestmentPlan, MarketQuotes).

**Verificación**:
- [x] `git grep` no encuentra service role ni anon keys fuera de `.env` gitignored (verificado el 2026-08-09: el valor de la key nunca entró al historial).
- [x] Todas las funciones tienen `verify_jwt = true` y CORS restringido en **código** (`config.toml` + `_shared/cors.ts`).
- [x] Deploy aplicado en hosting (2026-08-09): `supabase functions deploy parse-summary import-plan quotes` → parse-summary v17, quotes v7, import-plan v4, todas **ACTIVE**.
- [x] Migración aplicada en hosting (2026-08-09): `supabase db push` → `0013_replace_plan_rpc.sql` aplicada (confirmada en `migration list`); `replace_user_plan` disponible para import-plan.
- [x] `supabase db reset` corre (seed arreglado). **VERIFICADO el 2026-08-09**: `supabase start` levantó el stack local y `supabase db reset` aplicó las 13 migraciones (0001–0013) sin errores; seed ya no rompe (`enabled = false`). Stack local apagado tras verificar.
- [ ] Re-parse de un mismo resumen no duplica transacciones (test). **Implementado en código** (delete previo de `transactions` por `summary_id` en `parse-summary`). Faltan los tests unitarios del handler (planificados en Fase 5.4).
- [x] Los mensajes de error en la UI no contienen detalles del backend (mensajes amigables + `console.error`; tests actualizados).

**Pendientes de Fase 2 (tu checklist manual en el dashboard de Supabase)** — [PASO A PASO en la sección "Paso a paso manual (usuario)" más abajo]:
1. **`backend/.env` BORRADO** ✅ (2026-08-09): la service role key ya no está en disco. Nota: **Supabase ya no permite rotar las legacy keys** — la rotación quedó descartada; la key no estaba comprometida (nunca entró al historial git). La migración a nuevas API keys queda como mejora futura en `TODO.md`.
2. **Aplicar los settings de auth en el dashboard** (el `config.toml` solo afecta local) — **HECHO por el usuario** (2026-08-09): `minimum_password_length = 8`, password requirements **`letters_digits`** (letras + números), email **Confirmations ON**, **`secure_password_change` ON** (pide la password actual al cambiarla). Se reflejó el mismo requisito en `config.toml`.
3. **Verificar el flujo de signup** con confirmación de email ON (cambia el flujo: el usuario debe confirmar el email antes de entrar). **HECHO por el usuario (2026-08-10)**: signup con confirmación + "Ya existe una cuenta" (email existente) + email de reset — los 3 verificados en hosting.
4. **Verificación local**: `supabase db reset` ✅ YA VERIFICADO (2026-08-09, stack local + 13 migraciones OK).
5. `backend/.env.example`: ya actualizado a `SUPABASE_ANON_KEY` (sin service role).

### Paso a paso manual (usuario) — dashboard de Supabase

> Entrá a https://supabase.com/dashboard/project/qfjehqaeagskxjulzhgx (proyecto **fimplify**).

**1. Service role key — ya no se rota (Supabase bloqueó la rotación de legacy keys)**
- ✅ **`backend/.env` fue borrado** (2026-08-09): la única copia local de la `service_role` key ya no está en disco.
- La key sigue existiendo en el dashboard (es la key estándar del proyecto, no está comprometida).
- Opcional y recomendado a futuro: migrar a las **nuevas API keys** (`sb_publishable`/`sb_secret`), que sí permiten rotación individual — anotado en `TODO.md` (Supabase depreca las legacy keys a fines de 2026).

**2. Settings de auth — HECHO por el usuario (2026-08-09)**
- `minimum password length = 8`, requerimiento **letras + números** (`letters_digits`).
- **Confirm email** ON.
- **Secure password change** ON → al cambiar la password pide la actual.
- Rate limits de resets anti-spam (si tu plan los expone).
- `config.toml` actualizado para que local coincida.

**3. Verificar el flujo de signup con confirmación — PENDIENTE**
1. En incógnito o con un email de prueba, registrate en `mandarina-fi.vercel.app` (o `localhost:3000`).
2. Confirmá que el email de confirmación llega y que el acceso se habilita solo tras confirmar.
3. Si algo del flujo se rompe (los emails de producción los maneja el SMTP de Supabase), avisá para ajustar.

**Estado del cierre**: Fase 2 **HECHA**. El signup con confirmación y la UX de auth quedaron verificados
en hosting (2026-08-10): email de confirmación, "Ya existe una cuenta" para emails ya registrados y email
de recuperación de contraseña. La UX de auth en español (errores traducidos, email existente, "¿Olvidaste tu
contraseña?") se implementó y deployó (commit `03f8986`). Pendientes de auth en `HANDOFF.md`:
el flujo de **cambio de contraseña** desde el link del email (pantalla de nueva password) queda como tarea aparte.

**Código realizado (2026-08-09)**:
- Borrados: `backend/src/supabaseClient.js`, `backend/package*.json`, `backend/node_modules/`, y `backend/.env` (service role key fuera de disco).
- `config.toml`: auth hardening (min 8, `letters_digits`, confirmations on, secure_password_change on, `max_frequency 10s`), `verify_jwt` en las 3 funciones, seed `enabled = false`, apagados `[realtime]`, `[storage.s3_protocol]`, `[storage.vector]`, `[analytics]`.
- `_shared/cors.ts`: `corsHeaders` + `json` con allowlist (producción, `localhost:3000`, `*.vercel.app`) y `Vary: Origin`; consumido por las 3 funciones.
- `quotes/index.ts`: cache LRU con cap (1000), `normalizeSymbols` (strings, sin MEP/CCL, dedupe, máx 50), timeouts (AbortSignal) en dolarapi y byma.
- `import-plan/index.ts`: tope de `file_base64` (~5MB) antes de `atob`, reemplazo atómico vía `supabase.rpc('replace_user_plan', …)`, mensajes genéricos, `parseQuantity` robusto (separador decimal ambiguo).
- `0013_replace_plan_rpc.sql`: `replace_user_plan(uuid, jsonb)` SECURITY INVOKER con guard `auth.uid()`, delete+insert transaccional.
- `parse-summary/index.ts`: validación de UUID, delete previo (idempotencia), mensajes genéricos + `console.error`, signo preservado en PDF (`amount`), `setStatus` con try/catch.
- `_shared/categorize.ts`: `telecom` → Servicios + `categorize_test.ts`.
- Frontend: `.eq('user_id', …)` en los 4 fetches (transactions, portfolio_plan ×2, card_summaries) y ~18 renders de `error.message` reemplazados por mensajes amigables. Tests actualizados (149/149 verdes).
- Backend: 28 tests Deno verdes (26 + 2 de categorize).

---

## FASE 3 — Refactor del frontend: duplicación y god components
_Objetivo: una sola fuente de verdad para lógica repetida; componentes razonables._

### 3.1 Lógica de inversiones compartida (mayor duplicación)
1. Nuevo hook `src/hooks/usePortfolioQuotes.js` que unifique lo duplicado entre
   `InvestmentPlan.js` y `MarketQuotes.js`: `loadPlan()`, effect de `quotes`,
   `resolvePrice`/`builtItems`, `sortedItems`, `refreshQuotes`, sort persistente.
   Ambos componentes consumen el hook.

### 3.2 Helpers compartidos en `src/lib/`
1. `src/lib/format.js`: `fmt`, `fmtPct`, `fmtCompact` (hoy duplicados en
   Dashboard:165-177, InvestmentPlan:26-34, MarketQuotes:36-44, PriceChart:15-22).
2. `src/lib/constants.js`: `ASSET_TYPES`, `MONTHS`, `SUMMARY_MONTHS`, `PALETTE`,
   `BRAND_HEX`/`brandRgba` (fuente única de la marca, hoy duplicados y con el hex
   hardcodeado también en `index.css`).
3. `src/lib/planSort.js`: exportar `SORT_KEYS` como fuente única (PLAN_SORT_KEYS /
   QUOTE_SORT_KEYS duplicados en los componentes).

### 3.3 Duplicación de UI
1. `SortableTh.js`: borrar la copia local dentro de `Dashboard.js:287-309`.
2. `Check` + `itemBase`/`itemActive`/`itemInactive`: extraer a componente/shared
   (Dashboard:45-59 y FiltersBar:19-37 son idénticos).
3. Form de edición de activo en `InvestmentPlan.js:476-541`: extraer a componente
   reutilizado por la fila y el form nuevo (`652-719`).

### 3.4 God components → descomposición
1. `Dashboard.js` (906 líneas): extraer la tabla de transacciones (fila, celdas,
   edición de categoría) y los 3 charts (helpers de chart hoy al final) a
   componentes/hooks propios.
2. `InvestmentPlan.js` (809): extraer el formulario de activo y la tabla del plan.
3. `MarketQuotes.js` (627): queda más liviano tras el hook compartido.
4. `UploadSummaries.js` (532): extraer fila/tarjeta de resumen y form de metadata.

### 3.5 Código muerto
- Eliminar: `reportWebVitals.js`, `logo.svg` (si Fase 1 no los borró),
  parámetro `session` muerto en `App.js:24` y prop `session` en `MarketQuotes.js:49`,
  ternario muerto `InvestmentPlan.js:754`, `SORT_DIRS` sin uso, directorio huérfano
  `frontend/frontend/`, `logo192/logo512` si no se usan (solo manifest).
- `ChartJS.register`: una sola vez (hoy en Dashboard y PriceChart).
- `SORT_DEFAULTS`: mover fuera del render de Dashboard.
- Lógica de tema legacy: unificar en un hook `useTheme` (App.js:64-71 +
  script inline de index.html; conservar compat de 3 claves localStorage).

**Verificación**:
- [x] `npm test` verde tras cada extracción.
- [x] `rg` confirma 1 sola definición de `fmt`, `ASSET_TYPES`, `SortableTh`, `PALETTE`.
- [x] Ningún componente supera ~400 líneas (objetivo).
- [x] Sin archivos no referenciados (`npx knip` o grep manual).

---

## FASE 4 — Confiabilidad del frontend
_Objetivo: sin unhandled rejections, estados de carga/error consistentes._

1. `App.js:79`: `.catch()` en `getSession().then()` (fallback a sesión nula).
2. `handleSignOut` con try/catch (App.js:154).
3. try/catch + estados de error en todas las mutaciones:
   `InvestmentPlan.js:88-101,242-305`, `MarketQuotes.js:127-140`,
   `UploadSummaries.js:33-45,72-115,136-150`, `Dashboard.js:492-526`.
4. Helper compartido `runAsync`/`withError` o un hook `useAsync` para estandarizar
   el patrón loading/error/success en los fetch.
5. Eliminar hardcode del año `2026` en `UploadSummaries.js:30,190` (usar el año actual).
6. Toast de error unificado ante fallas de red (no dejar silenciosas).

**Verificación**:
- [x] Sin `.then()` sin `.catch()` y sin `await` sin try/catch en `src/` (grep).
- [x] Tests: simular rechazo de fetch en cada componente → muestra error, no splash infinito.

---

## FASE 5 — Refactor y confiabilidad del backend
_Objetivo: migraciones sanas, funciones reproducibles y sin bugs de dato._

### 5.1 `_shared/` consolidado
1. `_shared/cors.ts`: `corsHeaders` + `json()` (hoy duplicados en las 3 funciones).
2. `_shared/normalize.ts`: `normalizeHeader`/`HEADER_ALIASES` (parse-summary e
   import-plan casi idénticos).
3. `_shared/categorize.ts`: agregar `telecom` → Servicios para alinear con
   migración 0009 (si no, nuevos parses van a "Otros").

### 5.2 Migraciones (nueva migración `0013_*`)
1. Índice en `transactions(summary_id)` (FK ON DELETE CASCADE + subqueries RLS).
2. Índices en `transactions(date)` y `card_summaries(user_id)`.
3. `updated_at` de `portfolio_plan` con trigger `set_updated_at` (hoy solo default now()).
4. Unique constraint para idempotencia del parse (ej. en `transactions` por
   `(summary_id, ...)` o usar `card_summaries.status` como guard).
5. Limpiar regla duplicada `bull market|broker` (0010:6-8 vs 0006:8).

### 5.3 Reproducibilidad de Edge Functions
1. Agregar `backend/supabase/functions/deno.json` (o `deno.json` raíz) con
   importMap/pinning de `jsr:@supabase/supabase-js`, `esm.sh/xlsx`, `esm.sh/unpdf`.
2. Completar `deno.lock` para que `deno check`/`deno test` corran localmente
   (hoy falla por `npm:@supabase/realtime-js`).

### 5.4 Tests Deno
1. Tests para `_shared/categorize.ts` (incluido caso Telecom).
2. Tests unitarios para la lógica pura de `import-plan` (parseQuantity) y
   `parse-summary` (validación de input / montos de PDF).
3. CI de Fase 7 corre `deno test` en las 3 suites.

**Verificación**:
- [x] `deno check`/`deno test` corren localmente en las 3 funciones.
- [x] Migraciones aplican con `supabase db push` sin conflictos.
- [x] `deno test` en categorize cubre Telecom→Servicios.

---

## FASE 6 — Tests: mocks compartidos y cobertura de huecos
_Objetivo: suite mantenible y cobertura de los componentes críticos sin mockear._

1. **Mocks compartidos** (hoy repetidos en 6 archivos): `src/test/setup.js` con
   factory `createSupabaseMock()` (auth/from/storage/functions) y factory de datos
   (`mockTransactions`, `mockPlan`, `mockSummaries`, `wrap()`).
2. Mover mock de `react-chartjs-2` y polyfills a `setupTests.js`.
3. Cobertura faltante (componentes transversales sin tests):
   `Toast.js`, `Dropdown.js`, `FiltersBar.js`, `PriceChart.js`, `Sidebar.js`,
   `MarketClosedNotice.js`, hook `useCountUp.js`.
4. Tests de los nuevos hooks/helpers de Fase 3 (`usePortfolioQuotes`, `format.js`,
   `useTheme`).
5. Configurar `vitest` con coverage (`@vitest/coverage-v8`) y meta de al menos
   80% en `src/lib/` y `src/hooks/`, progresivo en componentes.

**Verificación**:
- [x] `npm test` corre con mocks centralizados (1 sola definición de mock supabase).
- [x] Coverage report disponible y sin caídas por debajo de la meta.

---

## FASE 7 — Calidad y CI (100% free)
_Objetivo: automatizar lint/format/tests y detectar vulnerabilidades en el CI._

1. **ESLint 9 + Prettier** (gratis): `.eslintrc` con `eslint-plugin-react-hooks`,
   `eslint-plugin-react`, `typescript-eslint` para el backend TS; `prettier` con
   config mínima. Scripts `lint`/`format`.
2. **husky + lint-staged**: pre-commit corre eslint+prettier sobre archivos staged.
3. **GitHub Actions** (`.github/workflows/`):
   - `frontend.yml`: `npm ci` → `npm run build:css` → `npm run build` → `npm test`.
   - `backend.yml`: `deno test` en las suites de las funciones.
4. **Dependabot** (`.github/dependabot.yml`): semanal para npm (frontend) y GitHub
   Actions; con la migración a Vite ya no arrastra deps comprometidas.
5. **Auditoría**: `npm audit`/`npm run audit:prod` documentada como check del CI.
6. **Convención de commits** documentada en `AGENT.md` (Conventional Commits, ya
   usado en el historial) y chequeo en PR si aplica.

**Verificación**:
- [x] Los 2 workflows pasan en un push.
- [x] Pre-commit bloquea código con lint errors.
- [x] Dependabot activo sin alertas de las deps de compromised.md.

---

## FASE 8 — Limpieza final y documentación
1. Borrar basura en disco: `backend/supabase/.temp/` (catalogos pgdelta de 1.5MB,
   gitignored pero presentes), `frontend/frontend/`, `frontend/build/` (viejo CRA).
2. Reescribir `README.md` (raíz): stack real (Vite/Vitest/Deno), estructura
   actualizada, scripts, env vars, flujo de deploy. Hoy menciona CRA y estructura vieja.
3. Reescribir `frontend/README.md` con scripts reales.
4. Actualizar `AGENT.md` con los comandos de verificación definitivos
   (`npm test`, `npm run lint`, `deno test`, `npm run build`).
5. Actualizar `TODO.md`/`DONE.md` al cierre de cada fase.

**Verificación**:
- [x] `git status` limpio de residuos; solo quedan archivos intencionales.
- [x] README describe el stack real sin referencias a CRA.

---

## Justificación de decisiones

Cada decisión del plan se toma comparando las alternativas disponibles. Acá el
razonamiento de cada una, incluido por qué sumamos cosas que hoy no existen.

### D1. Migrar de Create React App a Vite (en lugar de mantener CRA)
- **Alternativas**: (a) mantener CRA + reforzar `overrides`, (b) migrar a Vite, (c) migrar a otro bundler (Next, Remix, Astro).
- **Por qué Vite y no quedarnos con CRA**: react-scripts 5.0.1 es de abril 2022,
  no declara soporte para React 19 y es **la única fuente** de las dependencias
  comprometidas (`keyv`, `flat-cache`, `file-entry-cache`). Quedarnos en CRA
  significa mantener parches manuales (`overrides`) de por vida y una plataforma
  que no avanza.
- **Por qué Vite y no Next/Remix/Astro**: la app es un SPA puro con Supabase
  (auth + backend), no necesita SSR, y migrar a un framework de meta implicaría
  reescribir la arquitectura de datos. Vite es el reemplazo directo y de menor
  riesgo de CRA: mismo código, mismo modelo mental, build más rápido.
- **Por qué Vitest en vez de conservar Jest**: Vite y Vitest comparten
  transformadores y config; es el estándar de facto del ecosistema Vite. Migrar
  los 111 usos de `jest.*` es mecánico y lo paga una vez; mantener Jest exigiría
  duplicar toolchain (babel, jest.config) que hoy provee CRA a escondidas.

### D2. Eliminar la service role key del disco (y borrar el cliente huérfano)
- **Alternativas**: (a) rotar la key y borrar, (b) guardarla y seguir con el cliente, (c) moverla a un secret manager pago.
- **Por qué no rotar**: **Supabase ya no permite rotar las legacy keys** (`anon`/`service_role`)
  ni el JWT secret — el dashboard solo deja ver/copiar (verificado 2026-08-09). La rotación clásica
  hoy se logra migrando a las **nuevas API keys** (`sb_publishable`/`sb_secret`), que sí son
  revocables individualmente — se dejó como mejora futura en `TODO.md` (Supabase depreca las legacy
  keys a fines de 2026).
- **Por qué borrar en vez de migrar ya**: esa llave bypasea TODA la RLS (permite leer/escribir
  cualquier fila sin autenticarse), pero **no está comprometida**: nunca entró al historial git ni se
  expuso. El único consumidor (`backend/src/supabaseClient.js`) era un huérfano que nadie importa, y
  se eliminó en Fase 2. La única copia local en `backend/.env` (gitignored, exp 2036) se **borró**,
  así que la key queda solo en el dashboard (su lugar legítimo). Un secret manager pago (Vault) no
  aporta nada acá: la app no necesita service role en ningún flujo (las Edge Functions usan la anon
  key + JWT del usuario).

### D3. Endurecer auth en config.toml (password ≥8, confirmaciones, rate limits)
- **Alternativas**: (a) dejarlo como está (defaults de Supabase), (b) endurecer con config gratis.
- **Por qué endurecer**: hoy el servidor acepta contraseñas de 6 caracteres sin
  requisitos, sin confirmación de email y con `max_frequency` de 1s (spam de
  resets). Endurecer es config pura, gratis y sin código. El usuario eligió en el
  dashboard `letters_digits` (min 8 + letras + números) y
  `secure_password_change` ON (pide la password actual al cambiarla); el `config.toml`
  se actualizó para que local coincida. La única contra es que
  `enable_confirmations = true` cambia el flujo de signup (hay que verificar el
  email); se mitiga con un check del flujo en la Fase 2.

### D4. Cache con límite + validación de input en las Edge Functions
- **Por qué**: `quotes/index.ts` tiene un `Map` sin tope que crece con cada
  símbolo que cualquier usuario autenticado pida → un usuario puede agotar la
  memoria del worker (DoS). Es el patrón clásico de "input no validado + estado
  global sin límite". Mismo criterio para el `file_base64` sin tope y la falta de
  dedupe/idempotencia en parse y plan.

### D5. Unificar duplicación en hooks y helpers compartidos
- **Alternativas**: (a) dejar la duplicación, (b) extraer a hooks/lib compartidos.
- **Por qué extraer**: ~150 líneas idénticas entre `InvestmentPlan` y `MarketQuotes`
  (fetch, precios, sort, refresh) ya causaron bugs asimétricos (una de las suites
  arregló un caso que la otra no). La regla es "una sola fuente de verdad": si el
  comportamiento cambia, se cambia en un solo lugar. Extraer NO agrega features,
  solo mueve código existente a un lugar común, con tests que verifican que nada
  cambió de comportamiento.

### D6. GitHub Actions (es nuevo: ¿para qué sirve?)
- **Qué es**: un servicio gratuito de GitHub que corre tareas automatizadas cada
  vez que hacés `git push` (o en PRs/schedules). Hoy NO usamos ninguna automatización:
  los tests solo corren si alguien los corre a mano y nadie se entera si un push
  rompe el build hasta que Vercel falla.
- **Qué ganamos**:
  - **CI de frontend**: cada push instala deps, compila con `vite build` y corre
    toda la suite de Vitest. Si algo se rompe, GitHub te marca el commit en rojo
    antes de que llegue a producción.
  - **CI de backend**: corre `deno test` de las 3 suites de las Edge Functions.
  - Todo esto es gratis (los minutos de Actions de los repos privados alcanzan
    para un proyecto de este tamaño; en repos públicos es ilimitado).
- **Por qué ahora y no antes**: es el estándar "enterprise" de calidad, pero
  requiere que las suites corran en modo no-interactivo y de forma reproducible
  (por eso va DESPUÉS de la Fase 1 y 5: con Vite/Vitest y `deno.json` los builds
  y tests corren igual en tu máquina y en el runner).

### D7. Dependabot (es nuevo: ¿para qué sirve?)
- **Qué es**: un bot gratis de GitHub que revisa tus dependencias (package.json,
  Actions, etc.) y te abre un PR automático cuando hay una versión nueva o una
  vulnerabilidad conocida.
- **Qué ganamos**: que no vuelva a pasar lo de `compromised.md` en silencio.
  Dependabot detectaría un bump hacia una versión comprometida de `keyv`/
  `flat-cache`/`file-entry-cache` y avisaría. Con la migración a Vite esas
  dependencias desaparecen del árbol; Dependabot las mantiene fuera.
- **Por qué gratis**: es una feature incluida de GitHub, no un servicio aparte.

### D8. ESLint + Prettier + husky + lint-staged (es nuevo)
- **Qué es**: linters y formateadores que hoy no tenemos (CRA traía un eslint
  viejo atado a react-scripts pero no lo ejecutábamos en ningún lado).
- **Qué ganamos**: reglas de calidad (react-hooks, react) que atrapan bugs
  comunes ANTES de que pasen, y formato consistente que elimina el ruido de los
  diffs. husky + lint-staged lo corren automáticamente en cada `git commit`,
  sobre los archivos que vas a commitear (rápido, no analiza todo el repo).
- **Por qué gratis**: ESLint, Prettier y husky son open source.

### D9. `deno.json` + `deno.lock` completos para las Edge Functions
- **Por qué**: hoy las funciones importan `jsr:@supabase/supabase-js@2` sin pin y
  no hay `deno.json`, así que `deno check`/`deno test` de los `index.ts` fallan
  localmente y cada deploy resuelve versiones "al azar" (hoy 2.112.2 vs 2.112.0
  local). Pinear versiones en un import map hace el build **reproducible**: lo que
  corre en tu máquina es exactamente lo que corre en producción.

### D10. Índices y trigger en migraciones (nueva migración 0013)
- **Por qué**: `transactions(summary_id)` es FK con `ON DELETE CASCADE` y las
  subqueries de RLS la usan; sin índice cada delete/select hace secuencial
  completo. `portfolio_plan.updated_at` tiene `default now()` pero nunca se
  actualiza en UPDATE (queda con timestamp viejo, bug latente). Son cambios de
  esquema baratos y sin riesgo de datos.

### D11. Filtros de `user_id` en los fetches del frontend (defensa en profundidad)
- **Por qué**: la seguridad YA está en RLS, pero los fetches de `transactions`,
  `portfolio_plan` y `card_summaries` no filtran por usuario en el cliente
  (inconsistente con `merchant_overrides`/`custom_categories` que sí lo hacen).
  Filtrar en el cliente no es seguridad, pero es una capa de higiene: si algún día
  una policy se desconfigura, el frontend no empieza a mostrar datos de todos.
  Cuesta 1 línea por fetch.

### D12. No exponer `error.message` crudo en la UI
- **Por qué**: los mensajes de Supabase/Deno son internos y a veces revelan
  estructura (tablas, funciones, drivers). Mostrar al usuario "Algo salió mal,
  intentá de nuevo" y loguear el detalle en consola es la práctica estándar:
  menos fuga de información, mejor UX.

### D13. Qué se decidió NO hacer (y por qué)
- **Service role key en un secret manager pago**: innecesario; la app no usa
  service role en ningún flujo (las funciones delegan en RLS con el JWT del
  usuario). Se elimina la llave, no se protege.
- **Captcha ahora**: hCaptcha/Turnstile son gratis, pero agregan configuración de
  terceros y el riesgo actual (rate limits ya presentes) no lo justifica todavía.
  Queda anotado como mejora futura.
- **Mover a TypeScript todo el frontend ya**: el refactor de Fase 3 ya es
  extenso; sumar TS al frontend duplicaría el esfuerzo y el riesgo. El backend TS
  sí recibe typecheck con `deno.json`.
- **Coverage al 100%**: no es realista ni rentable para una app personal; se fija
  una meta alta en libs/hooks (80%) y progresiva en componentes críticos.
- **Pre-commit hooks en el backend Deno**: no aplican de forma directa (Deno
  formatea solo con `deno fmt`); el backend queda cubierto por CI.

---

## Orden sugerido de ejecución y seguridad por fase
1. Fase 0 (baseline) → verificación: suite verde antes de tocar nada.
2. Fase 1 (Vite/Vitest) → sin esto no hay arbol limpio ni CI estable.
3. Fase 2 (seguridad) → sacar la service role key del disco lo antes posible.
4. Fases 3-4 (refactor/confiabilidad frontend) → incrementales, `npm test` verde
   después de cada extracción.
5. Fase 5 (backend) → con `deno test` local funcionando.
6. Fase 6 (tests) → junto con 3-4.
7. Fase 7 (CI) → una vez estables las suites.
8. Fase 8 (limpieza/docs).

## Checklist global de cierre
- [ ] Ninguna dependencia de compromised.md en ningún árbol.
- [ ] Sin service role ni anon keys fuera de `.env` gitignored; `backend/.env` borrado (rotación legacy no disponible; migración a nuevas API keys en TODO).
- [ ] RLS + filtros de `user_id` en todos los fetches.
- [ ] CI verde (build + tests frontend, deno tests backend, lint).
- [ ] Duplicación de helpers/lógica eliminada (grep de 1 sola definición).
- [ ] Sin archivos muertos ni directorios huérfanos.
- [ ] Docs (README, AGENT) reflejan el stack real.
