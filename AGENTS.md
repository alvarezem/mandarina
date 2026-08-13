# Mandarina — Briefing de proyecto

App personal para analizar el consumo de tarjetas de crédito. Subís resúmenes
(CSV, XLSX, PDF) y obtenés un dashboard con gastos categorizados, plan de
inversión y cotizaciones en vivo.

## Stack

- **Frontend**: React 19 + Vite 8 + Vitest 4 (migrado desde CRA en `improvements.md` Fase 1). Chart.js + react-chartjs-2, Tailwind v4 (CLI genera `src/index.generated.css`, gitignored). Código en JS (JSX en `.js`); migrar a TypeScript quedó descartado por ahora (el backend sí es Deno/TS).
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions en Deno/TS).
- **Parseo**: `@std/csv`, SheetJS (`xlsx`), `unpdf` (PDF posicional BBVA).
- **Despliegue**: frontend estático en Vercel (autodeploy desde rama `master` → `mandarina-fi.vercel.app`); sin dominio custom hoy — Cloudflare solo sería opción futura si se compra `mandarina.app` (ver `TODO.md`).

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
    test/              # setup.js: mock compartido de supabase (createSupabaseMock)
                       #   + factories de datos (wrap, tx, summary, planItem)
    setupTests.js      # mock global de supabase + mock de react-chartjs-2 + polyfills
    *.test.js          # tests Vitest junto al código
backend/
  supabase/
    migrations/        # SQL 0001..0014 (esquema + RLS + storage)
    functions/         # Edge Functions Deno: parse-summary, import-plan, quotes
    templates/         # emails con marca (13 templates HTML)
    config.toml        # config local de Supabase
examples/              # muestras reales de usuario (GITIGNORED — no subir)
```

## Comandos

```bash
# Frontend
cd frontend && npm install
npm start            # dev server :3000 (tailwind watch + vite)
npm test             # suite de tests (Vitest, un solo run)
npm run test:watch   # Vitest en modo watch
npm run coverage     # suite + report de coverage (v8; meta ≥80% en src/lib y src/hooks)
npm run build        # build:css + build de producción (salida en dist/)
npm run lint         # ESLint estricto (flat config, 0 issues) — también corre en pre-commit
npm run format       # prettier --write sobre todo el repo del frontend

# Backend / Edge Functions
cd backend/supabase/functions
deno test            # suites: parse-summary/detection_test, quotes/byma_test, quotes/pool_test
deno check <funcion>/index.ts
deno lint            # nativo de Deno (verifica también en pre-commit)
deno fmt --check .   # nativo de Deno; config flat en deno.json (singleQuote + sin semicolons)

# Calidad / CI
# pre-commit (husky + lint-staged): eslint+prettier por archivo staged del frontend,
#   y deno fmt --check + deno lint si hay .ts del backend staged. Bloquea el commit.
# CI (GitHub Actions): frontend.yml (lint+build+test+audit) y backend.yml
#   (fmt+lint+test) sobre push/PR a master. Dependabot semanal (npm + GitHub Actions).

# Supabase (desde backend/)
supabase link --project-ref qfjehqaeagskxjulzhgx
supabase db push
supabase functions deploy parse-summary|import-plan|quotes
```

## Convención de commits

Conventional Commits (tipos `feat:`, `fix:`, `refactor:`, `style:`, `docs:`,
`chore:`, `test:`, `perf:`, `build:`, `ci:`) — el historial ya lo usa. Sin
chequeo automático (no hay commitlint); el pre-commit valida solo lint/format/tests.
Scope opcional (ej. `feat(frontend):`, `chore(backend):`). Un commit = un cambio
lógico; el baseline de formato y los refactors de lint van en commits separados.

## Índice de memoria

**Leer en este orden según la tarea:**
1. **`HANDOFF.md`** — estado de la última sesión: qué se hizo, qué sigue. **LEER PRIMERO SIEMPRE**.
2. **`TODO.md`** — roadmap y pendientes vivos.
3. **`DONE.md`** — historial de lo completado y decisiones de producto.
4. **`improvements.md`** — plan de saneamiento/refactor en 8 fases. **LEER ANTES de tocar toolchain, seguridad, o estructura.** Contiene la justificación de cada decisión (Vite, Vitest, rotación de service role, CI, etc.).
5. **`compromised.md`** — dependencias PROHIBIDAS por vulnerabilidades. Nunca instalar; verificar con `npm ls`/lockfile.
6. **`README.md`** — descripción general y stack.

## Reglas de conducta

1. **Pensar antes de codear.** No asumir. No ocultar confusión. Exponer tradeoffs. Si hay interpretaciones múltiples, presentarlas. Si algo no está claro, parar y preguntar.
2. **Simplicidad primero.** Código mínimo que resuelve el problema. Nada especulativo. Si 200 líneas pueden ser 50, reescribir.
3. **Cambios quirúrgicos.** Tocar solo lo necesario. No "mejorar" código adyacente. Si hay código muerto no relacionado, mencionarlo — no borrarlo sin permiso. Cada línea cambiada debe trazar a la petición del usuario.
4. **Ejecución por objetivos.** Transformar tareas en metas verificables. Para tareas multi-paso, declarar un plan breve con check de verificación por paso.

## Recordatorio de memoria (re-evaluar)

Cuando surjan procedimientos repetidos (ej. deploy, migraciones), sesiones
profundas, o necesidad de aislar dominios, evaluar implementar:
- **Skills** on-demand (`.opencode/skills/*/SKILL.md`) para procedimientos repetitivos.
- **Subagentes** de dominio (`.opencode/agent/*.md`): frontend, backend, reviewer.
- **DECISIONS.md** (ADR ligeros) para el log de decisiones técnicas.
