# Mandarina — Frontend

Dashboard personal de consumo de tarjetas de crédito. Frontend React 19 + Vite.

## Stack

- React 19, Vite 8, Tailwind v4 (CLI genera `src/index.generated.css`, gitignored)
- Chart.js + react-chartjs-2
- Supabase JS (Auth, PostgreSQL, Storage)
- Tests: Vitest + jsdom + Testing Library (setup en `src/setupTests.js`)

## Scripts

```bash
npm install
npm start            # dev server en :3000 (tailwind watch + vite)
npm test             # suite de tests (Vitest, un solo run)
npm run test:watch   # Vitest en modo watch
npm run build        # build:css + build de producción (salida en dist/)
```

## Notas de configuración

- `vite.config.js`: plugin react + server en :3000 (OAuth localhost:3000) +
  entorno de tests jsdom. Incluye un plugin `transform-jsx-in-js` porque el
  código mantiene componentes en archivos `.js` (estilo CRA) y el transformador
  oxc de Vite 8 excluye `.js` por defecto. Ver
  https://github.com/vitejs/vite/discussions/21505
- Variables de entorno: prefijo `VITE_` (ver `.env.example`).
- Deploy: estático vía Vercel (`vercel.json`, salida en `dist/`).
