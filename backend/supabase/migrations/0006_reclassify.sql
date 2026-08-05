-- 0006_reclassify.sql
-- Backfill: re-clasifica las transacciones existentes según las reglas ampliadas de categoría.
-- MANTENER EN SYNC con backend/supabase/functions/_shared/categorize.ts (mismo regex y orden).

update public.transactions
set category = case
  when merchant ~* 'impuesto|iibb|iva rg|db\.rg|cr\.rg' then 'Impuestos'
  when merchant ~* 'rendimiento' then 'Inversiones'
  when merchant ~* 'su pago|pago en pesos|pago en usd' then 'Pagos'
  when merchant ~* 'transferencia recibida' then 'Ingresos'
  when merchant ~* 'transferencia enviada' then 'Transferencias'
  when merchant ~* 'seguro' then 'Seguros'
  when merchant ~* 'axion|ypf|nafta|combustible|shell|petrobras|gasoil' then 'Combustible'
  when merchant ~* 'telecentro|fibertel|movistar|claro|telefonica' then 'Telecom'
  when merchant ~* 'carrefour|coto|jumbo|changomas|supermercado|walmart|makro' then 'Supermercados'
  when merchant ~* 'cinemark|hoyts|cine|teatro|ticketek|showcase' then 'Entretenimiento'
  when merchant ~* 'grido|mostaza|mcdonald|burger king|rotiseria|parrilla|pizzeria|restaurant|heladeria' then 'Gastronomía'
  when merchant ~* 'uber|cabify|didi|taxi|subte|colectivo' then 'Transporte'
  when merchant ~* 'farmacity|farmacia|drogueria' then 'Farmacias'
  when merchant ~* 'colegio|universidad|curso|coderhouse|academia' then 'Educación'
  when merchant ~* 'sport|gimnasio|gym|fitness|crossfit|pilates' then 'Gimnasio'
  when merchant ~* 'simplicity' then 'Salud'
  when merchant ~* 'pedidosya' then 'Delivery'
  when merchant ~* 'google|apple|youtube|spotify|netflix|suscripcion|streaming' then 'Suscripciones'
  when merchant ~* 'natury|naturgy|energia|agua|internet|telefon|servicio' then 'Servicios'
  when merchant ~* 'pago con qr' then 'Compras'
  else 'Otros'
end;
