import { DEFAULT_PLAN_SORT, isValidSort, loadPlanSort, savePlanSort } from './planSort'

describe('planSort', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('devuelve el default % Meta desc sin preferencia guardada', () => {
    expect(loadPlanSort('u1')).toEqual({ key: 'target_weight', dir: 'desc' })
  })

  it('persiste y recupera la preferencia de orden', () => {
    savePlanSort('u1', { key: 'price', dir: 'desc' })
    expect(loadPlanSort('u1')).toEqual({ key: 'price', dir: 'desc' })
  })

  it('ignora valores inválidos o corruptos y vuelve al default', () => {
    localStorage.setItem('mandarina:plan:sort:u1', '{"key":"price","dir":"diag"}')
    expect(loadPlanSort('u1')).toEqual(DEFAULT_PLAN_SORT)
    localStorage.setItem('mandarina:plan:sort:u1', 'no-json')
    expect(loadPlanSort('u1')).toEqual(DEFAULT_PLAN_SORT)
  })

  it('separa la preferencia por usuario', () => {
    savePlanSort('u1', { key: 'price', dir: 'desc' })
    expect(loadPlanSort('u2')).toEqual(DEFAULT_PLAN_SORT)
  })

  it('valida la forma de la preferencia', () => {
    expect(isValidSort({ key: 'price', dir: 'asc' })).toBe(true)
    expect(isValidSort({ key: 'target_weight', dir: 'desc' })).toBe(true)
    expect(isValidSort({ key: 'nope', dir: 'asc' })).toBe(false)
    expect(isValidSort({ key: 'price', dir: 'sideways' })).toBe(false)
    expect(isValidSort(null)).toBe(false)
  })
})
