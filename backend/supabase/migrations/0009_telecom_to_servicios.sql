-- 0009_telecom_to_servicios.sql
-- La categoría 'Telecom' se fusiona en 'Servicios' (internet/telefonía son servicios).

update public.transactions
set category = 'Servicios'
where category = 'Telecom';
