# Mandarina

Analizá el consumo de tus tarjetas de crédito y planificá inversiones. Gratis y en español.

[Ver app](https://mandarina-fi.vercel.app/) · [Roadmap](TODO.md) · [Historial](DONE.md)

## What is Mandarina?

Mandarina is a free, privacy-first personal finance app for Argentina. Upload your credit card statements and it turns them into a clear dashboard: categorized spending, recurring income, an investment plan with live BYMA quotes, and an operations ledger that shows how much you actually gained or lost per position.

## Qué es Mandarina

Mandarina es una app gratuita de finanzas personales para Argentina. Subís los resúmenes de tus tarjetas de crédito (CSV, XLSX o PDF) y Mandarina los procesa: clasifica cada gasto por categoría y comercio, detecta tus ingresos recurrentes (por ejemplo el sueldo) y te muestra la evolución de tu consumo en el tiempo. Además incluye un plan de inversión con metas porcentuales, cotizaciones en vivo de BYMA (acciones, CEDEARs y bonos) con histórico de precios, y un registro de operaciones (ledger) con costo promedio y rentabilidad para saber cuánto ganaste o perdiste con cada posición. Es 100% gratuita, sin publicidad, y cada cuenta solo ve sus propios datos.

## Funcionalidades

- **Subida de resúmenes** — acepta **PDF** (extracción posicional de resúmenes BBVA con `unpdf`), **CSV** y **XLSX** (auto-detección de separador y mapeo flexible de columnas). Soporte multi-moneda ARS/USD.
- **Categorización automática** — los comercios se clasifican por reglas: Compras, Suscripciones, Impuestos, Pagos, Transferencias, Servicios, Delivery, Inversiones, Ingresos.
- **Dashboard de consumo** — totales en pesos y dólares, evolución diaria, gasto por categoría y comercio, y detección de ingresos recurrentes.
- **Plan de inversión** — metas porcentuales, importación de XLSX y presupuesto con precios live.
- **Cotizaciones en vivo** — BYMA (acciones, CEDEARs, bonos), MEP/CCL, histórico por activo y watchlist.
- **Ledger de operaciones** — compras/ventas/ajustes con costo promedio, comisiones $ o %, y rentabilidad por posición.

## Privacidad y costo

- **100% gratis**, sin publicidad ni planes pagos.
- Cada cuenta solo ve sus propios datos (Row Level Security en PostgreSQL; archivos en un bucket privado por usuario).
- Autenticación con email y contraseña (Supabase Auth).

## Captura

<!-- Agregar acá una screenshot del dashboard (ej. dashboard.png). -->

## Stack

- **Frontend**: React 19 + Vite 8 + Vitest 4, Tailwind v4, Chart.js + react-chartjs-2. JS con JSX en `.js`.
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions en Deno/TS).
- **Parseo**: `@std/csv`, SheetJS (`xlsx`), `unpdf` (PDF posicional BBVA).
- **Despliegue**: frontend estático en Vercel, autodeploy desde `master` → `mandarina-fi.vercel.app`.

## Development

```bash
# Frontend
cd frontend && npm install
npm start            # dev server :3000 (tailwind watch + vite)
npm test             # suite de tests (Vitest, un solo run)
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

### Configuración

- Variables de entorno del frontend: prefijo `VITE_` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) — ver `frontend/.env.example`. En producción se
  setean en el dashboard de Vercel.
- Backend: 100% Edge Functions + migraciones; no usa `.env` propio.

### Calidad / CI

- **Pre-commit** (husky + lint-staged): eslint + prettier por archivo staged del
  frontend, y `deno fmt --check` + `deno lint` si hay `.ts` del backend staged.
- **CI** (GitHub Actions): `frontend.yml` (lint+build+test+audit) y `backend.yml`
  (fmt+lint+test) sobre push/PR a master. Dependabot semanal (npm + Actions).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`…).

## Roadmap

Activo y en evolución. Ver `TODO.md` para el roadmap y `DONE.md` para el historial.
El asistente IA del futuro se llama **Mandi**.