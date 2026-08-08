import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  Line: () => <div data-testid="chart-line" />,
}))

const supabase = require('../lib/supabaseClient').default

const ITEMS = [
  { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 9, quantity: 8, sort_order: 0 },
  { id: '2', symbol: 'QQQ', name: 'QQQ', asset_type: 'cedear', currency: 'ARS', target_weight: 14, quantity: 9, sort_order: 1 },
]

function mockPlan(items = ITEMS, quotes = {}, rates = {}) {
  const order = jest.fn().mockResolvedValue({ data: items, error: null })
  const select = jest.fn().mockReturnValue({ order })
  supabase.from.mockImplementation((table) => (table === 'portfolio_plan' ? { select } : {}))
  supabase.functions.invoke.mockImplementation((fn, { body } = {}) => {
    if (body?.history) {
      const withData = { VIST: true, QQQ: true }
      return Promise.resolve({
        data: {
          history: {
            symbol: body.history.symbol,
            range: body.history.range,
            points: withData[body.history.symbol]
              ? [
                  { t: 1000, o: 10, h: 12, l: 9, c: 11, v: 100 },
                  { t: 2000, o: 11, h: 13, l: 10, c: 13, v: 120 },
                ]
              : [],
          },
        },
        error: null,
      })
    }
    return Promise.resolve({
      data: {
        quotes,
        rates: { MEP: { price: 1200 }, CCL: { price: 1213.13 }, ...rates },
      },
      error: null,
    })
  })
}

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

describe('MarketQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('muestra el estado vacío sin plan cargado', async () => {
    mockPlan([])
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no cargaste tu plan/i)).toBeInTheDocument()
    expect(screen.getByText(/Plan de inversión/i)).toBeInTheDocument()
  })

  it('resume la cartera con total, cambio diario y tabla de cotizaciones', async () => {
    mockPlan(
      ITEMS,
      {
        VIST: { price: 34920, changePct: 1.2, source: 'byma' },
        QQQ: { price: 56400, changePct: -0.5, source: 'byma' },
      },
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)

    expect(await screen.findByText('Patrimonio total')).toBeInTheDocument()
    expect(screen.getByText(/0\.10% hoy/)).toBeInTheDocument()
    expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument()
    expect(screen.getAllByText('VIST').length).toBeGreaterThan(0)
    expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0)

    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { symbols: ['VIST', 'QQQ'] },
      }),
    )
  })

  it('muestra el dato compacto de MEP/CCL y no el selector de dólar', async () => {
    mockPlan(
      ITEMS,
      {
        VIST: { price: 34920, changePct: 1.2, source: 'byma' },
        QQQ: { price: 56400, changePct: -0.5, source: 'byma' },
      },
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')
    expect(screen.getByText(/MEP \$\s*1\.200 · CCL \$\s*1\.213/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Dólar/i })).not.toBeInTheDocument()
  })

  it('alterna la moneda del total', async () => {
    function Harness() {
      const [display, setDisplay] = useState('ARS')
      return (
        <MarketQuotes session={{ user: { id: 'u1' } }} display={display} setDisplay={setDisplay} />
      )
    }
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' } })
    wrap(<Harness />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: 'USD' }))
    const usd = screen.getByRole('button', { name: 'USD' })
    expect(usd.className).toContain('bg-brand-600')
  })

  it('ordena por % Meta desc por default y luego por precio desc', async () => {
    const items = [
      { id: '1', symbol: 'VIST', name: 'VIST', asset_type: 'accion', currency: 'ARS', target_weight: 20, quantity: 8, sort_order: 0 },
      { id: '2', symbol: 'QQQ', name: 'QQQ', asset_type: 'cedear', currency: 'ARS', target_weight: 14, quantity: 9, sort_order: 1 },
    ]
    mockPlan(
      items,
      {
        VIST: { price: 34920, changePct: 1.2, source: 'byma' },
        QQQ: { price: 56400, changePct: -0.5, source: 'byma' },
      },
    )
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('VIST')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Precio/ }))
    const rowsAfter = screen.getAllByRole('row')
    expect(within(rowsAfter[1]).getByText('QQQ')).toBeInTheDocument()
  })

  it('muestra la sesión del día en el gráfico inline (apertura, máx, mín, cierre previo)', async () => {
    mockPlan(ITEMS, {
      VIST: { price: 34920, changePct: 1.2, open: 34720, high: 35000, low: 33900, prevClose: 33680, tradeHour: '16:59', source: 'byma' },
      QQQ: { price: 56400, changePct: -0.5, source: 'byma' },
    })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: /VIST Acción/ }))
    expect(await screen.findByTestId('chart-line')).toBeInTheDocument()

    expect(screen.getByText(/Apr/i)).toBeInTheDocument()
    expect(screen.getByText(/Cierre prev/i)).toBeInTheDocument()
    expect(screen.getByText(/hoy 16:59/i)).toBeInTheDocument()
    expect(screen.getAllByText(/▲\s*1\.20%/).length).toBeGreaterThanOrEqual(2)
  })

  it('muestra aviso cuando no hay precios disponibles', async () => {
    mockPlan(ITEMS, {})
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Aún no hay precios disponibles/i)).toBeInTheDocument()
  })

  it('abre el gráfico inline al tocar el símbolo y carga el histórico', async () => {
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: /VIST Acción/ }))

    expect(await screen.findByTestId('chart-line')).toBeInTheDocument()
    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { history: { symbol: 'VIST', range: '3M' } },
      }),
    )
  })

  it('cambia el rango del gráfico inline', async () => {
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: /VIST Acción/ }))
    await screen.findByTestId('chart-line')

    await userEvent.click(screen.getByRole('button', { name: '1S' }))
    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { history: { symbol: 'VIST', range: '1S' } },
      }),
    )
  })

  it('abre el gráfico en otra ventana (modal) y lo cierra con X', async () => {
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: /Abrir gráfico de QQQ/ }))

    expect(await screen.findByRole('dialog', { name: /Gráfico de QQQ/ })).toBeInTheDocument()
    expect(screen.getByText(/Precio · QQQ/)).toBeInTheDocument()
    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('quotes', {
        body: { history: { symbol: 'QQQ', range: '3M' } },
      }),
    )

    await userEvent.click(screen.getByRole('button', { name: /Cerrar gráfico/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra aviso de sin datos cuando el histórico viene vacío', async () => {
    const items = [...ITEMS, { id: '3', symbol: 'KO', name: 'KO', asset_type: 'accion', currency: 'ARS', target_weight: 12, quantity: 17, sort_order: 2 }]
    mockPlan(items, { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' }, KO: { price: 27320, changePct: 0.8, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')

    await userEvent.click(screen.getByRole('button', { name: /KO Acción/ }))
    expect(await screen.findByText(/Sin datos históricos para KO/)).toBeInTheDocument()
  })

  it('muestra la nota de cobertura solo si hay activos sin precio', async () => {
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')
    expect(screen.getByText(/· 1 de 2 activos con precio/)).toBeInTheDocument()
  })

  it('omite la nota de cobertura cuando todos los activos tienen precio', async () => {
    mockPlan(ITEMS, { VIST: { price: 34920, changePct: 1.2, source: 'byma' }, QQQ: { price: 56400, changePct: -0.5, source: 'byma' } })
    wrap(<MarketQuotes session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Patrimonio total')
    expect(screen.queryByText(/activos con precio/)).not.toBeInTheDocument()
  })
})
