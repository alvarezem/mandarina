import { normalizeHistory, formatPointDate, RANGES } from './history'

describe('normalizeHistory', () => {
  it('mapea los arrays OHLCV a puntos y ordena por fecha', () => {
    const points = normalizeHistory({
      points: [
        { t: 2000, o: 11, h: 13, l: 10, c: 13, v: 120 },
        { t: 1000, o: 10, h: 12, l: 9, c: 11, v: 100 },
      ],
    })
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ t: 1000, o: 10, h: 12, l: 9, c: 11, v: 100 })
    expect(points[1].c).toBe(13)
  })

  it('tolera no_data y payloads vacíos', () => {
    expect(normalizeHistory({ points: [] })).toEqual([])
    expect(normalizeHistory({})).toEqual([])
    expect(normalizeHistory(undefined)).toEqual([])
  })

  it('descarta puntos sin timestamp', () => {
    const points = normalizeHistory({ points: [{ t: 0, c: 5 }, { t: 1000, c: 7 }] })
    expect(points).toHaveLength(1)
    expect(points[0].c).toBe(7)
  })
})

describe('formatPointDate', () => {
  it('día/mes para rangos cortos y mes/año para 1A', () => {
    const ms = new Date(2026, 6, 15, 12, 0).getTime()
    expect(formatPointDate(ms, '1M')).toMatch(/^\d{1,2}\/\d{1,2}$/)
    expect(formatPointDate(ms, '1A')).toMatch(/jul/i)
  })
})

describe('RANGES', () => {
  it('expone 1S/1M/3M/1A', () => {
    expect(RANGES.map((r) => r.key)).toEqual(['1S', '1M', '3M', '1A'])
  })
})
