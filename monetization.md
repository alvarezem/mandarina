# monetization.md — Ideas de suscripción por servicio

La app es **100% gratis** hoy. Este documento lista ideas de un tier pago con sus
tradeoffs para decidir rumbo en una sesión futura. **Sin decisión tomada** — salvo
que **los reportes avanzados (C) ya se implementaron gratis (2026-08)** y quedaron
como **primer candidato del tier Pro** (ver `DECISIONS.md`).

> Antes de elegir, hay un debate de fondo: el proyecto acumula **decisiones de
> "100% gratis"** (dominio custom descartado, PWA/App Store descartada por el
> $99/año de Apple). Monetizar cambia la postura — de herramienta personal a
> producto con clientes (soporte, reembolsos, impuestos). Eso determina si el
> camino es un subscription real o una donación.

## Contexto de costos

- **Supabase free tier (2026)**: 500 MB DB · 1 GB storage · **50k MAUs** ·
  500k edge invocations/mes · 5 GB egress · pausa tras 7 días inactivo.
  **Pro = $25/mes** (8 GB DB, 100k MAUs, backups, sin pausa).
- **Billing en Argentina**: **MercadoPago** (Suscripciones / Checkout Pro) es el
  camino real — **Stripe no tiene merchant accounts en ARG**. Precio sugerido en ARS.
- **Vercel Hobby free** alcanza (el frontend es estático).

## Ideas (con tradeoffs)

| # | Idea | Ingreso | Costo dev | Costo running | Tradeoff clave |
|---|---|---|---|---|---|
| A | **Mandi (asistente IA) como feature Pro** | Alto | Medio | **LLM por token** | El item más valioso del roadmap (responde sobre consumo/ledger). Pero manda datos financieros a un LLM → decidir provider + presupuesto de tokens + privacidad. |
| B | **Límite de resúmenes/mes** (free 3-5, Pro ilimitado) | Bajo | Bajo | Cero | Fácil (count por mes), sustenta el free tier. Pero se siente artificial y castiga al usuario fiel. |
| C | **Reportes avanzados / exportación** (Excel/PDF anual, resumen impositivo) | Medio | **Hecho (frontend, 2026-08)** | Cero | **Elegido como primer candidato Pro** (ver `DECISIONS.md`). Hoy es gratis; el gating + billing MercadoPago son el paso futuro. |
| D | **Datos extra en cotizaciones** (ONs/cauciones/futuros, intradía, más histórico) | Medio | Medio-Alto | **Fuente de datos paga** | Reactiva el item EN HOLD de ONs/cauciones (BYMA free no los cubre). Solo viable como Pro porque la fuente se paga. |
| E | **Afiliados de brokers** (IOL/Balanz/Cocos) | Bajo | Bajo | Cero | Cero infra. Pero choca con la tabla "honesta" de `/alternatives` (neutralidad). |
| F | **Donación one-time** ("Invitame un café", link MercadoPago) | Mínimo | Cero | Cero | Respeta la regla "100% gratis"; no escala pero valida demanda sin billing. |

## Lecturas / señal

- Cualquier subscription implica: tabla `subscriptions`/`profiles` en Supabase
  (patrón `portfolio_plan`, RLS own), webhook de MercadoPago → edge function que
  actualice el status, y gating de features en el frontend.
- La **donación (F)** es el único camino que no rompe la regla "100% gratis" y
  sirve de sensor de demanda antes de invertir en billing.
- **Mandi (A)** es el único con ingreso real sostenido, pero exige decidir el
  provider/costo antes (el item ya está en `TODO.md` sin fecha).