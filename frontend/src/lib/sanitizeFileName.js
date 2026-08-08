export function sanitizeFileName(name) {
  const input = String(name ?? '').trim()
  if (!input) return 'resumen'
  const dot = input.lastIndexOf('.')
  const base = dot > 0 ? input.slice(0, dot) : input
  const ext = dot > 0 ? input.slice(dot) : ''
  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 230)
  const cleanExt = ext
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9.]/g, '')
    .slice(0, 20)
  const baseName = cleanBase || 'resumen'
  return cleanExt && cleanExt !== '.' ? `${baseName}${cleanExt}` : baseName
}

export function sanitizeStoragePath(userId, name) {
  return `${userId}/${sanitizeFileName(name)}`
}

export function uniqueStoragePath(userId, name, existingPaths = []) {
  const base = sanitizeStoragePath(userId, name)
  if (!existingPaths.includes(base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  for (let i = 1; i < 1000; i++) {
    const candidate = `${stem}_${i}${ext}`
    if (!existingPaths.includes(candidate)) return candidate
  }
  return `${stem}_${Date.now()}${ext}`
}
