import { authErrorToMessage, authErrorToSpanish } from './authErrors'

describe('authErrorToSpanish', () => {
  it('mapea por código los errores conocidos', () => {
    expect(authErrorToSpanish({ code: 'invalid_credentials' })).toBe(
      'Email o contraseña incorrectos',
    )
    expect(authErrorToSpanish({ code: 'weak_password' })).toBe(
      'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
    )
    expect(authErrorToSpanish({ code: 'email_not_confirmed' })).toBe(
      'Tu email aún no está confirmado. Revisá tu bandeja de entrada.',
    )
    expect(authErrorToSpanish({ code: 'user_already_exists' })).toBe(
      'Ya existe una cuenta con este email',
    )
    expect(authErrorToSpanish({ code: 'over_email_send_rate_limit' })).toBe(
      'Esperá unos segundos y probá de nuevo.',
    )
    expect(authErrorToSpanish({ code: 'same_password' })).toBe(
      'La contraseña nueva debe ser diferente de la actual',
    )
  })

  it('mapea por texto de mensaje como fallback', () => {
    expect(authErrorToSpanish({ message: 'Invalid login credentials' })).toBe(
      'Email o contraseña incorrectos',
    )
    expect(authErrorToSpanish({ message: 'User already registered' })).toBe(
      'Ya existe una cuenta con este email',
    )
    expect(authErrorToSpanish({ message: 'Password should be at least 8 characters' })).toBe(
      'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
    )
    expect(
      authErrorToSpanish({
        message: 'New password should be different from the old password.',
      }),
    ).toBe('La contraseña nueva debe ser diferente de la actual')
  })

  it('devuelve el mensaje original para errores desconocidos', () => {
    expect(authErrorToSpanish({ message: 'Algo raro pasó' })).toBe('Algo raro pasó')
  })

  it('devuelve null sin error y un mensaje genérico sin datos', () => {
    expect(authErrorToSpanish(null)).toBeNull()
    expect(authErrorToSpanish({})).toBe('Ocurrió un error. Probá de nuevo.')
  })
})

describe('authErrorToMessage', () => {
  it('traduce same_password en es y en', () => {
    expect(authErrorToMessage({ code: 'same_password' }, 'es')).toBe(
      'La contraseña nueva debe ser diferente de la actual',
    )
    expect(authErrorToMessage({ code: 'same_password' }, 'en')).toBe(
      'The new password must be different from the current one',
    )
    expect(
      authErrorToMessage(
        { message: 'New password should be different from the old password.' },
        'en',
      ),
    ).toBe('The new password must be different from the current one')
  })
})
