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

- **Deploy Fase 1 (Vercel)** — frontend en producción en **https://fimplify.vercel.app** (`vercel` CLI, proyecto `fimplify`, env vars `REACT_APP_*` en Production). Fix: `loadSummaries` memoizada con `useCallback` para pasar el build con `CI=true`. Resta **Fase 2: DNS Cloudflare con dominio propio**.
- **Mapeo de columnas** — afinar con más muestras reales de banco si aparecen.
- **Evaluar D3** — si el dashboard necesita visualizaciones custom que Chart.js no cubra bien, migrar/escalar a D3 (anotado; por ahora Chart.js alcanza).

## ⏸️ En hold (refactor / limpieza — posponer hasta estabilizar)

- **CSS framework** — evaluar TailwindCSS (u otro utility-first) para reemplazar el CSS plano; decidir al terminar el proyecto, en conjunto con el refactor.
- **Conversión PDF→Markdown (Microsoft MarkItDown)** — evaluar `markitdown` para convertir el PDF a Markdown antes de parsear y comparar si simplifica el parser posicional actual de `unpdf`. Nota: es Python (librería/CLI o REST API `api.markitdown.ai` con key), no corre nativo en Deno — evaluar vía REST o como herramienta de desarrollo, no en la edge function.
- `frontend/src/App.test.js` — boilerplate de CRA sin uso.
- `frontend/src/logo.svg` — imagen sin uso (la UI actual no la renderiza).
- `frontend/src/reportWebVitals.js` + llamada en `index.js` — no requerido.
- `frontend/src/index.css` y partes de `App.css` — estilos CRA residuales (repasar junto con el rediseño del dashboard).
- `backend/package.json` — verificar si `@supabase/server` se usa; si no, quitar.
- `parse-summary` — el archivo concentra parseo + categorías + análisis; modularizar cuando la feature-set se estabilice.