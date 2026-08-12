# FASE 7 — Calidad y CI

_Objetivo: automatizar lint/format/tests y detectar vulnerabilidades en el CI. Plan de ejecución de `improvements.md` Fase 7, con decisiones tomadas el 2026-08-11._

## Decisiones (tomadas con el usuario)

1. **Backend**: lint con `deno lint` + `deno fmt` (nativos de Deno, cero toolchain Node, respetan imports `jsr:`/`esm.sh`). **No** se usa `typescript-eslint` (descartado: exigiría node_modules/tsconfig dentro del proyecto Deno).
2. **ESLint**: **estricto desde el día 1** — se habilitan las reglas recomendadas y se pagan todos los errores/warnings históricos del codebase (se escribió sin lint).
3. **Prettier / deno fmt**: **baseline completo** sobre todo el repo en un commit separado, para que el pre-commit no genere diffs ruidosos. **deno fmt iguala el estilo del frontend**: en `functions/deno.json` se configuró `"fmt": { "singleQuote": true, "semiColons": false }` (formato "flat", el `options` anidado quedó deprecado en Deno 2.9) — el baseline cambia solo wrapping/indent/EOF, sin churn de comillas. El frontend ya pasaba `prettier --check` (baseline no hizo falta).
4. **Convención de commits**: solo se documenta en `AGENTS.md` (el historial ya usa Conventional Commits). Sin commitlint.

> Nota vs improvements.md: ESLint 9 usa **flat config** (`eslint.config.js`), no `.eslintrc` (el plan original estaba escrito para ESLint 8).

## 7.1 Frontend — ESLint estricto + Prettier

- DevDeps a instalar en `frontend/package.json`: `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `prettier`.
- `frontend/eslint.config.js` (flat config):
  - `files: ['**/*.{js,jsx}']` + ignores (`dist/`, `node_modules/`, `src/index.generated.css`).
  - `ecmaFeatures: { jsx: true }` (JSX vive en `.js`), `sourceType: 'module'`, globals de browser.
  - Reglas: `@eslint/js` recommended + `eslint-plugin-react` recommended + `react-hooks` (`rules-of-hooks`, `exhaustive-deps`).
  - `react/react-in-jsx-scope: off` (runtime automatic, ver `vite.config.js`).
  - Tests (`*.test.js`): globals de Vitest en un bloque por patrón.
- Correr `npm run lint` y **arreglar todo** lo que salga.
- `.prettierrc.json` mínimo + `.prettierignore`; `prettier --write .` como commit de baseline.

## 7.2 Backend — deno lint + deno fmt

- Config en `backend/supabase/functions/deno.json`: inclusión de lint/fmt para funciones + tests `./backend/supabase/functions`.
- Correr `deno lint` y `deno fmt` y arreglar lo que salga (baseline también acá).

## 7.3 husky + lint-staged (pre-commit)

- `frontend/package.json`: `scripts.prepare = "husky"`, devDep `husky` + `lint-staged`.
- `.husky/pre-commit`:
  - `*.{js,jsx}` → `eslint --fix` + `prettier --write`.
  - `backend/**/*.ts` → `deno fmt --check` + `deno lint`.
- El commit del hook falla si hay errores (bloquea el pre-commit).

## 7.4 GitHub Actions (`.github/workflows/`)

- `frontend.yml` (push + PR sobre master): `npm ci` → `npm run lint` → `npm run build` → `npm test` → `npm audit --audit-level=high`.
- `backend.yml` (push + PR): setup-deno → `deno fmt --check` → `deno lint` → `deno test` (en `backend/supabase/functions`).
- Sin secrets ni deploy: Vercel autodeploya desde master; el CI solo valida.

## 7.5 Dependabot (`.github/dependabot.yml`)

- Ecossistemas: `npm` → `/frontend` y `github-actions` → `/`, interval semanal.

## 7.6 Convención de commits

- Documentar Conventional Commits en `AGENTS.md` (tipos `feat:`/`fix:`/`refactor:`/`docs:`/`chore:`…). Sin chequeo automático.

## 7.7 Cierre y verificación

- `improvements.md`: marcar verificación de Fase 7, corregir `.eslintrc`→flat config.
- `AGENTS.md`: comandos operativos (`npm run lint`, `deno lint`, `deno fmt`).
- `HANDOFF.md` / `DONE.md`: cerrar la fase.
- Orden de commits: (1) configs + fix de lint, (2) baseline prettier/deno fmt, (3) husky + workflows + dependabot, (4) docs.

**Verificación final**:
- [x] `npm run lint` sin errores (325 issues históricos → 0).
- [x] `deno lint` limpio en las funciones (20 errores → 0).
- [x] `deno fmt --check` limpio (baseline aplicado en `b0416d0`).
- [x] `npm test` 183/183 y `deno test` 64/64.
- [x] Los 2 workflows pasan en un push (verificado 2026-08-12; el backend necesitó un re-run por un "socket hang up" transitorio de `setup-deno` al bajar Deno de GitHub releases).
- [x] Pre-commit bloquea código con lint errors (husky + lint-staged).
- [x] Dependabot activo sin alertas de las deps de compromised.md (abrió PRs de bump el mismo día; `npm audit` en 0).