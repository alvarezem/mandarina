-- 0023_subscriptions.sql
-- Tier Pro — suscripción del usuario (idea C de monetización: reportes).
--
-- Tabla de una sola fila por usuario con el estado de su plan. El billing real
-- de MercadoPago (checkout + webhook) llega en un paso futuro; en esta iteración
-- la activación es manual (SQL editor) y el frontend consulta esta tabla vía RLS.
-- Las columnas mp_* quedan reservadas para ese paso (no se usan todavía).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'expired')),
  mp_preapproval_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

comment on table public.subscriptions is
  'Suscripción Pro del usuario (una fila por usuario). Billing MercadoPago: paso futuro.';
comment on column public.subscriptions.plan is
  'Plan del usuario; hoy solo existe ''pro''.';
comment on column public.subscriptions.status is
  'active | canceled | past_due | expired — active habilita las features Pro.';
comment on column public.subscriptions.mp_preapproval_id is
  'Id de la preaprobación MercadoPago (reservado para el billing futuro).';
comment on column public.subscriptions.current_period_end is
  'Fin del período facturado (reservado para el billing futuro).';

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (auth.uid() = user_id);