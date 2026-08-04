insert into storage.buckets (id, name, public)
values ('card-resumes', 'card-resumes', false)
on conflict (id) do nothing;

create policy "card_resumes_read_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "card_resumes_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);