import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvestmentPlan from './InvestmentPlan'
import ToastProvider from './Toast'

jest.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}))

const supabase = require('../lib/supabaseClient').default

function mockPlan(items, prices = {}) {
  const order = jest.fn().mockResolvedValue({ data: items, error: null })
  const select = jest.fn().mockReturnValue({ order })
  const update = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
  const insert = jest.fn().mockResolvedValue({ error: null })
  const del = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
  supabase.from.mockImplementation((table) =>
    table === 'portfolio_plan' ? { select, update, insert, delete: del } : {},
  )
  supabase.functions.invoke.mockResolvedValue({
    data: {
      quotes: Object.fromEntries(
        Object.entries(prices).map(([symbol, price]) => [
          symbol,
          { price, changePct: 1.2, source: 'yahoo' },
        ]),
      ),
      rates: { MEP: { price: 1200 }, CCL: { price: 1213.13 } },
    },
    error: null,
  })
}

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

describe('InvestmentPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra el estado vacío sin plan cargado', async () => {
    mockPlan([], {})
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no cargaste tu plan/i)).toBeInTheDocument()
  })

  it('lista los activos con sus cotizaciones y metas', async () => {
    mockPlan(
      [
        { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 9, quantity: 8, manual_price: null, sort_order: 0 },
        { id: '2', symbol: 'QQQ', name: 'QQQ', asset_type: 'cedear', currency: 'ARS', target_weight: 14, quantity: 9, manual_price: null, sort_order: 1 },
      ],
      { VIST: 34920, QQQ: 56400 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('VIST')).toBeInTheDocument()
    expect(screen.getByText('QQQ')).toBeInTheDocument()
    expect(screen.getByText('Total cartera')).toBeInTheDocument()
    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { symbols: ['VIST', 'QQQ'] },
      }),
    )
  })

  it('agrega un activo nuevo', async () => {
    mockPlan([], {})
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText(/Todavía no cargaste tu plan/i)

    await userEvent.click(screen.getByRole('button', { name: /Agregar activo/i }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Ticker' }), 'GGAL')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Meta %' }), '3')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Cantidad' }), '14')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar activo' }))

    await waitFor(() =>
      expect(supabase.from('portfolio_plan').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          symbol: 'GGAL',
          target_weight: 3,
          quantity: 14,
          asset_type: 'otro',
          currency: 'ARS',
        }),
      ),
    )
  })

  it('muestra la cobertura del presupuesto ordenada por faltante desc', async () => {
    mockPlan(
      [
        { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 50, quantity: 1, manual_price: null, sort_order: 0 },
        { id: '2', symbol: 'SPY', name: 'SPY', asset_type: 'cedear', currency: 'ARS', target_weight: 50, quantity: 1, manual_price: null, sort_order: 1 },
      ],
      { VIST: 1000, SPY: 3000 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    await userEvent.type(screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }), '1000')
    expect(await screen.findByText('Comprar')).toBeInTheDocument()
    expect(screen.getByText(/cubrís/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() =>
      expect(supabase.from('portfolio_plan').update).toHaveBeenCalledWith({ quantity: 2 }),
    )
  })
})
