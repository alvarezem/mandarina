import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvestmentPlan from './InvestmentPlan'
import ToastProvider from './Toast'
import supabase from '../lib/supabaseClient'

function mockPlan(items, prices = {}) {
  supabase.mockTable('portfolio_plan', {
    rows: items,
    insert: items[0] ?? null,
  })
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
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('muestra el estado vacío sin plan cargado', async () => {
    mockPlan([], {})
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no cargaste tu plan/i)).toBeInTheDocument()
  })

  it('lista los activos con sus cotizaciones y metas', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 9,
          quantity: 8,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'QQQ',
          name: 'QQQ',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 14,
          quantity: 9,
          sort_order: 1,
        },
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
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 1000, SPY: 3000 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '1000',
    )
    expect(await screen.findByText('Comprar')).toBeInTheDocument()
    expect(screen.getByText(/cubrís/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() =>
      expect(supabase.from('portfolio_plan').update).toHaveBeenCalledWith({ quantity: 2 }),
    )
    expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'VIST', side: 'compra', quantity: 1, price: 1000 }),
    )
  })

  it('registra en el ledger la moneda del instrumento (USD)', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'USD',
          target_weight: 50,
          quantity: 0,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 10, SPY: 100000 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} display="USD" rateMode="CCL" />)
    await screen.findByText('VIST')

    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '100',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() =>
      expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'VIST',
          side: 'compra',
          quantity: 8,
          price: 10,
          currency: 'USD',
        }),
      ),
    )
  })

  it('registra en el ledger el precio de mercado, no amount/qty', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 100, SPY: 300 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '150',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() =>
      expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith(
        expect.objectContaining({ price: 100 }),
      ),
    )
  })

  it('no incrementa el plan si falla el insert del ledger', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 1000, SPY: 3000 },
    )
    supabase.mockTable('ledger_operations', { insert: null, insertError: new Error('ledger') })
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '1000',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() => expect(supabase.from('portfolio_plan').update).not.toHaveBeenCalled())
    expect(screen.getByText('No se pudo registrar la compra')).toBeInTheDocument()
  })

  it('revierte el ledger si falla la actualización del plan', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 1000, SPY: 3000 },
    )
    supabase.mockTable('ledger_operations', { insert: { id: 'op1' }, insertError: null })
    supabase.mockTable('portfolio_plan', {
      rows: [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 1,
        },
      ],
      updateError: new Error('plan'),
    })
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '1000',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comprar' }))
    await waitFor(() => expect(supabase.from('ledger_operations').delete).toHaveBeenCalled())
    expect(supabase.from('ledger_operations').delete().eq).toHaveBeenCalledWith('id', 'op1')
  })

  it('no crea steps de compra cuando el faltante no alcanza una unidad', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'GOLD',
          name: 'GOLD',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 0,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 7550, GOLD: 10000 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')
    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '1541.6',
    )
    expect(await screen.findByText(/No alcanza para una unidad: VIST/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comprar' })).not.toBeInTheDocument()
  })

  it('cambia la prioridad de compra con el selector de estrategia', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 40,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'SPY',
          name: 'SPY',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 30,
          quantity: 0,
          sort_order: 1,
        },
        {
          id: '3',
          symbol: 'KO',
          name: 'KO',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 30,
          quantity: 0,
          sort_order: 2,
        },
      ],
      { VIST: 1000, SPY: 100, KO: 10 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    await userEvent.type(
      screen.getByRole('spinbutton', { name: /Presupuesto para comprar/i }),
      '1000',
    )

    const steps = () => screen.getAllByRole('listitem')
    expect(within(steps()[0]).getByText('SPY')).toBeInTheDocument()

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Prioridad de compra/i }),
      'barato',
    )
    expect(within(steps()[0]).getByText('KO')).toBeInTheDocument()

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Prioridad de compra/i }),
      'caro',
    )
    expect(within(steps()[0]).getByText('SPY')).toBeInTheDocument()
  })

  it('muestra el dato compacto de MEP/CCL junto al toggle', async () => {
    mockPlan([], {})
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText(/Todavía no cargaste tu plan/i)
    expect(screen.getByText(/MEP \$\s*1\.200,00 · CCL \$\s*1\.213,13/)).toBeInTheDocument()
  })

  it('ordena por % Meta desc por default y luego por cantidad desc', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 20,
          quantity: 8,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'QQQ',
          name: 'QQQ',
          asset_type: 'cedear',
          currency: 'ARS',
          target_weight: 14,
          quantity: 9,
          sort_order: 1,
        },
      ],
      { VIST: 34920, QQQ: 56400 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('VIST')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Cantidad/ }))
    const rowsAfter = screen.getAllByRole('row')
    expect(within(rowsAfter[1]).getByText('QQQ')).toBeInTheDocument()
  })

  it('muestra las columnas en el orden Precio · Meta · Actual · Gap · Cantidad · Valor · A comprar', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 20,
          quantity: 8,
          sort_order: 0,
        },
      ],
      { VIST: 34920 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    const labels = screen.getAllByRole('columnheader').map((th) => th.textContent.trim())
    const start = labels.findIndex((l) => l === 'Activo')
    expect(labels.slice(start, start + 8)).toEqual([
      'Activo',
      'Precio',
      'Meta▼',
      'Actual',
      'Gap',
      'Cantidad',
      'Valor',
      'A comprar',
    ])
  })

  it('muestra A comprar solo en unidades', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 50,
          quantity: 1,
          sort_order: 0,
        },
        {
          id: '2',
          symbol: 'KO',
          name: 'KO',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 30,
          quantity: 1,
          sort_order: 1,
        },
      ],
      { VIST: 34920, KO: 3500 },
    )
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VIST')

    const rows = screen.getAllByRole('row')
    const koRow = rows.find((r) => within(r).queryByText('KO'))
    expect(within(koRow).getByText(/≈3 u/)).toBeInTheDocument()
    expect(within(koRow).queryByText(/≈3 u/)).not.toHaveTextContent('$')
    const vistRow = rows.find((r) => within(r).queryByText('VIST'))
    expect(within(vistRow).getByText('—')).toBeInTheDocument()
  })

  it('muestra un error si no se puede cargar el plan', async () => {
    supabase.mockTable('portfolio_plan', [], new Error('red'))
    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('No se pudo cargar el plan de inversión')).toBeInTheDocument()
  })

  it('muestra un toast de error si falla el guardado de un activo', async () => {
    mockPlan([], {})
    supabase.from('portfolio_plan').insert.mockRejectedValue(new Error('red'))
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    await screen.findByText(/Todavía no cargaste tu plan/i)

    await userEvent.click(screen.getByRole('button', { name: /Agregar activo/i }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Ticker' }), 'GGAL')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Meta %' }), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar activo' }))
    expect(await screen.findByText('No se pudo guardar el activo')).toBeInTheDocument()
  })

  it('muestra "Sin conexión" al fallar las cotizaciones y la oculta al refrescar', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 9,
          quantity: 8,
          sort_order: 0,
        },
      ],
      { VIST: 34920 },
    )
    supabase.functions.invoke.mockRejectedValue(new Error('red'))
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByTestId('quotes-error-notice')).toBeInTheDocument()

    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar precios' }))
    await waitFor(() => expect(screen.queryByTestId('quotes-error-notice')).not.toBeInTheDocument())
  })

  it('muestra el total en USD aunque no haya rate si el plan es 100% USD', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'QQQ',
          name: 'QQQ',
          asset_type: 'cedear',
          currency: 'USD',
          target_weight: 100,
          quantity: 2,
          sort_order: 0,
        },
      ],
      { QQQ: 100 },
    )
    supabase.functions.invoke.mockResolvedValue({
      data: { quotes: { QQQ: { price: 100 } }, rates: {} },
      error: null,
    })
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} display="USD" />)
    await screen.findByText('QQQ')
    await waitFor(() => expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0))
  })

  it('muestra "—" en el total si hace falta conversión y no hay rate', async () => {
    mockPlan(
      [
        {
          id: '1',
          symbol: 'VIST',
          name: 'VIST',
          asset_type: 'accion',
          currency: 'ARS',
          target_weight: 100,
          quantity: 2,
          sort_order: 0,
        },
      ],
      { VIST: 100 },
    )
    supabase.functions.invoke.mockResolvedValue({
      data: { quotes: { VIST: { price: 100 } }, rates: {} },
      error: null,
    })
    wrap(<InvestmentPlan session={{ user: { id: 'u1' } }} display="USD" />)
    await screen.findByText('VIST')
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0))
  })
})
