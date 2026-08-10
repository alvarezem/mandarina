-- 0013_replace_plan_rpc.sql
-- RPC atómico para reemplazar el plan de inversión de un usuario.
-- delete + insert en una sola transacción (sin ventana de datos perdidos).
-- SECURITY INVOKER: corre con RLS del caller (policies de portfolio_plan),
-- con guard explícito p_user_id = auth.uid().

create or replace function public.replace_user_plan(
  p_user_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Operación no permitida';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items debe ser un arreglo';
  end if;

  delete from public.portfolio_plan where user_id = p_user_id;

  insert into public.portfolio_plan
    (user_id, symbol, name, asset_type, currency, target_weight, quantity, sort_order)
  select
    p_user_id,
    (item->>'symbol')::text,
    coalesce((item->>'name')::text, item->>'symbol'),
    coalesce((item->>'asset_type')::text, 'otro'),
    coalesce((item->>'currency')::text, 'ARS'),
    coalesce((item->>'target_weight')::numeric, 0),
    coalesce((item->>'quantity')::numeric, 0),
    coalesce((item->>'sort_order')::integer, 0)
  from jsonb_array_elements(p_items) as item;
end;
$$;

revoke all on function public.replace_user_plan(uuid, jsonb) from public;
grant execute on function public.replace_user_plan(uuid, jsonb) to authenticated;
