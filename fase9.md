# fase9.md — Plan de ejecución: i18n Fase 2 (dashboard completo ES/EN)

Plan de la Fase 2 del item "Agregar idioma inglés a la página (con selector de
idioma)". La Fase 1 (landing + Auth, ~70 claves) ya está en producción; esta
fase cubre el **dashboard post-login**: ~37 componentes, ~280-300 claves nuevas
al dict de `lib/i18n.js`.

> Las decisiones de producto (selector ES|EN, detección de navegador,
> persistencia en localStorage) se cerraron en la Fase 1 — ver `DONE.md`.

## Decisiones cerradas en planning (2026-08-15)

1. **Propagación del idioma — React Context.** Nuevo `LangProvider` + hook
   `useLang()` (en `frontend/src/`). Migra la Fase 1 (`Landing`/`Auth`/
   `LangToggle`, que usan prop `lang`) al context en el mismo refactor. Los
   componentes del dashboard leen `useLang()`, sin tocar firmas de props.
2. **Toggle en el dashboard — sí.** El `LangToggle` se agrega al header (junto
   al `ThemeToggle`), visible con sesión.
3. **Datos curados de la app — mapeo en render.** Las etiquetas que la app
   misma persiste en DB se traducen en pantalla vía dict de mapeo, dejando el
   valor crudo intacto:
   - 20 categorías predefinidas de `CATEGORY_OPTIONS` (Dashboard) + `Pagos`
     (`EXCLUDED_CATEGORIES` en `lib/analysis.js`).
   - 7 `ASSET_TYPES` (constantes → dict).
   - `side` del ledger (`compra`/`venta`/`ajuste`) — deja de mostrarse crudo en
     el badge de `LedgerView`.
   - tipo de resumen de `MetaForm` (`VISA`, `MASTERCARD`, `AMEX`, `Banco`,
     `Billetera virtual`, `Broker`, `Otro`).
   - **Los datos del usuario quedan crudos siempre**: comercios, descripciones
     de movimientos, categorías custom, tickers, nombres de archivo, `summary_type`.
4. **Formato de moneda/fechas.** `fmt` sigue eligiendo locale por moneda
   (ARS→es-AR, USD→en-US, no cambia). `fmtPct`, fechas, meses y
   `toLocaleString` pasan a usar el `lang` de la app. `MONTHS` de `constants.js`
   se reemplaza por `Intl.DateTimeFormat` con el lang.
5. **Pluralización.** Se agrega soporte de plural al dict de i18n (variantes
   one/other). Las frases más complejas (bloque de pagos de `Dashboard.js`) se
   reescriben sin dependencia de género.
6. **Ejecución por sub-fases** — 4 pasos, cada uno con suite verde + lint 0 +
   build OK + commit propio (frontend-only; sin `db push`).

## Sub-fase 1 — Base e infraestructura **(HECHA — commit `3cb6e60`)**

- `lib/i18n.js`: agregar pluralización (variantes `_one`/`_other` o similar) y
  helpers de mapeo de datos (categorías, `ASSET_TYPES`, `side`, tipos de resumen).
- `components/LangProvider.js` (nuevo): contexto + `useLang()`; `App.js`
  envuelve el árbol; `Landing`/`Auth`/`LangToggle` migran de props a context.
- **Gap de la Fase 1**: `NewPasswordScreen` toma el lang del context y
  `STRENGTH_LABEL` de `lib/password.js` → dict `auth.strength`.
- **Formato**: `fmtPct` (format.js) → lang; `lib/history.js` (`formatPointDate`),
  `PriceChart.js` (tooltip) y `SummaryCards.js` (`movimientos`) → lang;
  `MONTHS` de `constants.js` → `Intl.DateTimeFormat`.
- `components/Dropdown.js`: placeholder `Buscar categoría…` pasa a prop.
- Hooks: toasts de `usePortfolioQuotes`/`useWatchQuotes` (duplicados) → claves
  i18n; fallback `'Ocurrió un error'` de `useAsync` → dict.

## Sub-fase 2 — Módulo Resúmenes/Gastos **(HECHA — commit `6679c6a`)**

`ResumenesView`, `Dashboard` (incluye el bloque de pagos reescrito con plural),
`FiltersBar`, `SummaryCards`, `SpendingCharts`, `IncomeSources`,
`TransactionsTable`, `SummaryItem`, `SummaryDetailModal`, `UploadSummaries`.
Más el dict de categorías (con `Pagos`/`EXCLUDED_CATEGORIES` en conjunto).

## Sub-fase 3 — Módulo Inversiones **(HECHA — commit `9de2904`)**

`InvestmentsView`, `InvestmentPlan`, `MarketQuotes`, `QuotesTable`, `PlanTable`,
`AssetForm`, `DistributionPanel`, `PriceChart`, `MarketClosedNotice`,
`QuotesErrorNotice`, `Watchlist`, `LedgerView`, `RegisterOperationModal`,
`QuoteModal`. Más los dicts de `ASSET_TYPES` y `side`.

Notas de la sub-fase: claves con prefijo `inv.*`; `AssetForm` conserva el import
de `ASSET_TYPES` (solo para los keys del select); el badge de `side` en el ledger
usa `sideLabel` (capitalizado `Compra`/`Venta`/`Ajuste` → se ajustaron 2
aserciones en `LedgerView.test.js`); el toast de éxito del modal de operaciones
interpola el `side` crudo para no romper aserciones.

## Sub-fase 4 — Shell y cierre

`App.js` (VIEW_TITLES, toasts de saludo, aria/titles), `Sidebar`,
`MobileDrawer`, `OnboardingTour`, `ThemeToggle`, `MetaForm` (tipo de resumen).
`LangToggle` en el header. Tests EN puntuales en los componentes grandes
(patrón `Landing.test.js`). Verificación final + docs (TODO/DONE/HANDOFF) +
deploy (autodeploy Vercel, frontend-only, sin `db push`).

## Verificación por sub-fase

```bash
cd frontend
npm test        # suite completa (~350 tests, +13 por componente traducido)
npm run lint    # ESLint estricto, 0 issues
npm run build   # build:css + build de producción
```

## Cierre

Al terminar: marcar el item en `TODO.md`, entrada completa en `DONE.md` y
resumen en `HANDOFF.md`. Deploy automático por push a `master` (Vercel).