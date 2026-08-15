# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-15
- **Qué se hizo** — **Fix móvil del módulo Operaciones + ONs/cauciones EN HOLD** (detalle en `DONE.md`):
  1. **Fix móvil**: el panel de resumen del ledger (`LedgerView.js:207`) forzaba `grid-cols-3` → en `<640px` los montos (`$1.234.567,89` + badge `▲x%`) desbordaban sus recuadros. **Fix 1 línea**: `grid grid-cols-1 gap-3 sm:grid-cols-3` (apila en móvil, 3 cols en `sm+`). Suite **333/333** + lint 0 + build OK. Frontend-only (sin `db push`). Commits `96db305`.
  2. **ONs/cauciones → EN HOLD** (decisión del usuario: "no agreguemos cosas para mostrar datos vacíos"). Verificado: de los 5 tickers (`PN360, TLCTO, TTC90, VSCRO, YM340`) solo **TLCTO/VSCRO** resuelven en BYMA Open Data (`settlementType:'2'`, la edge los parsea sin cambios); **PN360/TTC90/YM340 no existen** en el feed gratis (cotización st 1/2/3/6/7 y histórico → vacíos) y las cauciones con símbolos estándar (`A7D`, `A30D`, `60D`…) tampoco. Reactivar cuando el usuario confirme tickers que BYMA free publique. Ver `TODO.md`.
- **Qué se hizo (sesión previa, 2026-08-14)** — **Migración a las nuevas API keys de Supabase (publishable) HECHO** (detalle en `DONE.md`):
  1. **Dashboard**: creada la publishable `default` (`sb_publishable_…`) en Settings → API Keys. La **secret** (`sb_secret_…`) **no se usa** en el proyecto (las Edge Functions autentican con el JWT del usuario, nunca `service_role`) — queda guardada en el dashboard.
  2. **Frontend**: `frontend/.env` con `VITE_SUPABASE_ANON_KEY` = valor publishable (mismo nombre de var, nuevo valor; `VITE_SUPABASE_URL` intacto). **Vercel actualizado** vía CLI (Production + Preview, `vercel env rm` + `vercel env add`).
  3. **Backend**: nuevo `_shared/supabase.ts` (`createUserClient`) — lee la publishable de `SUPABASE_PUBLISHABLE_KEYS` (JSON auto-inyectado por la plataforma, key `default`, **sin fallback a la legacy**); `parse-summary`/`import-plan`/`quotes` pasan a usarlo. **Deploy de las 3 functions** (`supabase functions deploy`, sin migración DB → sin `db push`).
  4. **Verificado**: deno test 64/64 + check/fmt/lint OK; `vercel --prod` → bundle con `sb_publishable_…` y **sin** el JWT anon legacy; edge responde `Unauthorized`/`No autenticado` sin JWT válido. **Pendiente del usuario**: desactivar las legacy keys (`anon`/`service_role`) en Settings → API Keys (reversible) tras confirmar la app en uso.
- **Qué se hizo** — **Ledger: registro en pop-up + BYMA siempre visible HECHO** (feedback de testing; detalle en `DONE.md`):
  1. **`RegisterOperationModal.js` (nuevo)**: alta de operaciones en un **modal** (patrón `SummaryDetailModal`: portal a body, cierre por X/Esc/backdrop) con grilla Tipo·Ticker·Fecha·Cantidad / Precio+BYMA·Comisión+$|%, **Nota como textarea grande** y **Registrar abajo de todo**; resetea por `key` (remount al abrir). **BYMA siempre visible con fetch on click** (sin debounce de `draftSymbol`; elimina ese efecto y `quoteForDraft` → menos llamadas a la edge). `LedgerView.js` sin form inline: header con botón "Registrar operación", cards, tablas y listado intactos; el estado vacío también abre el modal. Feedback posterior (mismo día): el modal creció a **`max-w-3xl`/`p-6`**, la **Nota ahora ocupa todo el ancho** (`col-span-2 sm:col-span-4`, `rows={4}`) y el botón **Registrar pasó a ser normal abajo a la derecha** (footer con hint a la izquierda; ya no es `w-full`). Suite **333/333** (+3), lint 0, coverage lib 96.5% / hooks 97.9%, build OK. Frontend-only (sin `db push`).
