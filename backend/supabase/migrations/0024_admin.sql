-- 0024_admin.sql
-- Panel Admin + solicitud de Pro en-app (gestión manual previa al billing MP).
--
-- 1) `admins`: quién puede ver el panel y ejecutar los RPC de gestión. Se siembra
--    una vez por SQL editor: `insert into public.admins (user_id) values ('<uid>');`
--    RLS select own, sin políticas de escritura (solo el SQL editor / service role
--    escribe; el frontend detecta admin por su propia fila).
-- 2) `pro_requests`: cola de solicitudes de Pro del usuario. RLS select own (el
--    usuario lee su propia solicitud); las escrituras van por RPC (`request_pro`).
-- 3) `request_pro()`: upsert idempotente de la solicitud del usuario autenticado.
--    SECURITY DEFINER con guard `auth.uid()` (sin parámetros): solo puede escribir
--    su propia fila; así el status no se puede falsear desde el cliente y no hace
--    falta una policy de update.
-- 4) `admin_pro_overview()`: solicitudes pendientes + todos los usuarios con su
--    status Pro (SECURITY DEFINER, guard `exists(admins)`).
-- 5) `admin_set_subscription(p_user_id, p_status)`: ÚNICA escritura a
--    `subscriptions` (SECURITY DEFINER, guard admin). Setea status y marca la
--    solicitud approved/dismissed en la misma transacción.
-- 6) `admin_dismiss_request(p_user_id)`: descarta una solicitud sin tocar la
--    suscripción (SECURITY DEFINER, guard admin).
-- 7) FIX DE SEGURIDAD: se quitan las policies insert/update/delete de
--    `subscriptions` (queda solo select own). Antes, la RLS own de `0023` permitía
--    que cualquier usuario insertara su propia fila 'pro'/'active' por la API y se
--    auto-activara Pro. Desde esta migración la única escritura es el RPC admin.
--
-- ORDEN DE DEPLOY OBLIGATORIO: `supabase db push` ANTES del push a master
-- (el frontend llama a los RPC y lee `pro_requests`/`admins`; sin migrar, el
-- `.rpc()` responde PGRST202 y el SELECT, PGRST202 por tabla inexistente).

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Administradores de la app (el dueño). Se siembra una vez por SQL editor.';

alter table public.admins enable row level security;

create policy "admins_select_own"
  on public.admins for select
  using (auth.uid() = user_id);

create table if not exists public.pro_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pro_requests is
  'Solicitud de upgrade a Pro (cola previa al billing MP). Una fila por usuario.';
comment on column public.pro_requests.status is
  'pending | approved | dismissed — pending habilita la acción del admin.';

drop trigger if exists pro_requests_set_updated_at on public.pro_requests;
create trigger pro_requests_set_updated_at
  before update on public.pro_requests
  for each row execute function public.set_updated_at();

alter table public.pro_requests enable row level security;

create policy "pro_requests_select_own"
  on public.pro_requests for select
  using (auth.uid() = user_id);

create or replace function public.request_pro()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pro_requests (user_id, status)
  values (auth.uid(), 'pending')
  on conflict (user_id) do update
    set status = case when public.pro_requests.status = 'dismissed' then 'pending' else public.pro_requests.status end,
        updated_at = now();
end;
$$;

revoke all on function public.request_pro() from public;
grant execute on function public.request_pro() to authenticated;

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

create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_status text
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

  insert into public.subscriptions (user_id, plan, status)
  values (p_user_id, 'pro', p_status)
  on conflict (user_id) do update
    set status = p_status,
        updated_at = now();

  update public.pro_requests
  set status = case when p_status = 'active' then 'approved' else 'dismissed' end,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_set_subscription(uuid, text) from public;
grant execute on function public.admin_set_subscription(uuid, text) to authenticated;

create or replace function public.admin_dismiss_request(
  p_user_id uuid
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

  update public.pro_requests
  set status = 'dismissed',
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_dismiss_request(uuid) from public;
grant execute on function public.admin_dismiss_request(uuid) to authenticated;

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;