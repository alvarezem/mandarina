# Mandarine

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

## Stack

- **Frontend**: React (Create React App), Chart.js + react-chartjs-2.
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions en Deno).
- **Parseo**: `@std/csv`, SheetJS (`xlsx`), `unpdf`.
- **Despliegue**: frontend estático (Vercel) + DNS Cloudflare (pendiente).

## Estructura

```
backend/
  supabase/
    migrations/          # Esquema SQL (0001..0005)
    functions/           # Edge Functions (parse-summary)
  package.json           # Scripts/CLI (cliente Supabase con service role)
frontend/
  src/
    components/          # Auth, UploadSummaries, Dashboard
    lib/supabaseClient.js
examples/                # Muestras reales de usuario (ignoradas por git)
TODO.md                  # Roadmap y pendientes
DONE.md                  # Historial de lo completado
```

## Desarrollo

```bash
# Base de datos / migraciones
cd backend
supabase link --project-ref <ref>
supabase db push

# Edge Function
supabase functions deploy parse-summary

# Frontend
cd frontend
npm install
npm start
```

Configurá `frontend/.env` y `backend/.env` según los `.env.example`.

## Estado

Activo y en evolución. Ver `TODO.md` para el roadmap y tareas pendientes.
