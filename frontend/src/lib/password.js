export function strengthOf(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score)
}

export const STRENGTH_LABEL = ['', 'Débil', 'Media', 'Buena', 'Fuerte']
export const STRENGTH_BAR = ['', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

export function validatePassword(password) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'La contraseña debe incluir letras y números'
  return null
}
