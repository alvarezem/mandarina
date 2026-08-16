# Batch 4 — Upload y storage

**Dominio:** frontend (subida de resúmenes). **Índice:** #4.
**Estado:** [ ] pendiente

## Hallazgos que resuelve

- orig #7: upload sin validación de tamaño/tipo (`components/UploadSummaries.js:68-121`) — solo el `accept` del input; un PDF roto o gigante se sube y el parse falla → blob huérfano.
- orig #8: `removeSummary` borra el blob ANTES que la fila (`UploadSummaries.js:142-165`) — si el delete de la fila falla, el resumen apunta a un archivo inexistente y el re-parse muere.
- add #13: si el INSERT de `card_summaries` falla tras el upload (`UploadSummaries.js:97-113`) → blob huérfano sin fila que lo referencie (path del insert fallido, sin rollback).
- add #14: sin dedupe por contenido — subir dos veces el mismo archivo crea `<nombre>_1.<ext>` (`lib/sanitizeFileName.js:27-37`) y duplica transacciones.

## Criterio de éxito

- Upload valida tamaño (límite definido, ej. ≤ 10 MB) y tipo (pdf/csv/xlsx) antes de tocar storage; error amigable.
- `removeSummary`: borra primero la fila y luego el blob; si la fila no se pudo borrar, no se toca el blob.
- Si el INSERT de `card_summaries` falla tras el upload, se hace rollback del blob (borrar lo subido) o se deja un estado que la UI permite limpiar.
- Subir el mismo archivo dos veces: se detecta por contenido (hash) y se avisa/no duplica (o se permite el `_1` solo con confirmación explícita).
- `npm test` verde (UploadSummaries.test.js, sanitizeFileName.test.js).

## Tareas

1. **`components/UploadSummaries.js`**: validación de tamaño/tipo antes del upload (con `File` + límites). Test.
2. **`components/UploadSummaries.js` — `removeSummary`**: invertir el orden (fila → blob). Test del orden de llamadas (mock supabase).
3. **`components/UploadSummaries.js` — insert fallido**: try/catch que borre el blob recién subido si el INSERT falla (rollback), o marque el resumen como "limpiar". Test del path de error.
4. **Dedupe por contenido**: hash del archivo (o del buffer) para detectar subidas duplicadas antes de `uniqueStoragePath`; decisión de UX (aviso + no subir, vs confirmar). Test en `sanitizeFileName`/`UploadSummaries`.

## Tests a tocar

- `frontend/src/components/UploadSummaries.test.js`
- `frontend/src/lib/sanitizeFileName.test.js`

## Documentación

- `DONE.md` + `HANDOFF.md` al cierre.

## Checklist de cierre

- [ ] `npm test` verde
- [ ] `npm run lint` sin issues
- [ ] Índice `batches/README.md` marcado [x]