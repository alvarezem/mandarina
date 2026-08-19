import { describe, expect, it } from 'vitest'
import { isProActive } from './subscriptions'

describe('isProActive', () => {
  it('devuelve true para status active', () => {
    expect(isProActive({ status: 'active' })).toBe(true)
  })

  it('devuelve false para status que no activan', () => {
    expect(isProActive({ status: 'canceled' })).toBe(false)
    expect(isProActive({ status: 'past_due' })).toBe(false)
    expect(isProActive({ status: 'expired' })).toBe(false)
  })

  it('devuelve false para null/undefined/vacío', () => {
    expect(isProActive(null)).toBe(false)
    expect(isProActive(undefined)).toBe(false)
    expect(isProActive({})).toBe(false)
  })
})
