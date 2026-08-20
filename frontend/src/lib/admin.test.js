import { canRequestPro, initialsOf, isPendingRequest, requestStatus } from './admin'

describe('canRequestPro', () => {
  it('devuelve false si ya es Pro', () => {
    expect(canRequestPro({ isPro: true, request: null })).toBe(false)
    expect(canRequestPro({ isPro: true, request: { status: 'dismissed' } })).toBe(false)
  })

  it('devuelve true sin solicitud', () => {
    expect(canRequestPro({ isPro: false, request: null })).toBe(true)
  })

  it('devuelve true si la solicitud fue descartada (puede volver a pedir)', () => {
    expect(canRequestPro({ isPro: false, request: { status: 'dismissed' } })).toBe(true)
  })

  it('devuelve false con solicitud pendiente o aprobada', () => {
    expect(canRequestPro({ isPro: false, request: { status: 'pending' } })).toBe(false)
    expect(canRequestPro({ isPro: false, request: { status: 'approved' } })).toBe(false)
  })
})

describe('isPendingRequest / requestStatus', () => {
  it('detecta solo pending', () => {
    expect(isPendingRequest({ status: 'pending' })).toBe(true)
    expect(isPendingRequest({ status: 'approved' })).toBe(false)
    expect(isPendingRequest(null)).toBe(false)
  })

  it('expone el status o null', () => {
    expect(requestStatus({ status: 'pending' })).toBe('pending')
    expect(requestStatus(null)).toBeNull()
  })
})

describe('initialsOf', () => {
  it('usa 2 letras del local-part del email', () => {
    expect(initialsOf('juan.perez@gmail.com')).toBe('JU')
    expect(initialsOf('a@b.com')).toBe('A')
    expect(initialsOf('ana-maria@x.com')).toBe('AN')
  })

  it('usa dígitos y cae a ? sin email', () => {
    expect(initialsOf('123@x.com')).toBe('12')
    expect(initialsOf('')).toBe('?')
    expect(initialsOf(null)).toBe('?')
  })
})
