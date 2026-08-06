// Histórico de precios para el gráfico de un activo.
// El mapeo rango -> resolución/ventana vive en la edge `quotes` (BYMA).

export const RANGES = [
  { key: '1S', label: '1S' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1A', label: '1A' },
]

// Normaliza la respuesta de la edge `quotes` (body.history) a una lista de
// puntos {t (ms), o, h, l, c, v} ordenada ascendente. Tolera no_data y payloads
// parciales.
export function normalizeHistory(data) {
  const points = data?.points
  if (!Array.isArray(points) || points.length === 0) return []
  return points
    .map((p) => ({
      t: Number(p.t) || 0,
      o: p.o == null ? null : Number(p.o),
      h: p.h == null ? null : Number(p.h),
      l: p.l == null ? null : Number(p.l),
      c: p.c == null ? null : Number(p.c),
      v: Number(p.v) || 0,
    }))
    .filter((p) => p.t > 0)
    .sort((a, b) => a.t - b.t)
}

// Formatea la etiqueta del eje x según el rango (corto -> día/mes, largo -> mes/año).
export function formatPointDate(ms, range) {
  const d = new Date(ms)
  if (range === '1A') {
    return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