- **Qué se hizo (sesión previa)** — **Ledger: comisión $/% + nota visible + obligatorios marcados HECHO** (feedback de testing del ledger; detalle en `DONE.md`):
  1. **Backend**: migración `0017_ledger_commission_pct.sql` (`add column commission_is_pct boolean not null default false`) **aplicada en prod** (`supabase db push`). Sin cambios en las Edge Functions.
  2. **Frontend**: `lib/ledger.js` nuevo `commissionAmount(op)` (% → `qty×price×%/100`, fijo → monto) usado en `costBasis`; `LedgerView.js` con toggle **$ | %** de comisión (insert manda `commission_is_pct`), celda de comisión muestra `X%`, **columna "Nota"** (truncada + tooltip, "—" sin nota), `required` + `Ticker *`/`Cantidad *` + hint "Campos con * obligatorios · Precio en $ · Comisión en $ o %". Suite **330/330** (+6), lint 0, coverage lib 96.5% / hooks 97.9%.
- **Qué se hizo (sesión previa)** — **Ledger de operaciones del Plan HECHO** (tab "Operaciones"; detalle en `DONE.md`):
  1. **Backend**: migración `0016_ledger.sql` (tabla `public.ledger_operations` con RLS own, `side` check compra/venta/ajuste, trigger `set_updated_at`) **aplicada en prod** (`supabase db push`, previo `supabase link` ya existía de la sesión de la watchlist). Independiente de `portfolio_plan` (decisión: no derivar `quantity`; el plan intacto). Frontend: `lib/ledger.js` (`ledgerQuantity`/`costBasis` promedio móvil con comisiones/`profitability`/`summarize`), `components/LedgerView.js` (form de alta compra/venta/ajuste con botón **BYMA** que precarga el precio live — debounce 400ms del ticker del form para no spamear la edge, panel Invertido/Valor/Ganancia-Pérdida, tabla por símbolo con rentabilidad ▲▼, tabla de operaciones con subtotal y baja con confirmación, toggle ARS/USD + CCL/MEP compartidos) renderizado en el tab **Operaciones** de `InvestmentsView.js`, y `applyBuy` (presupuesto) ahora **también inserta la compra en el ledger**. Suite **324/324** (+26), lint 0, coverage lib 96.5% / hooks 97.9%, build prod OK.
  2. **Docs**: `TODO.md` (ledger → HECHO; quedan ONs/cauciones y API keys), `DONE.md` (entrada completa), `HANDOFF.md` (esta sesión).
