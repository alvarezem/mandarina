create table if not exists public.card_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text,
  bank text,
  period_month smallint,
  period_year smallint,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.card_summaries (id) on delete cascade,
  date date not null,
  merchant text not null,
  amount numeric(12, 2) not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.consumption_analyses (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.card_summaries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.card_summaries enable row level security;
alter table public.transactions enable row level security;
alter table public.consumption_analyses enable row level security;

create policy "card_summaries_select_own"
  on public.card_summaries for select
  using (auth.uid() = user_id);

create policy "card_summaries_insert_own"
  on public.card_summaries for insert
  with check (auth.uid() = user_id);

create policy "card_summaries_update_own"
  on public.card_summaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "card_summaries_delete_own"
  on public.card_summaries for delete
  using (auth.uid() = user_id);

create policy "transactions_select_own"
  on public.transactions for select
  using (exists (
    select 1 from public.card_summaries cs
    where cs.id = transactions.summary_id
    and cs.user_id = auth.uid()
  ));

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (exists (
    select 1 from public.card_summaries cs
    where cs.id = transactions.summary_id
    and cs.user_id = auth.uid()
  ));

create policy "transactions_update_own"
  on public.transactions for update
  using (exists (
    select 1 from public.card_summaries cs
    where cs.id = transactions.summary_id
    and cs.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.card_summaries cs
    where cs.id = transactions.summary_id
    and cs.user_id = auth.uid()
  ));

create policy "transactions_delete_own"
  on public.transactions for delete
  using (exists (
    select 1 from public.card_summaries cs
    where cs.id = transactions.summary_id
    and cs.user_id = auth.uid()
  ));

create policy "consumption_analyses_select_own"
  on public.consumption_analyses for select
  using (auth.uid() = user_id);

create policy "consumption_analyses_insert_own"
  on public.consumption_analyses for insert
  with check (auth.uid() = user_id);

create policy "consumption_analyses_update_own"
  on public.consumption_analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "consumption_analyses_delete_own"
  on public.consumption_analyses for delete
  using (auth.uid() = user_id);
