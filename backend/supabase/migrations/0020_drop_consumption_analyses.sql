-- 0020_drop_consumption_analyses.sql
-- Batch 6: se elimina la persistencia de consumption_analyses (data muerta y
-- divergente del análisis del frontend). Fuente única: la tabla transactions
-- (backend, autoritativa) + lib/analysis.js (función pura, calcula en vivo).
--
-- 1) Se redefine finalize_parse sin el parámetro p_result (ni el insert de
--    consumption_analyses); parse-summary ya no construye ni pasa el result.
-- 2) Se borra la tabla: sus policies RLS, el unique de 0004_analysis_unique.sql
--    y el FK a card_summaries (on delete cascade) caen con ella.
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES de
-- `functions deploy parse-summary` (el handler nuevo llama a finalize_parse sin
-- p_result; sin migrar, la firma vieja no existe → error; migrado sin redeploy,
-- la function vieja pasa un p_result que ya no existe → PGRST202).

drop table if exists public.consumption_analyses;

create or replace function public.finalize_parse(
  p_user_id uuid,
  p_summary_id uuid,
  p_transactions jsonb,
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

revoke all on function public.finalize_parse(uuid, uuid, jsonb, text, smallint, smallint) from public;
grant execute on function public.finalize_parse(uuid, uuid, jsonb, text, smallint, smallint) to authenticated;