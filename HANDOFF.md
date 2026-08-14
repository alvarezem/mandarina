# HANDOFF — Estado de la sesión

Documento de traspaso entre sesiones. El agente lo **lee al inicio** de cada
sesión y lo **actualiza al cerrar** (o al terminar una tarea grande). Resumen
corto y accionable; el detalle vive en TODO/DONE/improvements.

## Última sesión

- **Fecha**: 2026-08-14
- **Qué se hizo** — **Implementación completa de la watchlist + arreglo del CI de GitHub + fix del header desktop** (detalle en `DONE.md`):
  1. **Watchlist HECHA**: migración `0015_watchlist.sql` (tabla `public.watchlist`, RLS own, espejo de `0007`) **aplicada en prod** (`supabase db push`, previa `supabase link` — el dir no estaba linkeado). Frontend: `lib/watchlist.js` (`normalizeSymbol`/`validateSymbol`), `hooks/useWatchQuotes.js` (`{ symbols }` → `{ quotes, rates, refreshQuotes, quotesError }`, sin `buildPlan`), `components/Watchlist.js` (alta con ticker + etiqueta opcional, baja con confirmación inline, precio + change% ▲▼, sigue el toggle ARS/USD vía `display`/`rateMode`) renderizado en el tab **Cotizaciones** de `InvestmentsView.js`. La edge `quotes` NO cambió. Suite **297/297** (+22), lint 0, coverage lib 96.4% / hooks 97.9%.
  2. **CI arreglado**: `npm audit fix` bumpó `nanoid` 3.3.17→**3.3.18** (transitiva de postcss/vite) → `npm audit` 0 vulnerabilidades; `actions/checkout@v4`/`actions/setup-node@v4` → **`@v7`** en `frontend.yml` (y `checkout@v7` en `backend.yml`). Commits de la sesión: `feat(backend)`, `feat(frontend)`, `fix(deps)+ci`, `docs` (a confirmar hashes tras el push).
  3. **Fix header desktop (regresión de QW-G)**: el grupo móvil del header (`App.js`) conservaba `flex-1` en `lg+` (su contenido es `lg:hidden` pero el contenedor no) → el branding (toggle del rail + logo + tagline) quedaba pegado a la derecha contra los botones de guía/tema en vez de alineado con el rail. **Fix**: `lg:hidden` en el grupo móvil + test estructural en `App.test.js`. Suite **298/298** (+1), lint 0.
- **Sesión anterior (2026-08-14, plan)**: elección de la cola (watchlist) + relevamiento del CI — ver historial. La decisión de **tabla DB `watchlist`** quedó confirmada e implementada (no re-litigar; ver Decisiones).
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

## ⚡ Próxima tarea — Ledger del Plan de inversión (Fase 2, item backend/deferido)

**Decisión tomada (2026-08-14)**: la watchlist quedó **HECHA** (tabla DB
`watchlist`, ver "Última sesión" y `DONE.md`). Próximo en orden de la cola
(`TODO.md` → "Backend / deferido"): **ledger de compras/ventas del Plan** —
registrar operaciones para sacar cantidades/costo y rentabilidad vs. costo, y
alimentar a **Mandi**. Plan inicial (a confirmar en la sesión):

1. **Backend — migración `0016_ledger.sql`** (a definir): tabla de operaciones
   (`symbol`, tipo compra/venta, cantidad, precio, fecha, comisiones?) con RLS
   own por `user_id`, espejo de `0007`/`0015`. Impacto en `portfolio_plan`:
   `quantity` pasaría a derivarse del ledger (o mantenerla y reconciliar).
2. **Frontend**: sección de operaciones en el Plan (alta/edición/baja),
   cálculo de costo promedio y rentabilidad (`lib/ledger.js` puro), visual de
   ganancia/pérdida. Alimentación futura a Mandi.
3. **Tests + docs + deploy**: `supabase db push` ANTES del push a `master`.

**Después del ledger** quedan, en orden (`TODO.md` → "Backend / deferido"):
**ONs/cauciones en la edge `quotes`**, y **migrar a las nuevas API keys de
Supabase** (`sb_publishable_`/`sb_secret_`) antes de fines 2026 (las legacy keys
ya no se pueden rotar).

## En progreso

- **Backend / diferido** — ver sección "⚡ Próxima tarea" arriba y `TODO.md`.
  **Orden de la cola (decisión del usuario 2026-08-13)**: 1) QW-C Ingresos → **HECHO**
  2) QW-D layout/toggle → **HECHO** 3) QW-E cards 4 simétricas → **HECHO**
  4) QW-F cambio de contraseña → **HECHO** 5) QW-G drawer móvil → **HECHO**
  6) QW-H fix botón duplicado + números → **HECHO**.
  **Todo lo de backend se anota al final de `TODO.md`**: watchlist → **HECHO**
  (tabla DB `watchlist`, 2026-08-14 — ver "Última sesión"), ledger (Plan Fase
  2, ver "⚡ Próxima tarea"), ONs/cauciones en la edge `quotes`, y migrar a las
  nuevas API keys de Supabase (`sb_publishable_`/`sb_secret_`) antes de fines
  2026.
- **Sin fases de saneamiento activas** — las 8 fases de `improvements.md` están
  cerradas.
- **Deploy**: orden obligatorio **`supabase db push` ANTES de `functions deploy parse-summary|import-plan`** (sin migrar, todo parse 500ea con PGRST202). Anotado también en el header de `0014_reliability.sql` y en el README raíz. La migración `0015_watchlist.sql` ya está aplicada en prod (y en local).

## Decisiones tomadas (a no re-litigar sin motivo)

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