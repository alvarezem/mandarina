import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LedgerView from './LedgerView'
import ToastProvider from './Toast'
import supabase from '../lib/supabaseClient'

const today = () => new Date().toISOString().slice(0, 10)

function mockRows(rows) {
  supabase.mockTable('ledger_operations', rows)
}

function mockQuotes(quotes, rates = {}) {
  supabase.functions.invoke.mockResolvedValue({ data: { quotes, rates }, error: null })
}

describe('LedgerView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRows([])
    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
  })

  const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

  const openModal = async () => {
    await userEvent.click(screen.getAllByRole('button', { name: 'Registrar operación' })[0])
    await screen.findByRole('dialog', { name: 'Registrar operación' })
  }

  it('muestra el estado vacío y abre el modal de registro', async () => {
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/Todavía no registraste ninguna operación/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Registrar operación' }).length).toBeGreaterThan(0)
    expect(supabase.from('ledger_operations').select).toHaveBeenCalled()
    await openModal()
    expect(screen.getByRole('dialog', { name: 'Registrar operación' })).toBeInTheDocument()
  })

  it('resume por símbolo con costo promedio y rentabilidad vs. el precio', async () => {
    mockRows([
      {
        id: 'o1',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 10,
        price: 25,
        commission: 2,
        date: '2026-07-10',
      },
      {
        id: 'o2',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 5,
        price: 30,
        commission: 2,
        date: '2026-07-20',
      },
    ])
    mockQuotes({ GGAL: { price: 40, changePct: 1 } })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)

    const [summary] = await screen.findAllByRole('table')
    expect(within(summary).getByText('GGAL')).toBeInTheDocument()
    expect(within(summary).getByText('15')).toBeInTheDocument()
    expect(within(summary).getByText('$ 26,93')).toBeInTheDocument()
    expect(await screen.findByText('$ 40,00')).toBeInTheDocument()
    expect(within(summary).getByText('▲ 48.51%')).toBeInTheDocument()
  })

  it('lista las operaciones con subtotal según el tipo', async () => {
    mockRows([
      {
        id: 'o1',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 10,
        price: 25,
        commission: 2,
        date: '2026-07-10',
      },
      {
        id: 'o2',
        symbol: 'AAPL',
        side: 'venta',
        quantity: 2,
        price: 40,
        commission: 1,
        date: '2026-07-20',
      },
    ])
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)

    const tables = await screen.findAllByRole('table')
    const opsTable = tables[tables.length - 1]
    expect(within(opsTable).getByText('Compra')).toBeInTheDocument()
    expect(within(opsTable).getByText('Venta')).toBeInTheDocument()
    expect(within(opsTable).getByText('$ 252,00')).toBeInTheDocument()
    expect(within(opsTable).getByText('-$ 79,00')).toBeInTheDocument()
  })

  it('muestra la nota de la operación y la comisión en %', async () => {
    mockRows([
      {
        id: 'o1',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 10,
        price: 25,
        commission: 0.6,
        commission_is_pct: true,
        date: '2026-07-10',
        notes: 'Compré de contado inmediato',
      },
      {
        id: 'o2',
        symbol: 'AAPL',
        side: 'compra',
        quantity: 1,
        price: 40,
        commission: 0,
        date: '2026-07-20',
        notes: null,
      },
    ])
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)

    const tables = await screen.findAllByRole('table')
    const opsTable = tables[tables.length - 1]
    expect(within(opsTable).getByText('Compré de contado inmediato')).toBeInTheDocument()
    expect(within(opsTable).getByText('0.6%')).toBeInTheDocument()
    expect(within(opsTable).getByText('Compré de contado inmediato')).toHaveAttribute(
      'title',
      'Compré de contado inmediato',
    )
    const aaplRow = within(opsTable)
      .getAllByRole('row')
      .find((r) => within(r).queryByText('AAPL'))
    expect(within(aaplRow).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('registra una compra y muestra toast de éxito', async () => {
    supabase.mockTable('ledger_operations', { rows: [], insert: { id: 'o1' } })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.selectOptions(screen.getByLabelText('Tipo de operación'), 'compra')
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'ggal')
    await userEvent.type(screen.getByLabelText('Cantidad de la operación'), '10')
    await userEvent.type(screen.getByLabelText('Precio por unidad'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith({
      user_id: 'u1',
      symbol: 'GGAL',
      side: 'compra',
      quantity: 10,
      price: 25,
      commission: 0,
      commission_is_pct: false,
      currency: 'ARS',
      date: today(),
      notes: null,
    })
    expect(await screen.findByText('GGAL: compra de 10 unidades registrada')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Registrar operación' })).not.toBeInTheDocument(),
    )
  })

  it('registra la comisión como porcentaje cuando el toggle está en %', async () => {
    supabase.mockTable('ledger_operations', { rows: [], insert: { id: 'o1' } })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'GGAL')
    await userEvent.type(screen.getByLabelText('Cantidad de la operación'), '10')
    await userEvent.type(screen.getByLabelText('Precio por unidad'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Comisión en porcentaje' }))
    await userEvent.type(screen.getByLabelText('Comisión de la operación'), '0.6')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith(
      expect.objectContaining({ commission: 0.6, commission_is_pct: true }),
    )
  })

  it('registra un ajuste inicial con su costo', async () => {
    supabase.mockTable('ledger_operations', { rows: [], insert: { id: 'o1' } })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.selectOptions(screen.getByLabelText('Tipo de operación'), 'ajuste')
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'GGAL')
    await userEvent.type(screen.getByLabelText('Cantidad de la operación'), '8')
    await userEvent.type(screen.getByLabelText('Precio por unidad'), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(supabase.from('ledger_operations').insert).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'GGAL', side: 'ajuste', quantity: 8, price: 100 }),
    )
  })

  it('el botón BYMA trae el precio live al hacer click', async () => {
    mockRows([])
    supabase.functions.invoke.mockResolvedValue({
      data: { quotes: { GGAL: { price: 30, changePct: 1 } }, rates: {} },
      error: null,
    })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'GGAL')
    await userEvent.click(screen.getByRole('button', { name: 'BYMA' }))
    await waitFor(() => expect(screen.getByLabelText('Precio por unidad')).toHaveValue(30))
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'quotes',
      expect.objectContaining({ body: { symbols: ['GGAL'] } }),
    )
  })

  it('el botón BYMA avisa si el ticker es inválido y no consulta', async () => {
    mockRows([])
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'CÓRDOBA')
    await userEvent.click(screen.getByRole('button', { name: 'BYMA' }))

    expect(await screen.findByText(/Ticker inválido/i)).toBeInTheDocument()
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('el botón BYMA avisa si no hay cotización para el ticker', async () => {
    mockRows([])
    supabase.functions.invoke.mockResolvedValue({ data: { quotes: {}, rates: {} }, error: null })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'GGAL')
    await userEvent.click(screen.getByRole('button', { name: 'BYMA' }))

    expect(await screen.findByText('No se pudo obtener la cotización de GGAL')).toBeInTheDocument()
  })

  it('cierra el modal con Escape, la X o el backdrop', async () => {
    mockRows([])
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Registrar operación' })).not.toBeInTheDocument(),
    )

    await openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar registro' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Registrar operación' })).not.toBeInTheDocument(),
    )

    await openModal()
    await userEvent.click(screen.getByTestId('register-modal-backdrop'))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Registrar operación' })).not.toBeInTheDocument(),
    )
  })

  it('rechaza un ticker inválido con toast y no inserta', async () => {
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'CÓRDOBA')
    await userEvent.type(screen.getByLabelText('Cantidad de la operación'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText(/Ticker inválido/i)).toBeInTheDocument()
    expect(supabase.from('ledger_operations').insert).not.toHaveBeenCalled()
  })

  it('rechaza cantidad no positiva', async () => {
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    await openModal()
    await userEvent.type(screen.getByLabelText('Símbolo de la operación'), 'GGAL')
    await userEvent.type(screen.getByLabelText('Cantidad de la operación'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText(/cantidad debe ser mayor a 0/i)).toBeInTheDocument()
    expect(supabase.from('ledger_operations').insert).not.toHaveBeenCalled()
  })

  it('borra una operación con confirmación inline', async () => {
    supabase.mockTable('ledger_operations', {
      rows: [
        {
          id: 'o1',
          symbol: 'GGAL',
          side: 'compra',
          quantity: 10,
          price: 25,
          commission: 0,
          date: '2026-07-10',
        },
      ],
      deleteError: null,
    })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar operación de GGAL' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(supabase.from('ledger_operations').delete).toHaveBeenCalledWith()
    expect(await screen.findByText('Operación de GGAL eliminada')).toBeInTheDocument()
  })

  it('muestra el error de carga del historial', async () => {
    supabase.mockTable('ledger_operations', [], { message: 'boom' })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)
    expect(
      await screen.findByText('No se pudo cargar el historial de operaciones'),
    ).toBeInTheDocument()
  })

  it('escala los montos a USD usando el rate del toggle', async () => {
    mockRows([
      {
        id: 'o1',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 1,
        price: 1000,
        commission: 0,
        date: '2026-07-10',
      },
    ])
    mockQuotes({ GGAL: { price: 1200, changePct: 1 } }, { CCL: { price: 1200 } })
    wrap(<LedgerView session={{ user: { id: 'u1' } }} display="USD" rateMode="CCL" />)

    expect(await screen.findByText('$1.00')).toBeInTheDocument()
  })

  it('muestra un error amigable cuando falla el fetch de cotizaciones', async () => {
    mockRows([
      {
        id: 'o1',
        symbol: 'GGAL',
        side: 'compra',
        quantity: 1,
        price: 25,
        commission: 0,
        date: '2026-07-10',
      },
    ])
    supabase.functions.invoke.mockRejectedValue(new Error('net'))
    wrap(<LedgerView session={{ user: { id: 'u1' } }} />)

    expect(await screen.findByTestId('quotes-error-notice')).toBeInTheDocument()
  })
})
