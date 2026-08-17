import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { usePortfolioQuotes } from './usePortfolioQuotes'
import ToastProvider from '../components/Toast'
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

  it('usa la moneda real de la quote para convertir (USD → ARS × rate)', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100, currency: 'USD' } },
        rates: { MEP: { price: 1200 } },
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'VIST', currency: 'ARS' }],
        display: 'ARS',
        rateMode: 'MEP',
      }),
    )
    await waitFor(() => expect(result.current.builtItems[0].price).toBeCloseTo(120000))
    expect(result.current.builtItems[0].valueCurrency).toBe('ARS')
  })

  it('no multiplica una quote ARS aunque el plan la tenga tipeada USD', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100, currency: 'ARS' } },
        rates: { CCL: { price: 1200 } },
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'VIST', currency: 'USD' }],
        display: 'ARS',
        rateMode: 'CCL',
      }),
    )
    await waitFor(() => expect(result.current.builtItems[0].price).toBe(100))
    expect(result.current.builtItems[0].valueCurrency).toBe('ARS')
  })

  it('cae al currency tipeado cuando la quote no trae moneda (fallback histórico)', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100, currency: null } },
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
    await waitFor(() => expect(result.current.builtItems[0].price).toBeCloseTo(100 / 1200))
  })

  it('dedupea, filtra MEP/CCL y corta en 50 los símbolos que envía', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
    const many = Array.from({ length: 55 }, (_, i) => ({ symbol: `T${i}` }))
    const items = [...many, { symbol: 'T0' }, { symbol: 'MEP' }, { symbol: 'CCL' }]
    renderHook(() => usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }))
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled())
    const body = supabase.functions.invoke.mock.calls[0][1].body
    expect(body.symbols).toHaveLength(50)
    expect(new Set(body.symbols).size).toBe(50)
    expect(body.symbols).not.toContain('MEP')
    expect(body.symbols).not.toContain('CCL')
    expect(body.symbols).toContain('T0')
  })

  it('avisa con toast cuando la cartera supera los 50 símbolos', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
    const items = Array.from({ length: 55 }, (_, i) => ({ symbol: `T${i}` }))
    const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>
    renderHook(() => usePortfolioQuotes({ items, display: 'ARS', rateMode: 'CCL' }), { wrapper })
    await waitFor(() => expect(screen.getByText(/Más de 50 activos/)).toBeInTheDocument())
  })

  it('totalCurrency: display cuando hay rate', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100, currency: 'ARS' } },
        rates: { CCL: { price: 1200 } },
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'VIST', currency: 'ARS' }],
        display: 'USD',
        rateMode: 'CCL',
      }),
    )
    await waitFor(() => expect(result.current.totalCurrency).toBe('USD'))
  })

  it('totalCurrency: la moneda única de los activos sin rate', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: { VIST: { price: 100, currency: 'ARS' } },
        rates: {},
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [{ symbol: 'VIST', currency: 'ARS' }],
        display: 'USD',
        rateMode: 'CCL',
      }),
    )
    await waitFor(() => expect(result.current.totalCurrency).toBe('ARS'))
  })

  it('totalCurrency: null cuando sin rate y los activos son de moneda mixta', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: {
          VIST: { price: 100, currency: 'ARS' },
          QQQ: { price: 100, currency: 'USD' },
        },
        rates: {},
        marketClosed: false,
      },
      error: null,
    })
    const { result } = renderHook(() =>
      usePortfolioQuotes({
        items: [
          { symbol: 'VIST', currency: 'ARS' },
          { symbol: 'QQQ', currency: 'ARS' },
        ],
        display: 'USD',
        rateMode: 'CCL',
      }),
    )
    await waitFor(() => expect(result.current.totalCurrency).toBeNull())
  })
})
