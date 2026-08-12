import { act, renderHook, waitFor } from '@testing-library/react'
import { usePortfolioQuotes } from './usePortfolioQuotes'
import supabase from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    functions: { invoke: vi.fn() },
  },
}))

const items = [{ symbol: 'VIST' }]

describe('usePortfolioQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marca quotesError cuando el fetch inicial falla', async () => {
    supabase.functions.invoke.mockRejectedValue(new Error('red'))
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }),
    )
    await waitFor(() => expect(result.current.quotesError).toBe(true))
    expect(result.current.quotes).toEqual({})
  })

  it('limpia quotesError al refrescar con éxito', async () => {
    supabase.functions.invoke
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce({ data: { quotes: { VIST: { price: 100 } }, rates: {} }, error: null })
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }),
    )
    await waitFor(() => expect(result.current.quotesError).toBe(true))
    act(() => result.current.refreshQuotes())
    await waitFor(() => expect(result.current.quotesError).toBe(false))
    expect(result.current.quotes).toEqual({ VIST: { price: 100 } })
  })
})
