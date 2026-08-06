-- 0007_investment_plan.sql
-- Plan de inversión: cartera objetivo del usuario (peso meta vs actual).

create table if not exists public.portfolio_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  name text,
  asset_type text not null default 'otro',
  currency text not null default 'ARS',
  target_weight numeric(5, 2) not null default 0,
  quantity numeric(16, 6) not null default 0,
  manual_price numeric(16, 6),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_plan
  add constraint portfolio_plan_user_symbol_unique unique (user_id, symbol);

create index if not exists portfolio_plan_user_id_idx
  on public.portfolio_plan (user_id);

comment on column public.portfolio_plan.asset_type is
  'accion | cedear | bono | dolar | fci | efectivo | otro';
comment on column public.portfolio_plan.target_weight is
  'Peso objetivo en % (0-100). La suma de los pesos no necesita ser 100.';
comment on column public.portfolio_plan.quantity is
  'Tenencia en cantidad de unidades (para FCI en $, puede ser el monto).';
comment on column public.portfolio_plan.manual_price is
  'Precio manual solo para activos sin cotización automática.';

alter table public.portfolio_plan enable row level security;

create policy "portfolio_plan_select_own"
  on public.portfolio_plan for select
  using (auth.uid() = user_id);

create policy "portfolio_plan_insert_own"
  on public.portfolio_plan for insert
  with check (auth.uid() = user_id);

create policy "portfolio_plan_update_own"
  on public.portfolio_plan for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "portfolio_plan_delete_own"
  on public.portfolio_plan for delete
  using (auth.uid() = user_id);
