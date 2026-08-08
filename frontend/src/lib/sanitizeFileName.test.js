import { sanitizeFileName, sanitizeStoragePath, uniqueStoragePath } from './sanitizeFileName'

describe('sanitizeFileName', () => {
  it('quita diacríticos', () => {
    expect(sanitizeFileName('Nación.csv')).toBe('Nacion.csv')
    expect(sanitizeFileName('período-eñe.pdf')).toBe('periodo-ene.pdf')
  })

  it('reemplaza espacios y símbolos por guion bajo', () => {
    expect(sanitizeFileName('resumen julio 2026.csv')).toBe('resumen_julio_2026.csv')
    expect(sanitizeFileName('tc(visa).xlsx')).toBe('tc_visa.xlsx')
  })

  it('preserva la extensión y la aplica solo al final', () => {
    expect(sanitizeFileName('informe.marzo.csv')).toBe('informe.marzo.csv')
    expect(sanitizeFileName('resumen.pdf')).toBe('resumen.pdf')
  })

  it('usa un fallback cuando el nombre queda vacío', () => {
    expect(sanitizeFileName('😀😀.csv')).toBe('resumen.csv')
    expect(sanitizeFileName('')).toBe('resumen')
    expect(sanitizeFileName(null)).toBe('resumen')
  })

  it('mantiene nombres ASCII válidos intactos', () => {
    expect(sanitizeFileName('VISA-julio_2026.csv')).toBe('VISA-julio_2026.csv')
  })
})

describe('sanitizeStoragePath', () => {
  it('arma el path bajo la carpeta del usuario', () => {
    expect(sanitizeStoragePath('u1', 'Nación.csv')).toBe('u1/Nacion.csv')
  })
})

describe('uniqueStoragePath', () => {
  it('no cambia el path si no hay colisión', () => {
    expect(uniqueStoragePath('u1', 'Nacion.csv', ['u1/otro.csv'])).toBe('u1/Nacion.csv')
  })

  it('agrega sufijo incremental cuando el path ya existe', () => {
    const existing = ['u1/Nacion.csv', 'u1/Nacion_1.csv']
    expect(uniqueStoragePath('u1', 'Nación.csv', existing)).toBe('u1/Nacion_2.csv')
  })

  it('dedupea nombres sanitizados distintos que colisionan', () => {
    expect(uniqueStoragePath('u1', 'Nación.csv', ['u1/Nacion.csv'])).toBe('u1/Nacion_1.csv')
  })
})
