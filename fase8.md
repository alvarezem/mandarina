# FASE 8 — Limpieza final y documentación

_Objetivo: dejar el repo sin residuos (archivos y `.md` obsoletos) y con la
documentación reflejando el stack real. Plan de ejecución de `improvements.md`
Fase 8, ampliado con decisiones tomadas con el usuario el 2026-08-12._

## Decisiones (tomadas con el usuario)

1. **`.opencode/` sale del repo**: `git rm --cached .opencode/opencode.json` +
   ignore. La memoria (AGENTS.md + HANDOFF.md) sigue auto-cargándose localmente
   (el archivo queda en disco); quien clone el repo ya no la recibe. Se
   documenta cómo recrearla. No se reescribe historial.
2. **Solo se planifica**: el único entregable de esta sesión es `fase8.md`; la
   ejecución se hace en una sesión posterior siguiendo este plan.
3. **Se borran los `.md` que ya no sirven** (decisión del usuario): `fase7.md` y
   `compromised.md`, y se evalúa `AGENTS_TEAM.md`. Justificación:
   - `fase7.md`: plan de ejecución de una fase ya cerrada; las decisiones viven
     en `improvements.md` (sección FASE 7 + justificaciones D) y en `HANDOFF.md`.
   - `compromised.md`: lista de versiones de un evento de supply-chain histórico;
     el árbol está limpio (verificado en Fases 1 y 7) y hoy la protección la dan
     `npm audit` + Dependabot. La lista de versiones puntuales dejó de ser
     accionable.
   - `AGENTS_TEAM.md`: blueprint de subagentes sin agentes activos todavía (solo
     lo referencia `DONE.md`). **Decisión pendiente al ejecutar**: borrarlo o
     conservarlo como blueprint para el ítem "subagentes" de AGENTS.md.
4. **Ajuste a `improvements.md` Fase 8**: `frontend/frontend/` y `frontend/build/`
   ya no existen; los residuos reales son `backend/supabase/.temp/`,
   `frontend/coverage/` y `backend/supabase/snippets/`.

## 8.1 Limpieza de disco

- Borrar `backend/supabase/.temp/` (5.6MB, catálogos pgdelta; gitignored vía
  `backend/supabase/.gitignore`).
- Borrar `frontend/coverage/` (salida gitignored de `npm run coverage`).
- Borrar `backend/supabase/snippets/` (dir vacío, no versionado).
- Verificar `git status --short` → solo archivos intencionales.
- Nota: `npm run coverage` regenera `coverage/`; es normal (ya gitignored).

## 8.2 README.md (raíz) — reescribir de cero

- **Stack real**: React 19 + Vite 8 + Vitest 4 + Tailwind v4 (CLI →
  `src/index.generated.css`, gitignored) + Chart.js/react-chartjs-2; Supabase
  (Auth, PostgreSQL, Storage, Edge Functions Deno/TS); parseo `@std/csv`,
  `xlsx` (SheetJS), `unpdf` (PDF posicional BBVA).
- **Estructura real** (mismo tree de AGENTS.md): `frontend/`, `backend/supabase/`
  con `migrations/` 0001..0014, `functions/` (parse-summary, import-plan, quotes),
  `config.toml`, `templates/`; `examples/` gitignored.
- **Comandos completos**: `npm start|test|test:watch|coverage|lint|format|build`;
  `deno test|check|lint|fmt --check`; `supabase db push` + `functions deploy`
  manteniendo el orden (**db push ANTES de deploy** — ver HANDOFF).
- **Env vars**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  (ver `frontend/.env.example` y dashboard de Vercel).
- **Deploy**: Vercel autodeploy desde `master` → `mandarina-fi.vercel.app`; sin
  dominio custom hoy (Cloudflare solo si se compra `mandarina.app` — ver TODO).
- **Cero referencias** a CRA / react-scripts / DNS Cloudflare.

## 8.3 frontend/README.md

- Sumar a Scripts: `npm run coverage` (reporte + thresholds ≥80 en lib/hooks),
  `npm run lint`, `npm run format`.
- Reformular "estilo CRA" en la nota del plugin → "JSX en `.js` (oxc de Vite 8
  lo excluye por defecto; ver discusión Vite #21505)".

## 8.4 AGENTS.md — memoria

- Quitar el ítem 5 del índice de memoria (`compromised.md`, se borra).
- Verificar el ítem 1 (apuntadores) y los comandos (al día desde Fase 7).
- Nota de `.opencode` no versionado + cómo recrear la memoria en un clon.

## 8.5 Sacar `.opencode` del repo

- `git rm --cached .opencode/opencode.json` (queda en disco) + ignore en
  `.gitignore` raíz (mantener los ignores internos de node_modules/package*.json).
- Documentar en AGENTS.md: la memoria se auto-carga local; un clon no la incluye.

## 8.6 Borrar `.md` obsoletos y ajustar referencias

- Borrar `fase7.md` y `compromised.md`. Referencias a ajustar:
  - `HANDOFF.md:31` — quitar "ver `fase7.md`"; apuntar a `improvements.md` FASE 7.
  - `frontend/eslint.config.js:39` — el comentario "ver fase7.md" pasa a
    referenciar `improvements.md` (o se quita).
  - `AGENTS.md:89` — quitar ítem 5 del índice de memoria.
  - `AGENTS_TEAM.md:38` — quitar la mención a `compromised.md` (si el archivo se
    conserva).
  - `improvements.md:627` — reemplazar/eliminar el check "Ninguna dependencia de
    compromised.md" del checklist global de cierre.
  - `DONE.md` — las menciones históricas se conservan (registro de lo hecho);
    nota opcional "archivo borrado en Fase 8".
- `AGENTS_TEAM.md`: decidir al ejecutar entre borrarlo o conservarlo (ver
  Decisión 3).

## 8.7 Cierre de docs

- `improvements.md`: marcar los 2 checks de Fase 8, ajustar ítem 1 (residuos
  reales) y el checklist global (línea 627).
- `fase8.md` (este archivo) + `HANDOFF.md` + `DONE.md`.
- `TODO.md`: quitar los items muertos (`logo.svg`, `reportWebVitals.js` — ya
  borrados en Fases 1/3) y el item `.opencode` (resuelto → DONE).

## Orden de commits

1. `chore:` limpieza de residuos en disco + sacar `.opencode` del repo
   (`git rm --cached` + `.gitignore`).
2. `docs:` README raíz reescrito + frontend/README actualizado + AGENTS.md
   (índice de memoria).
3. `docs:` cierre de fase — borrado de `fase7.md`/`compromised.md`
   (+ `AGENTS_TEAM.md` si se decide), ajuste de referencias, `fase8.md`,
   improvements/HANDOFF/DONE/TODO.

## Verificación final

- [ ] `git status --short` limpio (solo archivos intencionales).
- [ ] `rg -i "create react app|react-scripts|dns cloudflare" README.md
      frontend/README.md` → 0.
- [ ] `.opencode/opencode.json` no rastreado (`git ls-files` vacío para el path).
- [ ] `rg -n "fase7\.md|compromised\.md"` → 0 (o solo en `DONE.md` histórico).
- [ ] `npm run lint` y `npm test` green.
- [ ] `deno fmt --check` / `deno lint` sin regresiones (no se toca código backend).
