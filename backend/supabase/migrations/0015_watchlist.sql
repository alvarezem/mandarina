-- 0015_watchlist.sql
-- Watchlist: tickers a seguir fuera del Plan de inversión.

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  name text,
  asset_type text not null default 'otro',
  currency text not null default 'ARS',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.watchlist
  add constraint watchlist_user_symbol_unique unique (user_id, symbol);

create index if not exists watchlist_user_id_idx
  on public.watchlist (user_id);

comment on column public.watchlist.symbol is
  'Ticker (ej. AAPL, AL30, CEDEAR).';
comment on column public.watchlist.name is
  'Etiqueta opcional; BYMA no devuelve nombre de instrumento.';
comment on column public.watchlist.asset_type is
  'accion | cedear | bono | dolar | fci | efectivo | otro';

alter table public.watchlist enable row level security;

create policy "watchlist_select_own"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "watchlist_insert_own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "watchlist_update_own"
  on public.watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watchlist_delete_own"
  on public.watchlist for delete
  using (auth.uid() = user_id);
