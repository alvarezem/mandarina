alter table public.transactions
  add column if not exists currency text not null default 'ARS';

comment on column public.transactions.currency is
  'Moneda del monto: ARS o USD';