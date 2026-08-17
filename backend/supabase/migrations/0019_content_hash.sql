-- 0019_content_hash.sql
-- Dedupe por contenido de resúmenes subidos (Batch 4, add #14).
-- Columna content_hash (SHA-256 hex del archivo, calculado en el frontend con
-- crypto.subtle) en card_summaries. El upload nuevo la llena; una fila con el
-- mismo (user_id, content_hash) bloquea la subida del mismo archivo aunque el
-- nombre cambie (el dedupe por nombre con sufijo _N se mantiene para contenido
-- distinto). Filas históricas quedan NULL (no dedupe hacia atrás).

alter table public.card_summaries
  add column content_hash text;