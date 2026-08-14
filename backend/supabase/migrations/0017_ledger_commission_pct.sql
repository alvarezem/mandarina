-- 0017_ledger_commission_pct.sql
-- La comisión del ledger puede expresarse como monto fijo en currency o como
-- porcentaje de la operación (cantidad × precio). Se agrega el flag para
-- distinguir: si es true, commission es un porcentaje; si no, un monto.

alter table public.ledger_operations
  add column commission_is_pct boolean not null default false;

comment on column public.ledger_operations.commission_is_pct is
  'Si es true, commission es un porcentaje de (cantidad × precio); si no, es un monto fijo en currency.';
