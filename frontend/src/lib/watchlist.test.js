import { normalizeSymbol, validateSymbol } from './watchlist'

describe('normalizeSymbol', () => {
  it('pasa a mayúsculas y quita espacios', () => {
    expect(normalizeSymbol('  gg.al  ')).toBe('GG.AL')
    expect(normalizeSymbol('al 30')).toBe('AL30')
  })

  it('tolera valores vacíos o no string', () => {
    expect(normalizeSymbol('')).toBe('')
    expect(normalizeSymbol(null)).toBe('')
    expect(normalizeSymbol(undefined)).toBe('')
  })
})

describe('validateSymbol', () => {
  it('acepta tickers válidos', () => {
    expect(validateSymbol('AAPL')).toBe(true)
    expect(validateSymbol('al30')).toBe(true)
    expect(validateSymbol('MELID')).toBe(true)
    expect(validateSymbol('+RF123')).toBe(true)
    expect(validateSymbol('  ggal  ')).toBe(true)
  })

  it('rechaza vacíos, largos, caracteres raros y los dólares MEP/CCL', () => {
    expect(validateSymbol('')).toBe(false)
    expect(validateSymbol('   ')).toBe(false)
    expect(validateSymbol(null)).toBe(false)
    expect(validateSymbol('A'.repeat(13))).toBe(false)
    expect(validateSymbol('CÓRDOBA')).toBe(false)
    expect(validateSymbol('MEP')).toBe(false)
    expect(validateSymbol('CCL')).toBe(false)
    expect(validateSymbol('  mep  ')).toBe(false)
  })
})
