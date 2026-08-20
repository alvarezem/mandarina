-- 0025_admin_accounts.sql
-- Admin: duración de Pro en meses + deshabilitar/habilitar cuentas (ban).
--
-- 1) `admin_set_subscription(p_user_id, p_status, p_months)`: la activación puede
--    setear `current_period_end`. La renovación SUMA al período vigente
--    (`greatest(now(), current_period_end)`), no lo reinicia. Sin `p_months` (o
--    status != active) no toca la fecha. Se redefine con la nueva firma; se
--    dropea la firma vieja (uuid, text).
-- 2) `admin_ban_user(p_user_id, p_banned_until)`: deshabilita/habilita la cuenta
--    vía `auth.users.banned_until` (null = habilitar). Bloquea nuevos logins y
--    refreshes de token; una sesión ya activa puede sobrevivir hasta el TTL
--    (~1 h). Guard admin + no auto-ban.
-- 3) `admin_pro_overview`: agrega `banned_until` al json de usuarios (para el
--    badge "Bloqueado").
-- 4) Sanity check al migrar: un UPDATE de 0 filas a `auth.users` valida que el
--    rol que corre las migraciones (owner de las funciones security definer)
--    tiene UPDATE sobre `auth.users`; si no, el db push falla acá y se detecta
--    antes de commitear el frontend.
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES del push a master
-- (el frontend llama a los RPC con la nueva firma; sin migrar, `.rpc()` responde
-- PGRST202 o PGRST201 por firma/args desconocidos).

drop function if exists public.admin_set_subscription(uuid, text);

create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_status text,
  p_months integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Operación no permitida';
  end if;

  if p_status not in ('active', 'canceled', 'past_due', 'expired') then
    raise exception 'Status inválido';
  end if;

  if p_months is not null and p_months <= 0 then
    raise exception 'Meses inválido';
  end if;

  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (
    p_user_id,
    'pro',
    p_status,
    case when p_status = 'active' and p_months > 0
      then now() + make_interval(months => p_months)
      else null
    end
  )
  on conflict (user_id) do update
    set status = p_status,
        current_period_end = case
          when p_status = 'active' and p_months > 0
          then greatest(coalesce(public.subscriptions.current_period_end, now()), now())
               + make_interval(months => p_months)
          else public.subscriptions.current_period_end
        end,
        updated_at = now();

  update public.pro_requests
  set status = case when p_status = 'active' then 'approved' else 'dismissed' end,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_set_subscription(uuid, text, integer) from public;
grant execute on function public.admin_set_subscription(uuid, text, integer) to authenticated;

create or replace function public.admin_ban_user(
  p_user_id uuid,
  p_banned_until timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Operación no permitida';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No podés deshabilitar tu propia cuenta';
  end if;

  update auth.users
  set banned_until = p_banned_until
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_ban_user(uuid, timestamptz) from public;
grant execute on function public.admin_ban_user(uuid, timestamptz) to authenticated;

create or replace function public.admin_pro_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Operación no permitida';
  end if;

  select jsonb_build_object(
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'email', u.email,
        'status', r.status,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from public.pro_requests r
      join auth.users u on u.id = r.user_id
      where r.status = 'pending'
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'banned_until', u.banned_until,
        'plan', s.plan,
        'status', s.status,
        'current_period_end', s.current_period_end
      ) order by u.created_at desc)
      from auth.users u
      left join public.subscriptions s on s.user_id = u.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_pro_overview() from public;
grant execute on function public.admin_pro_overview() to authenticated;

-- Sanity check de permiso sobre auth.users (0 filas, valida UPDATE + columna).
do $$
begin
  update auth.users
  set banned_until = null
  where id = '00000000-0000-0000-0000-000000000000';
end $$;