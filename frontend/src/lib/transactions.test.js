import { describe, it, expect, vi } from 'vitest'
import { fetchAllTransactions, FETCH_PAGE_SIZE } from './transactions'

function rowsOf(n) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i) }))
}

// Fake del query builder de supabase: cada `.range()` resuelve el siguiente
// chunk y registra los rangos pedidos.
function makeBuilder(chunks) {
  const calls = []
  let i = 0
  const builder = {
    range: vi.fn((start, end) => {
      calls.push([start, end])
      return Promise.resolve({ data: chunks[i++] ?? [], error: null })
    }),
  }
  builder.calls = calls
  return builder
}

describe('fetchAllTransactions', () => {
  it('concatena páginas completas y corta en la página corta', async () => {
    const builder = makeBuilder([rowsOf(FETCH_PAGE_SIZE), rowsOf(FETCH_PAGE_SIZE), rowsOf(500)])
    const all = await fetchAllTransactions(builder)
    expect(all).toHaveLength(FETCH_PAGE_SIZE * 2 + 500)
    expect(builder.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('una sola página cuando hay menos filas que el tope', async () => {
    const builder = makeBuilder([rowsOf(42)])
    const all = await fetchAllTransactions(builder)
    expect(all).toHaveLength(42)
    expect(builder.calls).toEqual([[0, 999]])
  })

  it('consulta una vez más cuando una página sale exacta y corta ante la vacía', async () => {
    const builder = makeBuilder([rowsOf(FETCH_PAGE_SIZE), []])
    const all = await fetchAllTransactions(builder)
    expect(all).toHaveLength(FETCH_PAGE_SIZE)
    expect(builder.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ])
  })

  it('propaga el error del builder', async () => {
    const builder = {
      range: vi.fn(() => Promise.resolve({ data: null, error: new Error('red') })),
    }
    await expect(fetchAllTransactions(builder)).rejects.toThrow('red')
  })
})