- **Sesión anterior (2026-08-14)**: watchlist HECHO + CI arreglado + fix header desktop — ver historial y `DONE.md`.
- **Sesión anterior (2026-08-13, noche)** — **QW-E..QW-H** (detalle en `DONE.md`): cards de resumen 4 simétricas (USD `0`/`—`), pantalla de nueva contraseña (flujo recovery), drawer móvil en reemplazo de la bottom nav, y fix de botón de cerrar sesión duplicado + números que caben en las cards (header logout `hidden lg:inline-flex`, grilla `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`). Commits `8923868`..`af8380d`. Suite **275/275**, lint 0, coverage lib 96.3% / hooks 99.1%.
- **Sesión anterior (2026-08-13)** — **QW-D: pulido de layout y toggle de filtros** (detalle en `DONE.md`):
  1. **`SpendingCharts.js`** — `lg:col-span-2` en la tarjeta de la barra ("Top
     orígenes de ingresos" / "Top comercios con mayor gasto") → full-width en
     ambos modos; desaparece el hueco de la celda derecha del grid.
  2. **`Dashboard.js`** — helper `toggleMerchant(merchant)` (si el `query` ya es
     ese merchant case-insensitive → `''`, si no → merchant) usado en `onBar`
     (gráfico) y en `onSelect` de `IncomeSources` → primer click filtra, segundo
     click restaura (igual que el doughnut con `focusCategory`).
  3. Suite **263/263** (+1) + lint limpio + coverage lib 96.0% / hooks 99.1%.
     Además: polyfill `Element.prototype.scrollIntoView` en `setupTests.js`
     (jsdom no lo implementa → errores no capturados al clickear orígenes).
  - **Sesión anterior (2026-08-13, tarde)**: QW-C Ingresos — `buildIncomeSources`
    en `lib/analysis.js` (subtotales + recurrencia ≥2 meses vía
    `card_summaries.period_month` con fallback a `tx.date`) + componente
    `IncomeSources.js` ("Acreditaciones por origen", badge "Recurrente", click
    filtra) — ver `DONE.md`.
  - **Sesión anterior (2026-08-13, mañana)**: fix visual del modal de resumen en
    2 rondas (portal a `document.body` + backdrop `fixed` y scroll en wrapper
    propio, aplicado también a `QuoteModal`) — ver `DONE.md`.
- **Quick wins 2 (2026-08-13)**: detalle por modo (filtro por signo), modal de
  detalle de resumen, toggle de pagos persistido — ver `DONE.md`.
- **Sesión anterior (2026-08-12)** — quick wins de análisis: vista de Ingresos
  separada (`buildIncomeAnalysis`, `ResumenesView`, `Dashboard` con `mode`), nav a
  2 items, fix `fmtUSD` (13 tests en rojo), copy de pagos excluidos, toast de top
  3 con segmentos. Suite quedó en 238/238.
- **Fase anterior**: **FASE 8 CERRADA** (ver `improvements.md` + `fase8.md`):
  1. **Limpieza de disco**: borrados `backend/supabase/.temp/` (catálogos pgdelta),
     `frontend/coverage/` (salida de coverage) y `backend/supabase/snippets/`
     (dir vacío). `frontend/frontend/`/`frontend/build/` ya no existían.
  2. **`.opencode/` fuera del repo**: `opencode.json` destraqueado
     (`git rm --cached`, queda en disco) e ignorado en `.gitignore` raíz; la
     memoria (AGENTS.md + HANDOFF.md) sigue auto-cargándose local. Nota en
     `AGENTS.md` (Recordatorio de memoria).
  3. **README raíz reescrito**: stack real (Vite/Vitest/Deno/Tailwind), estructura
     actual, comandos completos, env vars, orden de deploy (db push antes que
     functions). Cero referencias a CRA/Cloudflare. `frontend/README.md` sumó
     `coverage`/`lint`/`format` y reformuló la nota del plugin.
  4. **`.md` obsoletos borrados** (decisión del usuario): `fase7.md`,
     `compromised.md` y `AGENTS_TEAM.md`. Referencias ajustadas: `AGENTS.md`
     (índice de memoria), `HANDOFF.md:31`, `frontend/eslint.config.js:39`,
     `improvements.md` (FASE 8 + checklist global).
  5. **Cierre de docs**: `improvements.md` (FASE 8 con checks `[x]`, checklist
     global completo), `TODO.md` (quitados items muertos `logo.svg`/
     `reportWebVitals.js` y el de `.opencode`), `DONE.md`, `HANDOFF.md`.
- **Fase 6 y 7** (cerradas, anteriores): ver `improvements.md` secciones FASE 6/7
  y Decisiones abajo.

## ⏸️ En hold — ONs/cauciones en la edge `quotes` (Backend / diferido)

**Decisión tomada (2026-08-15)**: el item **ONs/cauciones** pasó a **EN HOLD** por
decisión del usuario ("no agreguemos cosas para mostrar datos vacíos"). Contexto
verificado: BYMA Open Data **sí** devuelve ONs con `settlementType:'2'` (de los 5
tickers del usuario, **TLCTO/VSCRO** resuelven y la edge `quotes` los parsea sin
cambios — `trade`/`previousClosingPrice`/`denominationCcy:"ARS"`), pero
**PN360/TTC90/YM340 no existen** en el feed gratis (ni cotización con st 1/2/3/6/7
ni histórico → `empty`/`no_data`) y las cauciones con símbolos estándar (`A7D`,
`A30D`, `60D`, `0A1D`…) tampoco → ampliar `ASSET_TYPES` con ON/Caución hoy solo
mostraría datos vacíos. **Reactivar cuando el usuario confirme tickers que BYMA
free publique** (o si se suma otra fuente de precios). Detalle en `TODO.md`
(item ⏸️) y `DONE.md`.

**Después** queda (`TODO.md` → "Backend / deferido"): más adelante **Mandi**
(asistente IA; lee `ledger_operations`). La desactivación de las legacy keys
(`anon`/`service_role`) ya **la hizo el usuario** (2026-08-15) → item cerrado.

## En progreso

- **Backend / diferido** — ver sección "⏸️ En hold — ONs/cauciones" arriba y `TODO.md`.
  **Orden de la cola (decisión del usuario 2026-08-13)**: 1) QW-C Ingresos → **HECHO**
  2) QW-D layout/toggle → **HECHO** 3) QW-E cards 4 simétricas → **HECHO**
  4) QW-F cambio de contraseña → **HECHO** 5) QW-G drawer móvil → **HECHO**
  6) QW-H fix botón duplicado + números → **HECHO**.
  **Todo lo de backend se anota al final de `TODO.md`**: watchlist → **HECHO**
  (tabla DB `watchlist`, 2026-08-14), ledger → **HECHO** (tabla DB
  `ledger_operations`, 2026-08-14 — ver "Última sesión"), **API keys de
  Supabase → HECHO (2026-08-14, publishable; ver "Última sesión")**, y
  ONs/cauciones en la edge `quotes` (ver "⏸️ En hold — ONs/cauciones").
