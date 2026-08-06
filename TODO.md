# TODO Mandarina

Lista viva del proyecto. Se actualiza en cada iteración. Lo completado se archiva en `DONE.md`.

## 🔄 En progreso

- _(vacío)_

## 📋 Pendiente (roadmap)

- **Login con Google (OAuth) — código listo, falta config manual** — botón "Continuar con Google" implementado en `Auth.js` (`signInWithOAuth`, `redirectTo: window.location.origin`). **Falta (manual, no es código)**: activar el provider Google en el dashboard de Supabase, crear credenciales OAuth en Google Cloud Console y configurar las URLs de callback (`<SUPABASE_URL>/auth/v1/callback`, incluyendo `localhost:3000` y la URL de Vercel). Probar el flujo end-to-end al configurarlo.
- **Verificar linkeo de cuentas (email/password + Google = misma cuenta)** — asegurar que crear una cuenta con email/password (p.ej. un gmail) y luego iniciar sesión con Google OAuth con el mismo email no genere 2 usuarios. Supabase lo resuelve con **auto-linkeo por email verificado** (default on): el login OAuth busca el usuario con ese email y, si la cuenta está **confirmada**, vincula la identidad Google al mismo usuario (1 fila en `auth.users`, 2 identidades en `auth.identities`). A verificar cuando el provider Google esté configurado:
  - **Email sin confirmar** = riesgo de duplicado (la constraint única `users_email_partial_key` solo cubre emails confirmados). Validar que el flujo actual (pantalla "Casi listo" de Auth) no lo permita.
  - **Orden inverso** (Google primero → signup email/password con el mismo mail): Supabase devuelve respuesta ofuscada sin email de verificación (anti-enumeración), no crea duplicado — chequear que no confunda al usuario.
  - Si aparecen duplicados: merge manual (SQL) o **manual linking** con `supabase.auth.linkIdentity({ provider: 'google' })` (requiere habilitar "Manual linking" en Auth settings del dashboard).
  - Test end-to-end: crear cuenta con gmail → confirmar email → login Google → verificar 1 solo usuario con ambos providers en el dashboard; revisar `auth.users`/`auth.identities` por duplicados de email.
- **Revisar el mensaje de Vercel** — revisar el aviso/email recibido de Vercel (¿verificación de dominio `mandarina.app`, deploy o límite de la free tier?).
- **Área Inversiones — Plan y Cotizaciones hechos; queda gráficos y watchlist** — la sección Inversiones ahora tiene **2 sub-menús (tabs)**: **Plan de inversión** (meta % vs actual %, importar XLSX + edición manual, precios live vía proxy `quotes`, toggle ARS↔USD con CCL/MEP, presupuesto de compra) y **Cotizaciones en vivo** (resumen estilo Bull Market: patrimonio total con Δ diaria ponderada, cards MEP/CCL, doughnut de asignación y tabla de cotizaciones live con precio/variación/volumen/valor/% cartera). La fuente de precios de la edge `quotes` pasó de **Yahoo Finance (bloqueado con 429) a BYMA Open Data** (`open.bymadata.com.ar`, oficial y gratis, ~20 min de demora) manteniendo dolarapi para MEP/CCL; `import-plan` ahora hace **rollback** si el insert falla y expone el error real. Queda pendiente:
  - **Gráficos de precio por activo** — Chart.js (área/velas) con rangos 1D/1S/1M/3M/1A usando el histórico OHLCV de BYMA (`/free/chart/historical-series/history?symbol=SYM%2024HS&resolution=D`).
  - **Watchlist editable** — además de los activos del plan, poder seguir otros tickers (persistencia en DB vs localStorage a decidir).
  - **Plan de inversión — Fase 2**: ledger de compras/ventas → cantidades y costo automáticos + rentabilidad vs. costo; alimentar a **Mandi**.
- **Infra del rebrand (pasos; ejecutar en sesión con acceso)** — "fimplify" queda solo en fallbacks intencionales de localStorage; falta renombrar lo externo:
  1. **Cloudflare Registrar** (punto de arranque): comprar `mandarina.app` (~US$12-15/año, compra manual en navegador con pago) y configurar el DNS en Cloudflare.
  2. **Vercel**: en el proyecto `fimplify` (hoy sirve `fimplify.vercel.app`, sin dominios custom), agregar `mandarina.app` (+ `www.mandarina.app`) como dominio y fijarlo como producción; mantener `fimplify.vercel.app` como alias/redirect; luego renombrar el proyecto `fimplify` → `mandarina`.
  3. **GitHub**: `gh repo rename` → `alvarezem/mandarina` (añade/actualiza descripción) y actualizar el `remote` local.
  4. **Verificar**: `mandarina.app` sirve el bundle nuevo (grep de `main.*.js` y strings brand) y `fimplify.vercel.app` redirige a Mandarina.
- **Móvil (`<lg`)** — diferido hasta estabilizar escritorio. La navegación móvil actual (bottom nav con logo central + header con solo título) convive con el nuevo header desktop ([≡] + logo Mandarina están `hidden lg:flex`). Pendiente estilo YouTube mobile: el hamburguesa debería abrir un **drawer deslizante** con Costos/Inversiones/Resúmenes; decidir si reemplaza o convive con la bottom nav.
- **Evaluar D3** — si el dashboard necesita visualizaciones custom que Chart.js no cubra bien, migrar/escalar a D3 (anotado; por ahora Chart.js alcanza).
- **Asistente IA "Mandi"** — integrar un asistente que responda preguntas sobre el consumo usando el análisis de resúmenes.

## ⏸️ En hold (refactor / limpieza — posponer hasta estabilizar)

- 🔴 **IMPORTANTE — Mapeo de columnas/formatos (nuevos bancos)** — el parser heurístico de CSV/XLSX (`HEADER_ALIASES`, `findColumns`) y el posicional x,y del PDF (layout fijo BBVA) están afinados solo para las muestras actuales (MercadoPago CSV + BBVA Visa/Mastercard). Cuando se agreguen más bancos habrá que: ampliar aliases (cada banco usa otros nombres/orden, a veces varios montos: débito/crédito, PESOS/DÓLARES, saldo), elegir bien la columna de monto y **generalizar el parser de PDF** (auto-detectar columnas por cluster de coordenadas x o por header). En hold por decisión del usuario: por ahora no agrega más bancos.
- **Conversión PDF→Markdown (Microsoft MarkItDown)** — **EVALUADO → NO recomendado** para estos casos. Motivo: su conversión de PDF por defecto (`pdfminer.six`) pierde estructura/tablas y rinde mal en tablas multi-columna densas; los resúmenes de banco son justamente tablas posicionales con columnas PESOS/DÓLARES que el parser actual (`unpdf` + x,y) ya resuelve bien. Además descarta las coordenadas x,y (señal clave para separar columnas) y es Python (no corre en Deno; REST = dependencia externa, latencia y enviar data financiera a un tercero). El camino correcto es el de arriba: generalizar el parser posicional, no convertir a Markdown.
- `frontend/src/logo.svg` — imagen sin uso (la UI actual no la renderiza).
- `frontend/src/reportWebVitals.js` + llamada en `index.js` — no requerido.
- `frontend/src/index.css` — ahora es el entry de Tailwind (imports + `@theme` con tokens de color/animación + keyframes) y `body` base.
- `parse-summary` — el archivo concentra parseo + categorías + análisis; modularizar cuando la feature-set se estabilice.
