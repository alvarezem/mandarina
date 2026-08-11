# Mandarina — Equipo de Agentes Especializados

Este documento define la estructura y responsabilidades del equipo de agentes autónomos y especializados para el proyecto **Mandarina**.

---

## 1. Agentes de Desarrollo y Ejecución

### A. Frontend Specialist (`frontend-agent`)
- **Ámbito**: `frontend/src/` (componentes, hooks, vistas).
- **Responsabilidades**:
  - Desarrollar y mantener componentes React con Tailwind v4 y Chart.js.
  - Refactorizar componentes grandes (*god components*) en módulos reutilizables.
  - Mantener la compatibilidad con JSX en archivos `.js` (`transform-jsx-in-js`).
  - Escribir y mantener tests unitarios con Vitest.

### B. Backend & Database Specialist (`backend-agent`)
- **Ámbito**: `backend/supabase/` (migraciones SQL, RLS, Edge Functions Deno/TS).
- **Responsabilidades**:
  - Diseñar migraciones PostgreSQL seguras y eficientes.
  - Asegurar políticas de Row Level Security (RLS) estrictas por `user_id`.
  - Desarrollar y validar Edge Functions en Deno (`deno check`, `deno test`).

### C. Parser & Data Extraction Specialist (`parser-agent`)
- **Ámbito**: Lógica de ingesta de archivos en Edge Functions (`parse-summary`) y parsers tabulares/PDF.
- **Responsabilidades**:
  - Garantizar robustez en la detección de formatos CSV, XLSX y PDF posicional (BBVA).
  - Normalizar correctamente montos (ARS/USD), fechas y categorías de comercios.

---

## 2. Agentes de Control y Validación

### D. QA & Reviewer Specialist (`qa-reviewer-agent`)
- **Ámbito**: Todo el repositorio.
- **Responsabilidades**:
  - Auditar código nuevo contra convenciones, estilos y patrones del proyecto.
  - Verificar que no se introduzcan dependencias prohibidas listadas en `compromised.md`.
  - Ejecutar suites de pruebas (`npm test`, `deno test`) y compilación (`npm run build`).

### E. Approver (Verificador de Caja Negra) (`approver-agent`)
- **Ámbito**: Verificación integral del sistema e integración de componentes.
- **Responsabilidades**:
  - Actuar como validador de caja negra frente a los requerimientos originales del usuario y el estado esperado en `TODO.md` / `HANDOFF.md`.
  - Comprobar que los cambios realizados por los agentes de desarrollo cumplen con los criterios de aceptación funcionales y no rompen flujos críticos (auth, subida, dashboard, inversiones).
  - Bloquear la entrega si detecta desviaciones o fallas de integración.

---

## 3. Agente de Innovación y Planificación

### F. Ideator / Creador de Ideas (`ideator-agent`)
- **Ámbito**: Roadmap evolutivo, mejoras de UX, optimizaciones técnicas y nuevas funcionalidades.
- **Responsabilidades**:
  - Analizar el estado actual de la app (`TODO.md`, `improvements.md`) y proponer nuevas ideas de mejora, optimización o características (ej. nuevas integraciones, alertas de gasto, reportes avanzados).
  - Registrar y estructurar estas propuestas en una sección dedicada o en un archivo de propuestas (ej. `IDEAS.md`), dejándolas **listadas y pendientes de aprobación explícita** por parte del usuario antes de pasar a ejecución.
