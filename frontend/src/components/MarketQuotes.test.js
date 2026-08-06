import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarketQuotes from './MarketQuotes'
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

jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="chart-doughnut" />,
}))

const supabase = require('../lib/supabaseClient').default

function mockPlan(items, quotes = {}, rates = {}) {
  const order = jest.fn().mockResolvedValue({ data: items, error: null })
  const select = jest.fn().mockReturnValue({ order })
  supabase.from.mockImplementation((table) =>
    table === 'portfolio_plan' ? { select } : {},
  )
  supabase.functions.invoke.mockResolvedValue({
    data: { quotes, rates: { MEP: { price: 1200 }, CCL: { price: 1213.13 }, ...rates } },
    error: null,
  })
}

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

describe('MarketQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra el estado vacío sin plan cargado', async () => {
    mockPlan([])
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no cargaste tu plan/i)).toBeInTheDocument()
    expect(screen.getByText(/Plan de inversión/i)).toBeInTheDocument()
  })

  it('resume la cartera con total, cambio diario y tabla de cotizaciones', async () => {
    mockPlan(
      [
        { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 9, quantity: 8, manual_price: null, sort_order: 0 },
        { id: '2', symbol: 'QQQ', name: 'QQQ', asset_type: 'cedear', currency: 'ARS', target_weight: 14, quantity: 9, manual_price: null, sort_order: 1 },
      ],
      { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' } },
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)

    expect(await screen.findByText('Patrimonio total')).toBeInTheDocument()
    expect(screen.getByText(/0\.10% hoy/)).toBeInTheDocument()
    expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument()
    expect(screen.getAllByText('VIST').length).toBeGreaterThan(0)
    expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0)
    expect(screen.getByText(/Dólar MEP/)).toBeInTheDocument()
    expect(screen.getByText(/Dólar CCL/)).toBeInTheDocument()

    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { symbols: ['VIST', 'QQQ'] },
      }),
    )
  })

  it('alterna la moneda del total', async () => {
    mockPlan(
      [
        { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 9, quantity: 8, manual_price: null, sort_order: 0 },
      ],
      { VIST: { price: 34920, changePct: 1.2, source: 'byma' } },
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: 'USD' }))
    expect(await screen.findByRole('button', { name: 'USD' }).then((b) => b.className)).toContain(
      'bg-brand-600',
    )
  })

  it('muestra aviso cuando no hay precios disponibles', async () => {
    mockPlan(
      [
        { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 9, quantity: 8, manual_price: null, sort_order: 0 },
      ],
      {},
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Aún no hay precios disponibles/i)).toBeInTheDocument()
  })
})
