-- 0014_reliability.sql
-- Fiabilidad del backend (FASE 5):
--   1. Índices para los queries más usados (dashboard, reparse).
--   2. Trigger set_updated_at() para portfolio_plan (updated_at solo tenía default).
--   3. Backfill dirigido: telecom -> Servicios (sync con _shared/categorize.ts).
--   4. RPC atómico finalize_parse() que reemplaza los 4 round-trips de parse-summary.
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES de
-- `functions deploy parse-summary|import-plan` (el handler llama al RPC finalize_parse;
-- sin migrar, todo parse termina en PGRST202).

-- 1) Índices
create index if not exists transactions_summary_id_idx
  on public.transactions (summary_id);
create index if not exists transactions_date_idx
  on public.transactions (date);
create index if not exists card_summaries_user_id_idx
  on public.card_summaries (user_id);

-- 2) Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_plan_set_updated_at on public.portfolio_plan;
create trigger portfolio_plan_set_updated_at
  before update on public.portfolio_plan
  for each row execute function public.set_updated_at();

-- 3) Backfill telecom -> Servicios.
-- Las reglas de categorización incluyen telecom dentro de Servicios
-- (category "Telecom" no existe); el backfill histórico de 0006 no lo tenía.
-- Dirigido: solo toca filas cuyo merchant es telecom y que no ya son Servicios,
-- para no pisar reclasificaciones manuales del usuario.
update public.transactions
set category = 'Servicios'
where merchant ~* 'telecom'
  and category is distinct from 'Servicios';

-- 4) RPC de finalización de parse, atómica e idempotente.
-- Reemplaza: delete + insert de transactions, upsert de consumption_analyses y
-- metadata de card_summaries, en una sola transacción (sin ventana de datos a medias).
-- SECURITY INVOKER: corre con RLS del caller (policies de las 3 tablas),
-- con guard p_user_id = auth.uid() y lock del resumen (serializa parses concurrentes).
create or replace function public.finalize_parse(
  p_user_id uuid,
  p_summary_id uuid,
  p_transactions jsonb,
  p_result jsonb,
  p_summary_type text,
  p_period_year smallint,
  p_period_month smallint
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
  v_inserted bigint;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Operación no permitida';
  end if;

  if jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'p_transactions debe ser un arreglo';
  end if;

  -- Lock del resumen: dos finalize concurrentes del mismo resumen se serializan
  -- acá. El delete+insert es atómico e idempotente por sí mismo, así que un
  -- re-proceso (botón de re-parse / reintento) reescribe el resultado correcto.
  select status into v_status
  from public.card_summaries
  where id = p_summary_id
  for update;

  if v_status is null then
    raise exception 'Resumen no encontrado';
  end if;

  delete from public.transactions
  where summary_id = p_summary_id;

  with inserted as (
    insert into public.transactions (summary_id, date, merchant, amount, category, currency)
    select
      p_summary_id,
      (item->>'date')::date,
      (item->>'merchant')::text,
      (item->>'amount')::numeric(12, 2),
      (item->>'category')::text,
      coalesce((item->>'currency')::text, 'ARS')
    from jsonb_array_elements(p_transactions) as item
    returning 1
  )
  select count(*) into v_inserted from inserted;

  insert into public.consumption_analyses (summary_id, user_id, result)
  values (p_summary_id, p_user_id, p_result)
  on conflict (summary_id) do update
  set result = excluded.result;

  update public.card_summaries
  set summary_type = p_summary_type,
      period_year = coalesce(p_period_year, period_year),
      period_month = coalesce(p_period_month, period_month),
      status = 'done',
      error = null
  where id = p_summary_id;

  return v_inserted;
end;
$$;

revoke all on function public.finalize_parse(uuid, uuid, jsonb, jsonb, text, smallint, smallint) from public;
grant execute on function public.finalize_parse(uuid, uuid, jsonb, jsonb, text, smallint, smallint) to authenticated;