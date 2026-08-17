-- 0021_parse_overrides.sql
-- Batch 5: re-parse resiliente — preserva el trabajo del usuario.
--
-- 1) category_override en transactions: marca las categorías que el usuario
--    cambió a mano desde el dashboard. finalize_parse las snapshot antes del
--    delete+insert y las re-aplica por (merchant, date, amount).
-- 2) summary_type_manual en card_summaries: el tipo que el usuario clasificó
--    a mano no se pisa en el re-parse.
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES de
-- `functions deploy parse-summary` (el handler nuevo llama a finalize_parse
-- con la firma de acá; sin migrar, la firma vieja no existe).

alter table public.transactions
  add column category_override boolean not null default false;

alter table public.card_summaries
  add column summary_type_manual boolean not null default false;

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

  -- Snapshot de categorías manuales (se re-aplican tras el delete+insert).
  create temp table _manual_categories on commit drop as
    select merchant, date, amount, category
    from public.transactions
    where summary_id = p_summary_id and category_override;

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

  -- Re-aplicar categorías manuales sobre las transacciones re-insertadas.
  update public.transactions t
  set category = m.category
  from _manual_categories m
  where t.summary_id = p_summary_id
    and t.merchant = m.merchant
    and t.date = m.date
    and t.amount = m.amount;

  update public.card_summaries
  set summary_type = case when summary_type_manual then summary_type else p_summary_type end,
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