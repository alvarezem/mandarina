// Lógica pura del flujo de Pro (solicitud en-app + gestión admin). El estado
// autoritativo vive en Postgres (`pro_requests` / `subscriptions`); acá solo las
// reglas de UI que el frontend deriva de esas filas.
export const PRO_REQUEST_STATUSES = ['pending', 'approved', 'dismissed']

export function isPendingRequest(request) {
  return Boolean(request && request.status === 'pending')
}

// El botón "Solicitar Pro" se habilita solo si el usuario no es Pro y no tiene
// una solicitud vigente (pending/approved bloquean; dismissed vuelve a habilitar).
export function canRequestPro({ isPro, request }) {
  if (isPro) return false
  if (request) return request.status === 'dismissed'
  return true
}

export function requestStatus(request) {
  return request?.status ?? null
}

// Iniciales para el avatar del header: 2 letras del local-part del email.
export function initialsOf(email) {
  if (!email) return '?'
  const local = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
  return local.slice(0, 2).toUpperCase() || '?'
}
