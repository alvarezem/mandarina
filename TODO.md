# TODO Fimplify

Lista viva del proyecto. Se actualiza en cada iteración.

## ✅ Completado

- **Auth** — signup/login con email+password (`Auth.js`), detección de sesión en `App.js`.
- **Esquema DB** — `0001_init.sql`: `card_summaries`, `transactions`, `consumption_analyses` + RLS por dueño.
- **Storage + subida de archivos** — `0002_storage.sql`: bucket privado `card-resumes` + policies RLS por carpeta de usuario. Componente `UploadSummaries.js` (subida PDF/CSV/XLSX + listado + descarga).
- **Status de procesamiento** — `0003_parse_status.sql`: columnas `status` + `error` en `card_summaries`.
- **Edge Function `parse-summary`** — parseo CSV (con auto-detección de separador) y XLSX (SheetJS); normaliza fechas y montos.
- **Mapeo de columnas** — formato real del usuario (saldos + `RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE`), aliases y normalización de `_`→` `.
- **Análisis de consumo** — categorización por keywords (`transactions.category`), `buildAnalysis` → `result` JSONB (period, totals, maxExpense, maxCredit, byMerchant, byCategory, byDay, balanceTrend). `0004_analysis_unique.sql`: constraint única `consumption_analyses(summary_id)`.
- **Frontend análisis** — `AnalysisSummary.js` (créditos/débitos/neto, mayor gasto/ingreso). Verificación end-to-end con CSV real. _(superado por el dashboard, se eliminó)_
- **Dashboard visual** — UI estilo Notion con Chart.js (`chart.js` + `react-chartjs-2`): layout sidebar + panel principal, cards de métricas, línea `balanceTrend`, doughnut `byCategory`, barras `byMerchant`, tabla de transacciones. Restyling `index.css` + `App.css`.
- **Moneda por transacción** — `0005_currency.sql`: columna `currency` (ARS/USD) en `transactions`. `buildAnalysis` separa totales/agregados ARS y un bloque USD; dashboard muestra card "Gastos USD" + columna de moneda con formateo por moneda.
- **Parseo PDF (BBVA VISA + MASTERCARD)** — extracción posicional con `unpdf` (x,y), tablas de detalle `FECHA/DESCRIPCIÓN/PESOS/DÓLARES` por coordenadas, fechas `DD-MMM-YY`→ISO, montos negativos (gasto), categorías Impuestos/Pagos/Suscripciones. Verificado e2e: VISA ARS `-534.577,35` (7 movs), MASTERCARD ARS `-33.122,53` + USD `-17,61` (11 movs).
- **GitHub** — repo `alvarezem/fimplify` (privado) creado vía `gh` CLI; `.gitignore` raíz (ignora `examples/` con datos financieros reales); `README.md` del proyecto; commit `10334cc` y push de `master` a `origin`.

## 🔄 En progreso

- _(vacío)_

## 📋 Pendiente (roadmap)

- **Deploy Fase 1 (Vercel)** — frontend en producción en **https://fimplify.vercel.app** (`vercel` CLI, proyecto `fimplify`, env vars `REACT_APP_*` en Production). Fix: `loadSummaries` memoizada con `useCallback` para pasar el build con `CI=true`.
- **Deploy Fase 2 (Cloudflare DNS)** — **en pausa**: requiere dominio propio (cuenta Cloudflare ya disponible; registrar dominio o usar uno existente).
- **Pulido visual** — UI básica → rediseño completo con **TailwindCSS** (adoptado, sale del hold) vía **CLI** (`@tailwindcss/cli` → `src/index.generated.css`, sin CRACO; evita la detección flakey de fuentes del plugin PostCSS bajo webpack).
  - **1er pase**: Auth + Dashboard (cards, charts con theme, tabla).
  - **2do pase**: layout + sidebar + `UploadSummaries` + responsive — header sticky con blur, drawer móvil (`<lg`), drop zone de subida auto-subida, pills de status, `App.css` eliminado (todo Tailwind).
  - **Tema claro/oscuro**: toggle sol/luna (`ThemeToggle.js`) en header y pantalla Auth; dark mode por clase (`@custom-variant dark`), script anti-flash, persiste en `localStorage` y arranca siguiendo al sistema; Chart.js theme-aware vía prop.
- **Mapeo de columnas** — afinar con más muestras reales de banco si aparecen. _(movido a En hold 🔴 IMPORTANTE)_
- **Vista global por períodos (multi-resumen) + filtros** — ✅ implementado. El dashboard computa todo client-side desde las transacciones del usuario (`lib/analysis.js`, port de `buildAnalysis`), con **"Todos los resúmenes"** como selección por defecto (drill-down a un resumen individual). **Filtros**: período (chips + rango custom; default "Todo", auto "últimos 12 meses" si la data abarca más de un año), categorías (multi-chips), moneda (Ambas/ARS/USD, afecta solo tabla+gráficos), búsqueda de comercio; columna "Resumen" (archivo) en la tabla global. El backend no cambió; `consumption_analyses` sigue en DB pero el dashboard ya no la lee.
- **Evaluar D3** — si el dashboard necesita visualizaciones custom que Chart.js no cubra bien, migrar/escalar a D3 (anotado; por ahora Chart.js alcanza).

## ⏸️ En hold (refactor / limpieza — posponer hasta estabilizar)

- 🔴 **IMPORTANTE — Mapeo de columnas/formatos (nuevos bancos)** — el parser heurístico de CSV/XLSX (`HEADER_ALIASES`, `findColumns`) y el posicional x,y del PDF (layout fijo BBVA) están afinados solo para las muestras actuales (MercadoPago CSV + BBVA Visa/Mastercard). Cuando se agreguen más bancos habrá que: ampliar aliases (cada banco usa otros nombres/orden, a veces varios montos: débito/crédito, PESOS/DÓLARES, saldo), elegir bien la columna de monto y **generalizar el parser de PDF** (auto-detectar columnas por cluster de coordenadas x o por header). En hold por decisión del usuario: por ahora no agrega más bancos.
- **Conversión PDF→Markdown (Microsoft MarkItDown)** — **EVALUADO → NO recomendado** para estos casos. Motivo: su conversión de PDF por defecto (`pdfminer.six`) pierde estructura/tablas y rinde mal en tablas multi-columna densas; los resúmenes de banco son justamente tablas posicionales con columnas PESOS/DÓLARES que el parser actual (`unpdf` + x,y) ya resuelve bien. Además descarta las coordenadas x,y (señal clave para separar columnas) y es Python (no corre en Deno; REST = dependencia externa, latencia y enviar data financiera a un tercero). El camino correcto es el de arriba: generalizar el parser posicional, no convertir a Markdown.
- `frontend/src/App.test.js` — boilerplate de CRA sin uso.
- `frontend/src/logo.svg` — imagen sin uso (la UI actual no la renderiza).
- `frontend/src/reportWebVitals.js` + llamada en `index.js` — no requerido.
- `frontend/src/index.css` — ahora es el entry de Tailwind (imports + tokens); solo contiene `body` base.
- `backend/package.json` — verificar si `@supabase/server` se usa; si no, quitar.
- `parse-summary` — el archivo concentra parseo + categorías + análisis; modularizar cuando la feature-set se estabilice.