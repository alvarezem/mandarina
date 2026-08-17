-- 0018_replace_plan_validation.sql
-- Validación de rangos en replace_user_plan (segunda barrera a import-plan).
-- La primera barrera vive en la Edge Function import-plan (planner.ts, error
-- por item); el RPC la refuerza en el dominio de la DB: target_weight fuera de
-- [0, 100] o quantity negativo -> exception que identifica el símbolo del item,
-- antes del delete+insert (el plan anterior queda intacto).
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES de
-- `functions deploy import-plan` (el handler llama al RPC; sin migrar,
-- import-plan 500 con PGRST202).

create or replace function public.replace_user_plan(
  p_user_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_symbol text;
  v_target numeric;
  v_quantity numeric;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Operación no permitida';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items debe ser un arreglo';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_symbol := coalesce((v_item->>'symbol')::text, '');
    v_target := coalesce((v_item->>'target_weight')::numeric, 0);
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);

    if v_target < 0 or v_target > 100 then
      raise exception 'El porcentaje de "%" (%) debe estar entre 0 y 100', v_symbol, v_target;
    end if;

    if v_quantity < 0 then
      raise exception 'La cantidad de "%" (%) no puede ser negativa', v_symbol, v_quantity;
    end if;
  end loop;

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