- **Sin fases de saneamiento activas** — las 8 fases de `improvements.md` están
  cerradas.
- **Deploy**: orden obligatorio **`supabase db push` ANTES de `functions deploy parse-summary|import-plan`** (sin migrar, todo parse 500ea con PGRST202). Anotado también en el header de `0014_reliability.sql` y en el README raíz. La migración `0015_watchlist.sql` **y la `0016_ledger.sql`** ya están aplicadas en prod (y en local).

## Decisiones tomadas (a no re-litigar sin motivo)

- **Ledger — tab independiente, NO derivar `quantity` del plan (2026-08-14)**: reframe del usuario ("el plan es una cosa, las ganancias que hiciste otra") → el ledger vive en su **propio tab "Operaciones"** y es **independiente de `portfolio_plan`** (se descartó derivar `quantity`; el plan y sus 3 vías de escritura — import-plan, edición manual, `applyBuy` — quedan intactos). Tipos de operación: **compra/venta/ajuste** (el ajuste cubre la posición inicial). Costo: **promedio móvil** con comisiones (ventas no alteran el costo por unidad). Costo inicial: **precio BYMA actual** vía botón **BYMA** en el form (prefill con la cotización live; el ticker del form se suma a `useWatchQuotes` con debounce de 400ms para que funcione con símbolos nuevos sin spamear la edge). `applyBuy` del presupuesto **también registra la compra** en el ledger (`price = amount/qty`, best-effort tras el update del plan). **IMPLEMENTADO** (migración `0016` + `LedgerView.js`, 2026-08-14). Feedback de testing (mismo día): la comisión se expresa como **% o monto fijo** (`commission_is_pct`, toggle `$|%` en el form), la nota opcional **se muestra como columna** (truncada con tooltip) y los obligatorios se marcan con `required` + asterisco (migración `0017`, 2026-08-14). Feedback posterior (2026-08-14): el alta pasó a un **pop-up** (`RegisterOperationModal`, form inline eliminado — la página queda solo con datos) y el **botón BYMA es siempre visible con fetch on click** (se descartó el debounce de `draftSymbol`).
- **Watchlist — persistencia en DB (2026-08-14)**: se eligió una tabla
  **`watchlist` en PostgreSQL** (patrón `portfolio_plan`, RLS own por
  `user_id`) y NO localStorage. Racional: es dato del usuario (sincronizable
  entre dispositivos, disponible para features futuras como Mandi/ledger), no
  una preferencia de UI; localStorage queda reservado para preferencias (ej.
  `planSort`). UI: **sección dedicada** en el tab Cotizaciones, sin acoplar a
  `QuotesTable` ni al Plan. **IMPLEMENTADA** (migración `0015` + `Watchlist.js`,
  2026-08-14).
