import { act, renderHook, waitFor } from '@testing-library/react'
import { useWatchQuotes } from './useWatchQuotes'
import supabase from '../lib/supabaseClient'

describe('useWatchQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invoca la edge con los símbolos y guarda el mapa de quotes', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { GGAL: { price: 30 }, VIST: { price: 100 } },
        rates: { MEP: { price: 1300 } },
      },
      error: null,
    })
    const { result } = renderHook(() => useWatchQuotes({ symbols: ['GGAL', 'VIST'] }))
    await waitFor(() =>
      expect(result.current.quotes).toEqual({ GGAL: { price: 30 }, VIST: { price: 100 } }),
    )
    expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
      body: { symbols: ['GGAL', 'VIST'] },
    })
    expect(result.current.rates.MEP).toEqual({ price: 1300 })
    expect(result.current.quotesError).toBe(false)
  })

  it('marca quotesError cuando el fetch inicial falla', async () => {
    supabase.functions.invoke.mockRejectedValue(new Error('red'))
    const { result } = renderHook(() => useWatchQuotes({ symbols: ['GGAL'] }))
    await waitFor(() => expect(result.current.quotesError).toBe(true))
    expect(result.current.quotes).toEqual({})
  })

  it('limpia quotesError y actualiza al refrescar con éxito', async () => {
    supabase.functions.invoke
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce({ data: { quotes: { GGAL: { price: 31 } } }, error: null })
    const { result } = renderHook(() => useWatchQuotes({ symbols: ['GGAL'] }))
    await waitFor(() => expect(result.current.quotesError).toBe(true))
    act(() => result.current.refreshQuotes())
    await waitFor(() => expect(result.current.quotesError).toBe(false))
    expect(result.current.quotes).toEqual({ GGAL: { price: 31 } })
  })

  it('no invoca la edge cuando no hay símbolos', () => {
    const { result } = renderHook(() => useWatchQuotes({ symbols: [] }))
    expect(result.current.quotes).toEqual({})
    expect(result.current.quotesError).toBe(false)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('refreshQuotes ignora un payload sin data', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useWatchQuotes({ symbols: ['GGAL'] }))
    await waitFor(() => expect(result.current.quotes).toEqual({}))
    act(() => result.current.refreshQuotes())
    expect(result.current.quotesError).toBe(false)
  })

  it('refreshQuotes no hace nada sin símbolos', async () => {
    const { result } = renderHook(() => useWatchQuotes({ symbols: [] }))
    act(() => result.current.refreshQuotes())
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })
})
