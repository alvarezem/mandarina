const BY_CODE = {
  invalid_credentials: 'Email o contraseña incorrectos',
  weak_password:
    'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
  email_not_confirmed: 'Tu email aún no está confirmado. Revisá tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con este email',
  email_send_rate_limit: 'Esperá unos segundos y probá de nuevo.',
  over_email_send_rate_limit: 'Esperá unos segundos y probá de nuevo.',
}

const BY_MESSAGE = [
  { re: /invalid login credentials/i, message: BY_CODE.invalid_credentials },
  { re: /password.*(weak|at least|requirements)/i, message: BY_CODE.weak_password },
  { re: /email not confirmed/i, message: BY_CODE.email_not_confirmed },
  { re: /user already registered/i, message: BY_CODE.user_already_exists },
  { re: /rate limit/i, message: BY_CODE.email_send_rate_limit },
]

export function authErrorToSpanish(error) {
  if (!error) return null
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  if (error.message) {
    const match = BY_MESSAGE.find(({ re }) => re.test(error.message))
    if (match) return match.message
  }
  return error.message || 'Ocurrió un error. Probá de nuevo.'
}
