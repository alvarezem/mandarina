import { describe, it, expect } from 'vitest'
import { fmt, fmtCompact, fmtPct } from './format'

describe('fmt', () => {
  it('formatea ARS con 2 decimales fijos', () => {
    expect(fmt(1200)).toContain('1.200,00')
    expect(fmt(34920.5)).toContain('34.920,50')
  })

  it('formatea USD con 2 decimales fijos', () => {
    expect(fmt(1213.13, 'USD')).toBe('$1,213.13')
    expect(fmt(5, 'USD')).toBe('$5.00')
  })

  it('devuelve — para null/undefined', () => {
    expect(fmt(null)).toBe('—')
    expect(fmt(undefined)).toBe('—')
    expect(fmt(null, 'USD')).toBe('—')
  })
})

describe('fmtCompact', () => {
  it('formatea montos en notación compacta', () => {
    expect(fmtCompact(1250000)).toContain('1,3')
    expect(fmtCompact(1250000)).toContain('M')
    expect(fmtCompact(5000, 'USD')).toBe('$5K')
  })
})

describe('fmtPct', () => {
  it('formatea porcentajes con 1 decimal como máximo', () => {
    expect(fmtPct(3.14)).toBe('3,1%')
    expect(fmtPct(-0.5)).toBe('-0,5%')
    expect(fmtPct(0)).toBe('0%')
  })

  it('tolera null/undefined', () => {
    expect(fmtPct(null)).toBe('0%')
    expect(fmtPct(undefined)).toBe('0%')
  })
})
