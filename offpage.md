# Mandarina — Acciones off-page (GEO/AEO)

Guía de acciones **manuales** (no es código) que de verdad pueden mover la visibilidad
de Mandarina en los answer engines. El on-page ya está agotado (ver `TODO.md` y `DONE.md`):
llmaudit dio 22 → 16 → 15, el reporte pidió siempre las mismas páginas (ya publicadas) y los
3 providers coinciden en que el gap es **autoridad externa**: citas, reviews y listados en
otras páginas. Los modelos no recomiendan lo que solo aparece en un subdominio de Vercel.

> **Regla de oro**: re-correr llmaudit **recién 4-8 semanas después** de que los perfiles
> estén indexados. Antes solo da ruido. Y cuando los perfiles existan, avisar al agente
> para agregar `sameAs` al JSON-LD (`frontend/index.html`) — un cambio puntual que
> consolida la entidad "Mandarina" entre el sitio y los perfiles externos.

## Descripciones listas para copiar

Usar siempre el mismo nombre ("Mandarina", con `alternateName` "Mandarina Fi") y el mismo
link `https://mandarina-fi.vercel.app/` en todos los perfiles.

**Short (ES)** — campo "Description" de GitHub, tags, taglines:
> Analizá el consumo de tus tarjetas de crédito y planificá inversiones. Gratis y en español.

**Full (ES)** — AlternativeTo, directorios, listicles:
> Mandarina es una app gratuita de finanzas personales para Argentina. Subís los resúmenes de
> tus tarjetas de crédito (CSV, XLSX o PDF) y Mandarina los procesa: clasifica cada gasto por
> categoría y comercio, detecta tus ingresos recurrentes (por ejemplo el sueldo) y te muestra
> la evolución de tu consumo en el tiempo. Además incluye un plan de inversión con metas
> porcentuales, cotizaciones en vivo de BYMA (acciones, CEDEARs y bonos) con histórico de
> precios, y un registro de operaciones (ledger) con costo promedio y rentabilidad para saber
> cuánto ganaste o perdiste con cada posición. Es 100% gratuita, sin publicidad, y cada cuenta
> solo ve sus propios datos.

**Full (EN)** — Product Hunt (audiencia internacional):
> Mandarina is a free personal finance app for Argentina. Upload your credit card statements
> (CSV, XLSX or PDF) and Mandarina processes them: every expense is categorized by category and
> merchant, recurring income (like your salary) is detected, and spending trends are charted
> over time. It also includes an investment plan with percentage targets, live BYMA quotes
> (stocks, CEDEARs and bonds) with price history, and an operations ledger with average cost and
> profitability so you always know how much you gained or lost per position. 100% free, no ads,
> and each account only sees its own data.

**Tags sugeridos**: `finanzas personales`, `personal finance`, `tarjetas de crédito`,
`inversiones`, `argentina`, `byma`, `presupuesto`.

## Checklist accionable (gratis, en orden de impacto/tiempo)

### 1. Hacer público el repo de GitHub + README decente
- Hoy el repo `alvarezem/mandarina` es **privado**. Un repo público con README es una
  cita externa real (GitHub es una autoridad que los modelos indexan).
- **Verificación de seguridad HECHA (2026-08-15) — lista para publicar**:
  - `examples/` está gitignored y **nunca** fue trackeado (ni en historial).
  - Todos los `.env*` están gitignored; solo existen `.env.example` (plantillas vacías) en el
    repo; ningún `.env` real pasó por el historial.
  - No hay keys/secrets en código trackeado (solo nombres de variables y placeholders). El
    valor `sb_publishable_…` (pública por diseño) aparece 1 vez, en texto de docs, sin riesgo.
  - No hay archivos de datos personales (CSV/XLSX/PDF) en el repo.
- Pasos: `git remote -v` OK (→ `https://github.com/alvarezem/mandarina.git`) → GitHub repo
  Settings → "Change visibility" → Public → completar el **description** del repo con la
  **Short (ES)** de arriba + **topics** (los tags sugeridos) → escribir un README real (stack,
  captura, cómo funciona, link a `mandarina-fi.vercel.app`).
- Impacto: **alto-medio**. Cita de GitHub + posible mención en respuestas al buscar el repo.

### 2. AlternativeTo (listado de alternativas)
- `https://alternativeto.net/` — agregar Mandarina como alternativa (categoría finanzas
  personales / "Excel para finanzas personales"). Es gratis y se indexa rápido.
- Llenar: descripción, tags, link a `mandarina-fi.vercel.app`, screenshots.
- Impacto: **medio**. Es un sitio que los answer engines consultan para preguntas de
  "alternatives".

### 3. Product Hunt — launch
- `https://www.producthunt.com/` — un launch (post) gratis da una página indexada + posible
  mención. No requiere pagar; los upvotes ayudan pero no son determinantes para GEO.
- Hacerlo como "app de finanzas personales para Argentina".
- Impacto: **medio** (página + citas), pero el índice de PH puede tardar.

### 4. Directorios y listicles de finanzas en Argentina
- Buscar listados/directorios **gratis** que acepten apps locales: listicles de fintech/
  finanzas personales AR, sitios tipo "mejores apps de finanzas personales en Argentina".
- Muchos son de pago o por invitación → filtrar solo los que acepten gratis y sean legítimos.
- Impacto: **bajo-medio**, acumulativo.

### 5. Comunidades (con MUCHO cuidado con las reglas)
- Subreddits r/merval y r/FinanzasAR: la mayoría **prohíben o castigan el self-promo**.
  No spamear. Solo aportar valor (responder preguntas sobre análisis de gastos) y, cuando
  aplique, mencionar la app de pasada.
- Ídem en grupos de Telegram/WhatsApp de finanzas si participás.
- Impacto: **bajo pero real** si sale natural; un ban/veto es peor que no participar.

### 6. Google / Bing Places (condicional)
- Requiere un negocio con **dirección física** y verificación. Para una app personal sin
  domicilio comercial probablemente no aplica. Revisar si alguna vez se formaliza.

### 7. Consistencia de marca (sin costo)
- Mantener siempre el mismo nombre ("Mandarina"), el mismo link
  (`mandarina-fi.vercel.app`) y la misma descripción en todos los perfiles. El JSON-LD ya
  tiene `alternateName: "Mandarina Fi"` (el nombre que los modelos derivan del dominio) para
  consolidar ambas grafías.

## Después de crear los perfiles
1. Avisar al agente → agregar `sameAs` (URLs de GitHub, Product Hunt, AlternativeTo, etc.)
   al nodo `Organization` del JSON-LD en `frontend/index.html`.
2. Esperar **4-8 semanas** de indexación.
3. Re-correr llmaudit en el navegador y comparar. Si mejoró, repetir la medición una vez más
   para descartar ruido.

## Fuera de alcance (decisiones tomadas)
- **Dominio custom** (`mandarina.app` ~US$12-15/año): descartado (regla "100% gratis").
  Es el lever con mayor impacto potencial — los 3 providers lo mencionan — pero rompe la regla.
- **Contenido educativo** (guías de finanzas personales): EN HOLD (el usuario no está
  capacitado para crearlo con calidad).