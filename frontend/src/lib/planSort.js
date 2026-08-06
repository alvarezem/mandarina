export const DEFAULT_PLAN_SORT = { key: 'target_weight', dir: 'desc' }

export const SORT_DEFAULT_DIR = {
  symbol: 'asc',
  price: 'desc',
  quantity: 'desc',
  value: 'desc',
  actualPct: 'desc',
  target_weight: 'desc',
  gap: 'desc',
  buy: 'desc',
  changePct: 'desc',
}

export const SORT_DIRS = ['asc', 'desc']

const SORT_KEYS = new Set([
  'symbol',
  'price',
  'quantity',
  'value',
  'actualPct',
  'target_weight',
  'gap',
  'buy',
  'changePct',
])

export function isValidSort(value) {
  return (
    value != null &&
    typeof value.key === 'string' &&
    SORT_KEYS.has(value.key) &&
    SORT_DIRS.includes(value.dir)
  )
}

export function loadPlanSort(userId) {
  try {
    const raw = localStorage.getItem(`mandarina:plan:sort:${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidSort(parsed)) return parsed
    }
  } catch {
    // fallback al default
  }
  return DEFAULT_PLAN_SORT
}

export function savePlanSort(userId, sort) {
  try {
    localStorage.setItem(`mandarina:plan:sort:${userId}`, JSON.stringify(sort))
  } catch {
    // almacenamiento no disponible
  }
}
