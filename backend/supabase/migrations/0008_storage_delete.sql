-- Permite al usuario borrar sus propios archivos de resumen del bucket privado
-- (hasta ahora solo podía leer/subir). El borrado de la fila en card_summaries
-- hace cascade a transactions y consumption_analyses (0001_init.sql).

create policy "card_resumes_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
