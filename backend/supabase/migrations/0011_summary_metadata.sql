-- Metadata de resúmenes: tipo (tarjeta / banco / billetera virtual / broker) y período.
-- `bank` nunca se usó en código; pasa a ser el tipo del resumen.
alter table public.card_summaries
  rename column bank to summary_type;

comment on column public.card_summaries.summary_type is
  'Tipo del resumen: VISA / MASTERCARD / AMEX / Banco / Billetera virtual / Broker / Otro';

comment on column public.card_summaries.period_month is
  'Mes del período del resumen (1-12), autodetectado del modal de fechas de las transacciones';

comment on column public.card_summaries.period_year is
  'Año del período del resumen, autodetectado del modal de fechas de las transacciones';
