import { act, renderHook, waitFor } from '@testing-library/react'
import { usePortfolioQuotes } from './usePortfolioQuotes'
import supabase from '../lib/supabaseClient'

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

  it('setea quotes, rates y notifica mercado cerrado en el fetch inicial', async () => {
    const onMarketClosed = vi.fn()
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100 } },
        rates: { CCL: { price: 1200 } },
        marketClosed: true,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL', onMarketClosed }),
    )
    await waitFor(() => expect(result.current.quotes).toEqual({ VIST: { price: 100 } }))
    expect(result.current.rates.CCL).toEqual({ price: 1200 })
    expect(onMarketClosed).toHaveBeenCalledWith(true)
  })

  it('resuelve precio de MEP y CCL contra rates', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: {},
        rates: { MEP: { price: 1300 }, CCL: { price: 1200 } },
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'MEP' }, { symbol: 'CCL' }],
        display: 'ARS',
        rateMode: 'CCL',
      }),
    )
    await waitFor(() => expect(result.current.rates.MEP).toEqual({ price: 1300 }))
    expect(result.current.resolvePrice({ symbol: 'MEP' })).toBe(1300)
    expect(result.current.resolvePrice({ symbol: 'CCL' })).toBe(1200)
    expect(result.current.resolvePrice({ symbol: 'OTRO' })).toBeNull()
  })

  it('escala el precio ARS a USD dividiendo y a MEP multiplicando cuando corresponde', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100 } },
        rates: { MEP: { price: 1200 } },
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'VIST', currency: 'ARS' }],
        display: 'USD',
        rateMode: 'MEP',
      }),
    )
    await waitFor(() => expect(result.current.rates.MEP).toBeTruthy())
    expect(result.current.resolvePrice({ symbol: 'VIST' })).toBe(100)
    const scaled = result.current.builtItems.find((i) => i.symbol === 'VIST')
    expect(scaled.price).toBeCloseTo(100 / 1200)
  })

  it('no escala cuando no hay rate y conserva el precio original', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { quotes: { VIST: { price: 100 } }, rates: {}, marketClosed: false },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }),
    )
    await waitFor(() => expect(result.current.resolvePrice({ symbol: 'VIST' })).toBe(100))
    expect(result.current.rates.CCL).toBeNull()
    const scaled = result.current.builtItems.find((i) => i.symbol === 'VIST')
    expect(scaled.price).toBe(100)
  })

  it('refreshQuotes deja el estado intacto sin símbolos y avisa error en el catch', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { quotes: {}, rates: {} }, error: null })
      .mockRejectedValueOnce(new Error('net'))
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }),
    )
    await waitFor(() => expect(result.current.rates.CCL).toBeNull())

    act(() => result.current.refreshQuotes())
    await waitFor(() => expect(result.current.quotesError).toBe(true))
  })

  it('refreshQuotes ignora un payload sin data', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() =>
      usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }),
    )
    await waitFor(() => expect(result.current.quotes).toEqual({}))
    act(() => result.current.refreshQuotes())
    expect(result.current.quotesError).toBe(false)
  })
})
