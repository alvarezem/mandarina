# TODO Fimplify

Lista viva del proyecto. Se actualiza en cada iteración. Lo completado se archiva en `DONE.md`.

## 🔄 En progreso

- _(vacío)_

## 📋 Pendiente (roadmap)

- **Deploy Fase 2 (Cloudflare DNS)** — **en pausa**: requiere dominio propio (cuenta Cloudflare ya disponible; registrar dominio o usar uno existente).
- **Evaluar D3** — si el dashboard necesita visualizaciones custom que Chart.js no cubra bien, migrar/escalar a D3 (anotado; por ahora Chart.js alcanza).

## ⏸️ En hold (refactor / limpieza — posponer hasta estabilizar)

- 🔴 **IMPORTANTE — Mapeo de columnas/formatos (nuevos bancos)** — el parser heurístico de CSV/XLSX (`HEADER_ALIASES`, `findColumns`) y el posicional x,y del PDF (layout fijo BBVA) están afinados solo para las muestras actuales (MercadoPago CSV + BBVA Visa/Mastercard). Cuando se agreguen más bancos habrá que: ampliar aliases (cada banco usa otros nombres/orden, a veces varios montos: débito/crédito, PESOS/DÓLARES, saldo), elegir bien la columna de monto y **generalizar el parser de PDF** (auto-detectar columnas por cluster de coordenadas x o por header). En hold por decisión del usuario: por ahora no agrega más bancos.
- **Conversión PDF→Markdown (Microsoft MarkItDown)** — **EVALUADO → NO recomendado** para estos casos. Motivo: su conversión de PDF por defecto (`pdfminer.six`) pierde estructura/tablas y rinde mal en tablas multi-columna densas; los resúmenes de banco son justamente tablas posicionales con columnas PESOS/DÓLARES que el parser actual (`unpdf` + x,y) ya resuelve bien. Además descarta las coordenadas x,y (señal clave para separar columnas) y es Python (no corre en Deno; REST = dependencia externa, latencia y enviar data financiera a un tercero). El camino correcto es el de arriba: generalizar el parser posicional, no convertir a Markdown.
- `frontend/src/logo.svg` — imagen sin uso (la UI actual no la renderiza).
- `frontend/src/reportWebVitals.js` + llamada en `index.js` — no requerido.
- `frontend/src/index.css` — ahora es el entry de Tailwind (imports + tokens); solo contiene `body` base.
- `parse-summary` — el archivo concentra parseo + categorías + análisis; modularizar cuando la feature-set se estabilice.
