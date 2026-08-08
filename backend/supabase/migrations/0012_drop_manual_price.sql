-- 0012_drop_manual_price.sql
-- El precio se toma siempre de BYMA: se elimina el precio manual.

alter table public.portfolio_plan
  drop column if exists manual_price;
