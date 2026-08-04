alter table public.card_summaries
  add column if not exists status text not null default 'pending',
  add column if not exists error text;

comment on column public.card_summaries.status is
  'Estado del procesamiento: pending, parsing, done, error';
