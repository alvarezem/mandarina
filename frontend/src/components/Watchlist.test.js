import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Watchlist from './Watchlist'
import ToastProvider from './Toast'
import supabase from '../lib/supabaseClient'

function mockRows(rows) {
  supabase.mockTable('watchlist', rows)
}

function mockQuotes(quotes, rates = {}) {
  supabase.functions.invoke.mockResolvedValue({ data: { quotes, rates }, error: null })
}

describe('Watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRows([])
  })

  const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

  it('muestra el estado vacío sin tickers', async () => {
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no seguís ningún ticker/i)).toBeInTheDocument()
    expect(supabase.from('watchlist').select).toHaveBeenCalled()
  })

  it('lista los tickers con precio y variación coloreada', async () => {
    mockRows([
      { id: 'w1', symbol: 'GGAL', name: 'Banco Galicia', sort_order: 0 },
      { id: 'w2', symbol: 'MELID', name: 'Mercado Libre CEDEAR', sort_order: 1 },
    ])
    mockQuotes({
      GGAL: { price: 30, changePct: 2.5 },
      MELID: { price: 10, changePct: -1.2 },
    })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)

    expect(await screen.findByText('GGAL')).toBeInTheDocument()
    expect(screen.getByText('MELID')).toBeInTheDocument()
    expect(await screen.findByText('$ 30,00')).toBeInTheDocument()
    expect(screen.getByText('▲ 2.50%')).toBeInTheDocument()
    expect(screen.getByText('▼ 1.20%')).toBeInTheDocument()
  })

  it('agrega un ticker y muestra toast de éxito', async () => {
    supabase.mockTable('watchlist', { rows: [], insert: { id: 'w1' } })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    await userEvent.type(screen.getByLabelText('Ticker a seguir'), 'al30')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(supabase.from('watchlist').insert).toHaveBeenCalledWith({
      user_id: 'u1',
      symbol: 'AL30',
      name: 'AL30',
      sort_order: 0,
    })
    expect(await screen.findByText('AL30 agregado a tu watchlist')).toBeInTheDocument()
  })

  it('guarda la etiqueta opcional al agregar', async () => {
    supabase.mockTable('watchlist', { rows: [], insert: { id: 'w1' } })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    await userEvent.type(screen.getByLabelText('Ticker a seguir'), 'AAPL')
    await userEvent.type(screen.getByLabelText('Etiqueta opcional'), 'Apple')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(supabase.from('watchlist').insert).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', name: 'Apple' }),
    )
  })

  it('rechaza un ticker inválido con toast y no inserta', async () => {
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    await userEvent.type(screen.getByLabelText('Ticker a seguir'), 'CÓRDOBA')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText(/Ticker inválido/i)).toBeInTheDocument()
    expect(supabase.from('watchlist').insert).not.toHaveBeenCalled()
  })

  it('avisa con toast cuando el ticker ya está en la lista', async () => {
    mockRows([{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }])
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    await userEvent.type(screen.getByLabelText('Ticker a seguir'), 'ggal')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('GGAL ya está en tu watchlist')).toBeInTheDocument()
    expect(supabase.from('watchlist').insert).not.toHaveBeenCalled()
  })

  it('borra con confirmación inline y muestra toast', async () => {
    supabase.mockTable('watchlist', {
      rows: [{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }],
      deleteError: null,
    })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Quitar GGAL de la watchlist' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(supabase.from('watchlist').delete).toHaveBeenCalledWith()
    expect(await screen.findByText('GGAL eliminado de tu watchlist')).toBeInTheDocument()
  })

  it('cancela la confirmación de borrado', async () => {
    mockRows([{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }])
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Quitar GGAL de la watchlist' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(supabase.from('watchlist').delete).not.toHaveBeenCalled()
    expect(screen.queryByText('¿Quitar?')).not.toBeInTheDocument()
  })

  it('muestra toast de error cuando el borrado falla', async () => {
    supabase.mockTable('watchlist', {
      rows: [{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }],
      deleteError: { message: 'no' },
    })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Quitar GGAL de la watchlist' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(await screen.findByText('No se pudo eliminar el ticker')).toBeInTheDocument()
  })

  it('muestra el error de carga del listado', async () => {
    supabase.mockTable('watchlist', [], { message: 'boom' })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('No se pudo cargar la watchlist')).toBeInTheDocument()
  })

  it('escala el precio a USD usando el rate del toggle', async () => {
    mockRows([{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }])
    mockQuotes({ GGAL: { price: 3000, changePct: 1 } }, { CCL: { price: 1200 } })
    wrap(<Watchlist session={{ user: { id: 'u1' } }} display="USD" rateMode="CCL" />)

    expect(await screen.findByText('$2.50')).toBeInTheDocument()
  })

  it('muestra un error amigable cuando falla el fetch de cotizaciones', async () => {
    mockRows([{ id: 'w1', symbol: 'GGAL', name: 'GGAL', sort_order: 0 }])
    supabase.functions.invoke.mockRejectedValue(new Error('net'))
    wrap(<Watchlist session={{ user: { id: 'u1' } }} />)

    expect(await screen.findByTestId('quotes-error-notice')).toBeInTheDocument()
  })
})
