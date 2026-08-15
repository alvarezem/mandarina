const BY_CODE = {
  es: {
    invalid_credentials: 'Email o contraseña incorrectos',
    weak_password:
      'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
    email_not_confirmed: 'Tu email aún no está confirmado. Revisá tu bandeja de entrada.',
    user_already_exists: 'Ya existe una cuenta con este email',
    email_send_rate_limit: 'Esperá unos segundos y probá de nuevo.',
    over_email_send_rate_limit: 'Esperá unos segundos y probá de nuevo.',
  },
  en: {
    invalid_credentials: 'Incorrect email or password',
    weak_password:
      'Password does not meet the requirements: at least 8 characters with letters and numbers',
    email_not_confirmed: 'Your email is not confirmed yet. Check your inbox.',
    user_already_exists: 'An account with this email already exists',
    email_send_rate_limit: 'Wait a few seconds and try again.',
    over_email_send_rate_limit: 'Wait a few seconds and try again.',
  },
}

const BY_MESSAGE = {
  es: [
    { re: /invalid login credentials/i, message: BY_CODE.es.invalid_credentials },
    { re: /password.*(weak|at least|requirements)/i, message: BY_CODE.es.weak_password },
    { re: /email not confirmed/i, message: BY_CODE.es.email_not_confirmed },
    { re: /user already registered/i, message: BY_CODE.es.user_already_exists },
    { re: /rate limit/i, message: BY_CODE.es.email_send_rate_limit },
  ],
  en: [
    { re: /invalid login credentials/i, message: BY_CODE.en.invalid_credentials },
    { re: /password.*(weak|at least|requirements)/i, message: BY_CODE.en.weak_password },
    { re: /email not confirmed/i, message: BY_CODE.en.email_not_confirmed },
    { re: /user already registered/i, message: BY_CODE.en.user_already_exists },
    { re: /rate limit/i, message: BY_CODE.en.email_send_rate_limit },
  ],
}

const FALLBACK = {
  es: 'Ocurrió un error. Probá de nuevo.',
  en: 'Something went wrong. Try again.',
}

export function authErrorToMessage(error, lang = 'es') {
  const safeLang = lang === 'en' ? 'en' : 'es'
  if (!error) return null
  const codes = BY_CODE[safeLang]
  if (error.code && codes[error.code]) return codes[error.code]
  if (error.message) {
    const match = BY_MESSAGE[safeLang].find(({ re }) => re.test(error.message))
    if (match) return match.message
  }
  return error.message || FALLBACK[safeLang]
}

export function authErrorToSpanish(error) {
  return authErrorToMessage(error, 'es')
}
