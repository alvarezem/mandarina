-- 0022_transactions_user_id.sql
-- Batch 8: transactions.user_id — fix real de la "defensa en profundidad".
--
-- transactions no tenía user_id (el ownership se resolvía por RLS vía subquery
-- a card_summaries). Esta migración:
-- 1) agrega la columna user_id con backfill desde card_summaries por summary_id,
--    NOT NULL e índice;
-- 2) simplifica las políticas RLS de transactions a auth.uid() = user_id;
-- 3) redefine finalize_parse (misma firma) para insertar user_id = p_user_id y
--    validar que el resumen pertenezca al usuario (guard en el lock).
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES del push a master
-- (el frontend filtra transactions por user_id; sin migrar, PostgREST responde
-- PGRST202 por columna inexistente). La edge parse-summary NO cambia: la firma
-- de finalize_parse es idéntica (sin redeploy de functions).

alter table public.transactions
  add column user_id uuid;

update public.transactions t
set user_id = cs.user_id
from public.card_summaries cs
where cs.id = t.summary_id;

alter table public.transactions
  alter column user_id set not null;

create index if not exists transactions_user_id_idx
  on public.transactions (user_id);

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

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
  v_owner uuid;
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
  select status, user_id into v_status, v_owner
  from public.card_summaries
  where id = p_summary_id
  for update;

  if v_status is null then
    raise exception 'Resumen no encontrado';
  end if;

  if v_owner is distinct from p_user_id then
    raise exception 'Operación no permitida';
  end if;

  -- Snapshot de categorías manuales (se re-aplican tras el delete+insert).
  create temp table _manual_categories on commit drop as
    select merchant, date, amount, category
    from public.transactions
    where summary_id = p_summary_id and category_override;

  delete from public.transactions
  where summary_id = p_summary_id;

  with inserted as (
    insert into public.transactions (summary_id, user_id, date, merchant, amount, category, currency)
    select
      p_summary_id,
      p_user_id,
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