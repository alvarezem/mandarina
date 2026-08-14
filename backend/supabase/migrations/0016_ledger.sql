-- 0016_ledger.sql
-- Ledger de operaciones del Plan: historial real de compras/ventas/ajustes.
-- Independiente de portfolio_plan (el plan es la tenencia objetivo; el ledger
-- es el registro de operaciones y la fuente de la rentabilidad vs. costo).

create table if not exists public.ledger_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('compra', 'venta', 'ajuste')),
  quantity numeric(16, 6) not null check (quantity > 0),
  price numeric(16, 6) not null check (price >= 0),
  commission numeric(16, 6) not null default 0 check (commission >= 0),
  currency text not null default 'ARS',
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ledger_operations_user_symbol_date_idx
  on public.ledger_operations (user_id, symbol, date);

comment on column public.ledger_operations.side is
  'compra | venta | ajuste (posición inicial o corrección).';
comment on column public.ledger_operations.quantity is
  'Cantidad de unidades (siempre positiva; el signo lo define side).';
comment on column public.ledger_operations.price is
  'Precio por unidad en currency (el ajuste puede partir del precio BYMA actual).';

drop trigger if exists ledger_operations_set_updated_at on public.ledger_operations;
create trigger ledger_operations_set_updated_at
  before update on public.ledger_operations
  for each row execute function public.set_updated_at();

alter table public.ledger_operations enable row level security;

create policy "ledger_operations_select_own"
  on public.ledger_operations for select
  using (auth.uid() = user_id);

create policy "ledger_operations_insert_own"
  on public.ledger_operations for insert
  with check (auth.uid() = user_id);

create policy "ledger_operations_update_own"
  on public.ledger_operations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ledger_operations_delete_own"
  on public.ledger_operations for delete
  using (auth.uid() = user_id);
