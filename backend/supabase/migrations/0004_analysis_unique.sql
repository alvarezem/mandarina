alter table public.consumption_analyses
  drop constraint if exists consumption_analyses_summary_id_key;

alter table public.consumption_analyses
  add constraint consumption_analyses_summary_id_key unique (summary_id);