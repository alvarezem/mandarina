import {
  applyLangToHtml,
  assetTypeLabel,
  categoryLabel,
  detectLang,
  LANG_KEY,
  readLang,
  sideLabel,
  summaryTypeLabel,
  t,
  tn,
  writeLang,
} from './i18n'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    delete navigator.language
    Object.defineProperty(navigator, 'language', { value: 'es-AR', configurable: true })
  })

  it('traduce claves existentes en es y en', () => {
    expect(t('es', 'landing.hero.title')).toBe('A tu plata, sacale todo el jugo')
    expect(t('en', 'landing.hero.title')).toBe('Get the most juice out of your money')
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

  it('pluraliza con variantes one/other según n', () => {
    expect(tn('es', 'resumen.count', 1)).toBe('1 resumen')
    expect(tn('es', 'resumen.count', 3)).toBe('3 resúmenes')
    expect(tn('en', 'resumen.count', 1)).toBe('1 summary')
    expect(tn('en', 'resumen.count', 5)).toBe('5 summaries')
  })

  it('tn interpola {n} y variables extra', () => {
    expect(tn('es', 'pagos.excluidos', 2)).toBe('Se excluyen 2 pagos de tarjeta de los totales')
  })

  it('mapea labels curados de la app (categorías, activos, side, tipo de resumen)', () => {
    expect(categoryLabel('es', 'Supermercados')).toBe('Supermercados')
    expect(categoryLabel('en', 'Supermercados')).toBe('Supermarkets')
    expect(assetTypeLabel('en', 'accion')).toBe('Stock')
    expect(sideLabel('en', 'compra')).toBe('Buy')
    expect(summaryTypeLabel('en', 'Banco')).toBe('Bank')
  })

  it('deja crudos los valores que no están en el dict (datos del usuario)', () => {
    expect(categoryLabel('en', 'MI CATEGORÍA')).toBe('MI CATEGORÍA')
    expect(categoryLabel('en', null)).toBeNull()
    expect(categoryLabel('en', '')).toBe('')
  })
})
