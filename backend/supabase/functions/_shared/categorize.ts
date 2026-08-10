// Fuente única de las reglas de categorización.
// MANTENER EN SYNC con migrations/0006_reclassify.sql (mismo regex y orden).
// El orden importa: la primera regla que matchee gana; los catch-alls van al final.

export const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/impuesto|iibb|iva rg|db\.rg|cr\.rg/i, 'Impuestos'],
  [/rendimiento|bull market|broker/i, 'Inversiones'],
  [/su pago|pago en pesos|pago en usd/i, 'Pagos'],
  [/transferencia recibida/i, 'Ingresos'],
  [/transferencia enviada/i, 'Transferencias'],
  [/seguro/i, 'Seguros'],
  [/axion|ypf|nafta|combustible|shell|petrobras|gasoil/i, 'Combustible'],
  [/carrefour|coto|jumbo|changomas|supermercado|walmart|makro/i, 'Supermercados'],
  [/cinemark|hoyts|cine|teatro|ticketek|showcase/i, 'Entretenimiento'],
  [/grido|mostaza|mcdonald|burger king|rotiseria|parrilla|pizzeria|restaurant|heladeria/i, 'Gastronomía'],
  [/uber|cabify|didi|taxi|subte|colectivo/i, 'Transporte'],
  [/farmacity|farmacia|drogueria/i, 'Farmacias'],
  [/colegio|universidad|curso|coderhouse|academia/i, 'Educación'],
  [/sport|gimnasio|gym|fitness|crossfit|pilates/i, 'Gimnasio'],
  [/simplicity/i, 'Salud'],
  [/pedidosya/i, 'Delivery'],
  [/google|apple|youtube|spotify|netflix|suscripcion|streaming/i, 'Suscripciones'],
  [/natury|naturgy|energia|agua|internet|telefon|telecom|telecentro|fibertel|movistar|claro|servicio/i, 'Servicios'],
  [/pago con qr/i, 'Compras'],
]

export function categorize(merchant: string): string {
  const rule = CATEGORY_RULES.find(([re]) => re.test(merchant))
  return rule ? rule[1] : 'Otros'
}
