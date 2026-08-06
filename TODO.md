# TODO Mandarine

Lista viva del proyecto. Se actualiza en cada iteración. Lo completado se archiva en `DONE.md`.

## 🔄 En progreso

- _(vacío)_

## 📋 Pendiente (roadmap)

- **Área Inversiones (planear)** — la sección hoy es un placeholder. Idea base estilo **Bull Market**:
  - **Cotizaciones locales** (acciones `.BA`, CEDEARs, bonos, dólares CCL/MEP) vía **Edge Function proxy** en Supabase (evita CORS, esconde claves) → API gratuita con cobertura AR (candidato: Yahoo Finance; evaluar alternativas/límites de la free tier).
  - **Tabla de cotizaciones** con precio, variación diaria %, volumen y **watchlist** editable (persistida en DB o localStorage).
  - **Gráficos de cotización** (velas/área) con Chart.js y rangos 1D/1S/1M/3M/1A.
  - **Fase 2**: seguimiento de cartera — registrar compras/ventas y calcular rentabilidad vs. costo; alimentar a **Mandi** (asistente IA) para preguntas sobre el mercado/portfolio.
  - A definir mañana: fuente de datos concreta, alcance (solo cotizaciones vs. cartera), y persistencia.
- **Infra del rebrand (pasos; ejecutar en sesión con acceso)** — "fimplify" queda solo en fallbacks intencionales de localStorage; falta renombrar lo externo:
  1. **Cloudflare Registrar** (punto de arranque): comprar `mandarine.app` (~US$12-15/año, compra manual en navegador con pago) y configurar el DNS en Cloudflare.
  2. **Vercel**: en el proyecto `fimplify` (hoy sirve `fimplify.vercel.app`, sin dominios custom), agregar `mandarine.app` (+ `www.mandarine.app`) como dominio y fijarlo como producción; mantener `fimplify.vercel.app` como alias/redirect; luego renombrar el proyecto `fimplify` → `mandarine`.
  3. **GitHub**: `gh repo rename` → `alvarezem/mandarine` (añade/actualiza descripción) y actualizar el `remote` local.
  4. **Verificar**: `mandarine.app` sirve el bundle nuevo (grep de `main.*.js` y strings brand) y `fimplify.vercel.app` redirige a Mandarine.
- **Móvil (`<lg`)** — diferido hasta estabilizar escritorio. La navegación móvil actual (bottom nav con logo central + header con solo título) convive con el nuevo header desktop ([≡] + logo Mandarine están `hidden lg:flex`). Pendiente estilo YouTube mobile: el hamburguesa debería abrir un **drawer deslizante** con Costos/Inversiones/Resúmenes; decidir si reemplaza o convive con la bottom nav.
- **Evaluar D3** — si el dashboard necesita visualizaciones custom que Chart.js no cubra bien, migrar/escalar a D3 (anotado; por ahora Chart.js alcanza).
- **Asistente IA "Mandi"** — integrar un asistente que responda preguntas sobre el consumo usando el análisis de resúmenes.

## ⏸️ En hold (refactor / limpieza — posponer hasta estabilizar)

- 🔴 **IMPORTANTE — Mapeo de columnas/formatos (nuevos bancos)** — el parser heurístico de CSV/XLSX (`HEADER_ALIASES`, `findColumns`) y el posicional x,y del PDF (layout fijo BBVA) están afinados solo para las muestras actuales (MercadoPago CSV + BBVA Visa/Mastercard). Cuando se agreguen más bancos habrá que: ampliar aliases (cada banco usa otros nombres/orden, a veces varios montos: débito/crédito, PESOS/DÓLARES, saldo), elegir bien la columna de monto y **generalizar el parser de PDF** (auto-detectar columnas por cluster de coordenadas x o por header). En hold por decisión del usuario: por ahora no agrega más bancos.
- **Conversión PDF→Markdown (Microsoft MarkItDown)** — **EVALUADO → NO recomendado** para estos casos. Motivo: su conversión de PDF por defecto (`pdfminer.six`) pierde estructura/tablas y rinde mal en tablas multi-columna densas; los resúmenes de banco son justamente tablas posicionales con columnas PESOS/DÓLARES que el parser actual (`unpdf` + x,y) ya resuelve bien. Además descarta las coordenadas x,y (señal clave para separar columnas) y es Python (no corre en Deno; REST = dependencia externa, latencia y enviar data financiera a un tercero). El camino correcto es el de arriba: generalizar el parser posicional, no convertir a Markdown.
- `frontend/src/logo.svg` — imagen sin uso (la UI actual no la renderiza).
- `frontend/src/reportWebVitals.js` + llamada en `index.js` — no requerido.
- `frontend/src/index.css` — ahora es el entry de Tailwind (imports + `@theme` con tokens de color/animación + keyframes) y `body` base.
- `parse-summary` — el archivo concentra parseo + categorías + análisis; modularizar cuando la feature-set se estabilice.
