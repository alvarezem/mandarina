# Mandarina

Aplicación personal para analizar el consumo de tarjetas de crédito. Subí tus resúmenes (CSV, XLSX o PDF) y obtené un dashboard con tus gastos, categorizado y con totales en pesos y dólares.

> El asistente IA del futuro se llama **Mandi**.

## Funcionalidades

- **Autenticación** — login/signup con email y contraseña (Supabase Auth). Cada usuario solo ve sus propios datos (RLS).
- **Subida de resúmenes** — acepta archivos PDF, CSV y XLSX. Se guardan en un bucket privado por usuario.
- **Procesamiento automático** — una Edge Function de Supabase parsea el archivo:
  - **CSV/XLSX**: auto-detección de separador y mapeo flexible de columnas (fecha, descripción, importe).
  - **PDF** (resúmenes BBVA Visa/Mastercard): extracción posicional con `unpdf`, lee las tablas de detalle y distingue la columna PESOS de DÓLARES.
  - Montos normalizados, fechas a ISO, soporte multi-moneda (ARS/USD).
- **Categorización** — los comercios se clasifican automáticamente por reglas (Compras, Suscripciones, Impuestos, Pagos, Transferencias, Servicios, Delivery, Inversiones, Ingresos).
- **Análisis de consumo** — por resumen se genera un JSON con totales, mayor gasto/ingreso, gasto por categoría y comercio, evolución diaria y balance acumulado.
- **Dashboard estilo Notion** — cards de métricas, gráficos (línea, doughnut, barras) con Chart.js y tabla de transacciones.
- **Inversiones** — plan de inversión (meta % vs actual, importar XLSX, precios live vía BYMA) y cotizaciones en vivo (MEP/CCL, asignación, histórico por activo).

## Stack

- **Frontend**: React 19 + Vite 8 + Vitest 4 (migrado desde CRA en `improvements.md` Fase 1). Tailwind v4, Chart.js + react-chartjs-2. Código en JS (JSX en `.js`).
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions en Deno/TS).
- **Parseo**: `@std/csv`, SheetJS (`xlsx`), `unpdf` (PDF posicional BBVA).
- **Despliegue**: frontend estático en Vercel (autodeploy desde rama `master` → `mandarina-fi.vercel.app`); sin dominio custom hoy.

## Estructura

```
frontend/
  index.html           # entry (raíz, no public/)
  vite.config.js       # Vite + Vitest (incluye plugin transform-jsx-in-js)
  public/              # favicon, logos, manifest, robots (Vite los copia a dist/)
  src/
    index.js           # entry
    App.js             # shell, auth, navegación
    components/        # Auth, Dashboard, UploadSummaries, InvestmentPlan,
                       #   MarketQuotes, Sidebar, Toast, Dropdown, Charts, Tour...
    lib/               # supabaseClient, plan, analysis, history, planSort,
                       #   sanitizeFileName (lógica pura con tests)
    hooks/             # useAsync, useCountUp, usePortfolioQuotes, useTheme
    test/              # setup.js: mock compartido de supabase + factories
    setupTests.js      # mock global de supabase + react-chartjs-2 + polyfills
    *.test.js          # tests Vitest junto al código
backend/
  supabase/
    migrations/        # SQL 0001..0014 (esquema + RLS + storage)
    functions/         # Edge Functions Deno: parse-summary, import-plan, quotes
    templates/         # emails con marca
    config.toml        # config local de Supabase
examples/              # muestras reales de usuario (gitignored)
```

## Comandos

```bash
# Frontend
cd frontend && npm install
npm start            # dev server :3000 (tailwind watch + vite)
npm test             # suite de tests (Vitest, un solo run)
npm run test:watch   # Vitest en modo watch
npm run coverage     # suite + report de coverage (meta ≥80% en src/lib y src/hooks)
npm run build        # build:css + build de producción (salida en dist/)
npm run lint         # ESLint estricto (flat config, 0 issues)
npm run format       # prettier --write

# Backend / Edge Functions
cd backend/supabase/functions
deno test            # suites de las 3 funciones
deno check <funcion>/index.ts
deno lint            # lint nativo de Deno
deno fmt --check .   # formato (config flat en deno.json)

# Supabase (desde backend/)
supabase link --project-ref qfjehqaeagskxjulzhgx
supabase db push
supabase functions deploy parse-summary|import-plan|quotes
```

> **Orden de deploy obligatorio**: `supabase db push` ANTES de `functions deploy`
> (sin la migración 0014, las funciones de parse devuelven error PGRST202).

## Configuración

- Variables de entorno del frontend: prefijo `VITE_` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) — ver `frontend/.env.example`. En producción se
  setean en el dashboard de Vercel.
- Backend: 100% Edge Functions + migraciones; no usa `.env` propio.

## Calidad / CI

- **Pre-commit** (husky + lint-staged): eslint + prettier por archivo staged del
  frontend, y `deno fmt --check` + `deno lint` si hay `.ts` del backend staged.
- **CI** (GitHub Actions): `frontend.yml` (lint+build+test+audit) y `backend.yml`
  (fmt+lint+test) sobre push/PR a master. Dependabot semanal (npm + Actions).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`…).

## Estado

Activo y en evolución. Ver `TODO.md` para el roadmap y `DONE.md` para el historial.
