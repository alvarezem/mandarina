import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import ToastProvider from './Toast'

jest.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
  },
}))

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
  Bar: () => <div data-testid="chart-bar" />,
}))

const supabase = require('../lib/supabaseClient').default

function mockTx(data) {
  const eq = jest.fn().mockResolvedValue({ data: null, error: null })
  const update = jest.fn().mockReturnValue({ eq })
  const order = jest.fn().mockResolvedValue({ data, error: null })
  const select = jest.fn().mockReturnValue({ order })
  supabase.from.mockImplementation((table) =>
    table === 'transactions'
      ? { select, update }
      : {},
  )
  return { update, eq }
}

const txs = [
  { id: '1', date: '2026-07-01', merchant: 'MERCADO LIBRE', category: 'Compras', currency: 'ARS', amount: -1500, summary_id: 's1', card_summaries: { file_name: 'resumen-julio.csv' } },
  { id: '2', date: '2026-07-02', merchant: 'NETFLIX', category: 'Suscripciones', currency: 'ARS', amount: -3500, summary_id: 's1', card_summaries: { file_name: 'resumen-julio.csv' } },
  { id: '3', date: '2026-07-03', merchant: 'AMAZON', category: 'Compras', currency: 'USD', amount: -17.61, summary_id: 's1', card_summaries: { file_name: 'resumen-julio.csv' } },
  { id: '4', date: '2026-07-04', merchant: 'PAGO TC', category: 'Pagos', currency: 'ARS', amount: -50000, summary_id: 's1', card_summaries: { file_name: 'resumen-julio.csv' } },
  { id: '5', date: '2026-06-15', merchant: 'OTRA', category: 'Compras', currency: 'ARS', amount: -200, summary_id: 's2', card_summaries: { file_name: 'resumen-junio.csv' } },
]

function renderDashboard(props = {}) {
  return render(
    <ToastProvider>
      <Dashboard summaryId={null} {...props} />
    </ToastProvider>,
  )
}

async function rowsOfTable() {
  const table = await screen.findByRole('table')
  return within(table).getAllByRole('row')
}

describe('Dashboard', () => {
  beforeEach(() => {
    mockTx(txs)
  })

  it('renderiza cards y excluye pagos de tarjeta', async () => {
    renderDashboard()
    expect(await screen.findByText('Débitos')).toBeInTheDocument()
    expect(await screen.findByText('Movimientos')).toBeInTheDocument()
    expect(screen.getByText(/1 pago de tarjeta excluido/i)).toBeInTheDocument()

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toContain('MERCADO LIBRE')
    expect(merchants).toContain('NETFLIX')
    expect(merchants).not.toContain('PAGO TC')
  })

  it('filtra por moneda USD', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Moneda Ambas/i }))
    await userEvent.click(await screen.findByRole('button', { name: /USD/i }))

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['AMAZON'])
    expect(screen.getByText('Mayor gasto USD')).toBeInTheDocument()
  })

  it('filtra por categoría desde el dropdown', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Categorías Todas/i }))
    await userEvent.click(await screen.findByRole('button', { name: /✓ Suscripciones/i }))

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['NETFLIX'])
  })

  it('filtra por búsqueda de comercio', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    await userEvent.type(screen.getByPlaceholderText('Buscar comercio…'), 'mercado')

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['MERCADO LIBRE'])
  })

  it('filtra por resumen individual vía prop summaryId', async () => {
    renderDashboard({ summaryId: 's2' })
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['OTRA'])
  })

  it('avisa al padre al seleccionar un resumen en el dropdown', async () => {
    const onSummarySelect = jest.fn()
    renderDashboard({ onSummarySelect })
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Resumen Todos los resúmenes/i }))
    await userEvent.click(await screen.findByRole('button', { name: /resumen-junio\.csv/i }))
    expect(onSummarySelect).toHaveBeenCalledWith('s2')
  })

  it('muestra "Limpiar filtros" con filtros activos y resetea', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Buscar comercio…'), 'x')
    const clear = await screen.findByRole('button', { name: /Limpiar filtros/i })
    await userEvent.click(clear)
    expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()
  })

  it('ordena la tabla por monto al hacer clic en el header', async () => {
    renderDashboard()
    const rows = await rowsOfTable()
    expect(rows).toHaveLength(5)
    const header = within(rows[0]).getByRole('button', { name: /Monto/i })
    await userEvent.click(header)

    const sorted = await rowsOfTable()
    expect(within(sorted[1]).getAllByRole('cell')[1]).toHaveTextContent('NETFLIX')
    const cells = within(sorted[1]).getAllByRole('cell')
    expect(cells[cells.length - 1].textContent).toContain('3.500')
  })

  it('cambia la categoría de una transacción', async () => {
    const { update, eq } = mockTx(txs)
    renderDashboard()
    await screen.findByText('Débitos')
    const [_, ...rows] = await rowsOfTable()
    const mercadoRow = rows.find((r) => within(r).getAllByRole('cell')[1].textContent === 'MERCADO LIBRE')

    await userEvent.click(within(mercadoRow).getByRole('button', { name: /Compras/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Transferencias/i }))

    expect(update).toHaveBeenCalledWith({ category: 'Transferencias' })
    expect(eq).toHaveBeenCalledWith('id', '1')
    expect(await screen.findByText('Categoría actualizada')).toBeInTheDocument()
    const categoryCells = (await rowsOfTable())
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[3].textContent)
    expect(categoryCells).toContain('Transferencias')
  })

  it('al reclasificar a "Pagos" la excluye de los totales', async () => {
    const { update } = mockTx(txs)
    renderDashboard()
    await screen.findByText('Débitos')
    expect(screen.queryByText(/1 pago de tarjeta excluido/i)).toBeInTheDocument()

    const [_, ...rows] = await rowsOfTable()
    const amazonRow = rows.find((r) => within(r).getAllByRole('cell')[1].textContent === 'AMAZON')
    await userEvent.click(within(amazonRow).getByRole('button', { name: /Compras/i }))
    await userEvent.click(await screen.findByRole('button', { name: /✓ Pagos/i }))

    expect(update).toHaveBeenCalledWith({ category: 'Pagos' })
    expect(await screen.findByText(/2 pagos de tarjeta excluido/i)).toBeInTheDocument()
    const merchants = (await rowsOfTable())
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).not.toContain('AMAZON')
  })
})