- **Fase 7 — TypeScript en frontend**: considerado y **descartado por ahora** (misma postura que AGENTS.md). Con 183 tests + JS de lint limpio, el tipo no aporta valor proporcional al costo (renombrar 56 archivos `.js`→`.tsx`, migrar el plugin `transform-jsx-in-js`, tipar toda la UI). El backend ya es TS; la frontend habla con Supabase REST (sin tipos compartibles con las Edge Functions). Revisitar cuando el scope crezca o aparezca un bug de tipos. (Detalle completo en respuesta a la sesión 2026-08-11.)
- **Fase 7 — imports bare en `deno.json`**: el import map pasó de claves inline (`jsr:@std/csv`, `https://esm.sh/xlsx@0.18.5`) a **claves bare** (`@std/csv`, `xlsx`); los archivos importan con names cortos y el pinning vive solo en `deno.json` + `deno.lock`. Patrón Deno moderno.
- **Fase 7 — husky en subdirectorio**: husky 9 exige `.git` en el cwd literal, y el repo raíz no tiene package.json (es frontend-only). El script `prepare: "cd .. && husky frontend/.husky"` inicializa el hooksPath `frontend/.husky/_` desde la raíz. Si algún día el repo gana un package.json raíz, mudar husky ahí es la variante estándar de monorepo.
- **Fase 7 — `"type": "module"` en el frontend**: agregado al package.json para eliminar el warning `MODULE_TYPELESS_PACKAGE_JSON` que eslint emitía en el hook de pre-commit. Stack ya 100% ESM (verificado sin `require`/`module.exports` en fuentes ni configs).
- **Fase 5 — guard de status de `finalize_parse`**: eliminado. El delete+insert atómico (con lock de fila) ya es idempotente; el guard `v_status <> 'parsing'` solo agregaba un camino de éxito-silencioso `{ok:true,count:0}`. Un re-proceso (futuro botón de la UI) reescribe el resultado correcto.
- **Fase 5 — regla duplicada `bull market|broker` (0010 vs 0006)**: se deja sin tocar a propósito — es un UPDATE idempotente ya aplicado en prod; editar historial de migraciones aplicadas rinde menos que el ruido que quita.
- **Migración a Vite**: revertida una vez por decisión del usuario (la sesión se
  cayó a mitad); se volvió a encarar vía `improvements.md`. **HECHA en Fase 1**.
- **`instructions.md`**: borrado a propósito (spec original superada por
  TODO/DONE/README; sigue en historial git). No restaurar.
- **Memoria opencode**: por ahora solo capas 1+2 (AGENTS.md + HANDOFF.md).
  Re-evaluar skills/subagentes/DECISIONS.md cuando surja la necesidad.
- **Compromised deps** (`keyv`, `flat-cache`, `file-entry-cache`): eliminadas del
  árbol al migrar a Vite (eran transitivas de react-scripts). Ya no hay `overrides`.
- **Vercel**: el `vercel.json` (framework vite, output dist) está en el repo, pero
  las settings del dashboard se actualizaron explícitamente con `vercel project update`.
  Env vars en el dashboard: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (las `REACT_APP_*` se eliminaron).
- **JSX en `.js`**: Vite 8 con oxc no lo soporta por config; se usa el plugin
  `transform-jsx-in-js` en `vite.config.js` (discusión Vite #21505). Si en el
  futuro se refactoriza a `.jsx`, se elimina el plugin.
- **localStorage en tests**: mock in-memory en `setupTests.js` (Node 26 expone un
  global experimental undefined).
- **Fase 4**: los mensajes de error de fetch son **amigables y estables** (el try/catch
  interno de cada load re-lanza el mensaje estable tanto ante `error` de Supabase como
  ante rechazo de red). No se expone `e.message` crudo del backend en la UI.