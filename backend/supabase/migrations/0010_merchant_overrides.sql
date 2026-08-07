-- 0010_merchant_overrides.sql
-- Overrides de merchant → categoría (recordar categoría para un comercio conocido)
-- y categorías personalizadas del usuario.

-- Reclasifica transferencias a brokers como Inversiones (p.ej. Bull Market Brokers).
update public.transactions
set category = 'Inversiones'
where merchant ~* 'bull market|broker';

create table if not exists public.merchant_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text not null,
  category text not null,
  created_at timestamptz not null default now()
);

alter table public.merchant_overrides
  add constraint merchant_overrides_user_merchant_unique unique (user_id, merchant);

create index if not exists merchant_overrides_user_id_idx
  on public.merchant_overrides (user_id);

create table if not exists public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.custom_categories
  add constraint custom_categories_user_name_unique unique (user_id, name);

create index if not exists custom_categories_user_id_idx
  on public.custom_categories (user_id);

alter table public.merchant_overrides enable row level security;
alter table public.custom_categories enable row level security;

create policy "merchant_overrides_select_own"
  on public.merchant_overrides for select
  using (auth.uid() = user_id);

create policy "merchant_overrides_insert_own"
  on public.merchant_overrides for insert
  with check (auth.uid() = user_id);

create policy "merchant_overrides_update_own"
  on public.merchant_overrides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "merchant_overrides_delete_own"
  on public.merchant_overrides for delete
  using (auth.uid() = user_id);

create policy "custom_categories_select_own"
  on public.custom_categories for select
  using (auth.uid() = user_id);

create policy "custom_categories_insert_own"
  on public.custom_categories for insert
  with check (auth.uid() = user_id);

create policy "custom_categories_update_own"
  on public.custom_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "custom_categories_delete_own"
  on public.custom_categories for delete
  using (auth.uid() = user_id);
