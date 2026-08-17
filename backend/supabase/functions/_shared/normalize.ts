// Normalización de encabezados y aliases para el mapeo de columnas.
// Fuente única usada por parse-summary (CSV/XLSX) e import-plan (XLSX).
// - matchExact: el header normalizado ES el alias (parse-summary).
// - matchFuzzy: el header contiene/coincide con el alias como token (import-plan).

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const HEADER_ALIASES = {
  date: [
    'fecha',
    'date',
    'periodo',
    'emision',
    'liquidacion',
    'release date',
    'fecha liberacion',
    'fecha de liberacion',
  ],
  merchant: [
    'descripcion',
    'description',
    'merchant',
    'detalle',
    'comercio',
    'referencia',
    'titular',
    'concepto',
    'transaction type',
    'tipo de transaccion',
  ],
  amount: [
    'importe',
    'monto',
    'amount',
    'valor',
    'cargo',
    'abono',
    'monto usd',
    'monto gs',
    'monto arg',
    'monto total',
    'total',
    'transaction net amount',
    'monto neto',
    'importe neto',
  ],
  symbol: ['ticker', 'symbol', 'simbolo', 'activo', 'codigo', 'especie'],
  target: [
    'meta',
    'target',
    'peso meta',
    'porcentaje meta',
    'meta %',
    '% meta',
    'target weight',
    'peso objetivo',
    '% objetivo',
  ],
  quantity: [
    'tenencia',
    'cantidad',
    'cant',
    'qty',
    'quantity',
    'shares',
    'tenencia (cant)',
    'cantidad (cant)',
    'unidades',
  ],
  currency: ['moneda', 'currency', 'divisa'],
  assetType: ['tipo de activo', 'tipo activo', 'asset type', 'tipo', 'clase'],
}

export function matchExact(cell: unknown, alias: string): boolean {
  return normalizeHeader(cell) === alias
}

export function matchFuzzy(cell: unknown, alias: string): boolean {
  const norm = normalizeHeader(cell)
  if (!norm) return false
  if (norm === alias) return true
  if (!alias.includes(' ')) return norm.split(/[\s()%]+/).includes(alias)
  return norm.includes(alias)
}
