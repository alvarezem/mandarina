import { applyLangToHtml, detectLang, LANG_KEY, readLang, t, writeLang } from './i18n'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    delete navigator.language
    Object.defineProperty(navigator, 'language', { value: 'es-AR', configurable: true })
  })

  it('traduce claves existentes en es y en', () => {
    expect(t('es', 'landing.hero.title')).toBe('A tu plata, sacale todo el jugo')
    expect(t('en', 'landing.hero.title')).toBe('Get the most out of your money')
    expect(t('en', 'auth.submit.login')).toBe('Sign in')
  })

  it('interpola variables con {var}', () => {
    expect(t('en', 'auth.confirmEmail', { email: 'a@b.com' })).toBe(
      'We sent an email to a@b.com to confirm your account. Check your inbox.',
    )
  })

  it('cae a es si la clave falta en el idioma pedido', () => {
    expect(t('fr', 'landing.hero.title')).toBe('A tu plata, sacale todo el jugo')
  })

  it('devuelve la clave si no existe en ningún idioma', () => {
    expect(t('es', 'clave.inexistente')).toBe('clave.inexistente')
  })

  it('no interpola si no se pasan variables', () => {
    expect(t('es', 'auth.confirmEmail')).toBe(
      'Te enviamos un email a {email} para confirmar tu cuenta. Revisá tu bandeja de entrada.',
    )
  })

  it('detecta en si navigator.language arranca con en', () => {
    expect(detectLang()).toBe('es')
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    expect(detectLang()).toBe('en')
  })

  it('lee y escribe la preferencia en localStorage', () => {
    expect(readLang()).toBe('es')
    writeLang('en')
    expect(localStorage.getItem(LANG_KEY)).toBe('en')
    expect(readLang()).toBe('en')
  })

  it('aplica el lang al documento', () => {
    document.documentElement.lang = 'es'
    applyLangToHtml('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
