import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import ToastProvider from './Toast'
import supabase from '../lib/supabaseClient'

function mockTx(data, { overrides = [], customCategories = [] } = {}) {
  supabase.mockTable('transactions', data)
  supabase.mockTable('merchant_overrides', overrides)
  supabase.mockTable('custom_categories', customCategories)
  const tx = supabase.tableChain('transactions')
  const ov = supabase.tableChain('merchant_overrides')
  const cc = supabase.tableChain('custom_categories')
  return {
    select: tx.select,
    update: tx.update,
    eq: tx.eq,
    ovUpsert: ov.upsert,
    ccUpsert: cc.upsert,
  }
}

const txs = [
  {
    id: '1',
    date: '2026-07-01',
    merchant: 'MERCADO LIBRE',
    category: 'Compras',
    currency: 'ARS',
    amount: -1500,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
  {
    id: '2',
    date: '2026-07-02',
    merchant: 'NETFLIX',
    category: 'Suscripciones',
    currency: 'ARS',
    amount: -3500,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
  {
    id: '3',
    date: '2026-07-03',
    merchant: 'AMAZON',
    category: 'Compras',
    currency: 'USD',
    amount: -17.61,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
  {
    id: '4',
    date: '2026-07-04',
    merchant: 'PAGO TC',
    category: 'Pagos',
    currency: 'ARS',
    amount: -50000,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
  {
    id: '5',
    date: '2026-06-15',
    merchant: 'OTRA',
    category: 'Compras',
    currency: 'ARS',
    amount: -200,
    summary_id: 's2',
    card_summaries: { file_name: 'resumen-junio.csv' },
  },
]

function renderDashboard(props = {}) {
  return render(
    <ToastProvider>
      <Dashboard summaryId={null} session={{ user: { id: 'user-1' } }} {...props} />
    </ToastProvider>,
  )
}

async function rowsOfTable() {
  const table = await screen.findByRole('table')
  return within(table).getAllByRole('row')
}

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    mockTx(txs)
  })

  it('carga los gastos sin filtrar por user_id en transactions', async () => {
    const { select } = mockTx(txs)
    renderDashboard()
    expect(await screen.findByText('Movimientos')).toBeInTheDocument()
    expect(select).toHaveBeenCalledWith(
      '*, card_summaries(file_name, summary_type, period_month, period_year)',
    )
    expect(select.mock.results[0].value.eq).not.toHaveBeenCalled()
  })

  it('muestra un error si no se pueden cargar los gastos', async () => {
    supabase.mockTable('transactions', [], new Error('red'))
    renderDashboard()
    expect(await screen.findByText('No se pudieron cargar los gastos')).toBeInTheDocument()
  })

  it('renderiza cards y excluye pagos de tarjeta', async () => {
    renderDashboard()
    expect(await screen.findByText('Débitos')).toBeInTheDocument()
    expect(await screen.findByText('Movimientos')).toBeInTheDocument()
    expect(screen.getByText(/se excluye 1 pago de tarjeta/i)).toBeInTheDocument()

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toContain('MERCADO LIBRE')
    expect(merchants).toContain('NETFLIX')
    expect(merchants).not.toContain('PAGO TC')
  })

  it('filtra por moneda USD', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Moneda\s*Ambas/i }))
    await userEvent.click(await screen.findByRole('button', { name: /USD/i }))

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['AMAZON'])
    expect(screen.getByText('Mayor gasto USD')).toBeInTheDocument()
  })

  it('en modo ingresos muestra cards y gráficos de ingresos (no débitos ni nota de pagos)', async () => {
    mockTx([
      {
        id: 'c1',
        date: '2026-07-01',
        merchant: 'SUELDO',
        category: 'Ingresos',
        currency: 'ARS',
        amount: 500000,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen-julio.csv' },
      },
      {
        id: 'c2',
        date: '2026-07-02',
        merchant: 'REINTEGRO',
        category: 'Ingresos',
        currency: 'ARS',
        amount: 1500,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen-julio.csv' },
      },
      {
        id: 'c3',
        date: '2026-07-03',
        merchant: 'PAGO TC',
        category: 'Pagos',
        currency: 'ARS',
        amount: -50000,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen-julio.csv' },
      },
    ])
    renderDashboard({ mode: 'ingresos' })

    expect(await screen.findByText('Mayor ingreso ARS')).toBeInTheDocument()
    expect(screen.getByText('Movimientos')).toBeInTheDocument()
    expect(screen.queryByText('Débitos')).not.toBeInTheDocument()
    expect(screen.getByText('Ingresos acumulados')).toBeInTheDocument()
    expect(screen.queryByText('Gastos acumulados')).not.toBeInTheDocument()
    expect(screen.queryByText(/se excluye.*pago de tarjeta/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Acreditaciones por origen' })).toBeInTheDocument()
    expect(screen.getByText('2 orígenes')).toBeInTheDocument()
  })

  it('en modo egresos excluye los créditos (montos positivos) de la tabla', async () => {
    mockTx([
      ...txs,
      {
        id: '6',
        date: '2026-07-05',
        merchant: 'SUELDO',
        category: 'Ingresos',
        currency: 'ARS',
        amount: 500000,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen-julio.csv' },
      },
    ])
    renderDashboard()
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toContain('MERCADO LIBRE')
    expect(merchants).not.toContain('SUELDO')
  })

  it('en modo ingresos muestra solo los créditos en la tabla', async () => {
    mockTx([
      ...txs,
      {
        id: '6',
        date: '2026-07-05',
        merchant: 'SUELDO',
        category: 'Ingresos',
        currency: 'ARS',
        amount: 500000,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen-julio.csv' },
      },
    ])
    renderDashboard({ mode: 'ingresos' })
    await screen.findByText('Mayor ingreso ARS')

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['SUELDO'])
  })

  it('filtra por categoría desde el dropdown', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Categorías\s*Todas/i }))
    await userEvent.click(await screen.findByRole('button', { name: /✓\s*Suscripciones/i }))

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

  it('incluye los pagos de tarjeta al togglear y persiste la preferencia', async () => {
    renderDashboard()
    await screen.findByText('Débitos')
    expect(screen.queryByRole('button', { name: 'Excluir pagos' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Incluir pagos' }))
    expect(localStorage.getItem('mandarina:include-payments')).toBe('true')
    expect(screen.getByText(/Incluyendo 1 pago de tarjeta/i)).toBeInTheDocument()

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toContain('PAGO TC')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir pagos' }))
    expect(localStorage.getItem('mandarina:include-payments')).toBe('false')
    expect(screen.getByText(/se excluye 1 pago de tarjeta/i)).toBeInTheDocument()
    const excluded = (await rowsOfTable())
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(excluded).not.toContain('PAGO TC')
  })

  it('recuerda la preferencia de incluir pagos entre sesiones', async () => {
    localStorage.setItem('mandarina:include-payments', 'true')
    renderDashboard()
    await screen.findByText('Débitos')

    expect(screen.getByText(/Incluyendo 1 pago de tarjeta/i)).toBeInTheDocument()
    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toContain('PAGO TC')
  })

  it('filtra por resumen individual vía prop summaryId', async () => {
    renderDashboard({ summaryId: 's2' })
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const merchants = rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).toEqual(['OTRA'])
  })

  it('avisa al padre al seleccionar un resumen en el dropdown', async () => {
    const onSummarySelect = vi.fn()
    renderDashboard({ onSummarySelect })
    await screen.findByText('Débitos')
    await userEvent.click(screen.getByRole('button', { name: /Resumen\s*Todos los resúmenes/i }))
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
    const mercadoRow = rows.find(
      (r) => within(r).getAllByRole('cell')[1].textContent === 'MERCADO LIBRE',
    )

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
    expect(screen.queryByText(/se excluye 1 pago de tarjeta/i)).toBeInTheDocument()

    const [_, ...rows] = await rowsOfTable()
    const amazonRow = rows.find((r) => within(r).getAllByRole('cell')[1].textContent === 'AMAZON')
    await userEvent.click(within(amazonRow).getByRole('button', { name: /Compras/i }))
    await userEvent.click(await screen.findByRole('button', { name: /✓\s*Pagos/i }))

    expect(update).toHaveBeenCalledWith({ category: 'Pagos' })
    expect(await screen.findByText(/se excluyen 2 pagos de tarjeta/i)).toBeInTheDocument()
    const merchants = (await rowsOfTable())
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1].textContent)
    expect(merchants).not.toContain('AMAZON')
  })

  it('guarda override recordado y lo aplica a todas las txs del comercio', async () => {
    const { update, eq, ovUpsert } = mockTx(txs)
    renderDashboard({ session: { user: { id: 'user-1' } } })
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const mercadoRow = rows.find(
      (r) => within(r).getAllByRole('cell')[1].textContent === 'MERCADO LIBRE',
    )
    await userEvent.click(within(mercadoRow).getByRole('button', { name: /Compras/i }))

    const rememberBox = await screen.findByRole('checkbox')
    await userEvent.click(rememberBox)
    expect(rememberBox).toBeChecked()
    await userEvent.click(await screen.findByRole('button', { name: /Transferencias/i }))

    expect(await screen.findByText('Guardado: MERCADO LIBRE → Transferencias')).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith({ category: 'Transferencias' })
    expect(eq).toHaveBeenCalledWith('id', '1')
    expect(ovUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', merchant: 'MERCADO LIBRE', category: 'Transferencias' },
      { onConflict: 'user_id,merchant' },
    )
  })

  it('crea una categoría custom desde la fila', async () => {
    const { ccUpsert } = mockTx(txs)
    renderDashboard({ session: { user: { id: 'user-1' } } })
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const mercadoRow = rows.find(
      (r) => within(r).getAllByRole('cell')[1].textContent === 'MERCADO LIBRE',
    )
    await userEvent.click(within(mercadoRow).getByRole('button', { name: /Compras/i }))
    await userEvent.click(await screen.findByRole('button', { name: /\+ Nueva categoría…/i }))
    await userEvent.type(
      await screen.findByPlaceholderText('Nombre de la categoría…'),
      'Hogar{Enter}',
    )

    expect(ccUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', name: 'Hogar' },
      { onConflict: 'user_id,name' },
    )
    expect(await screen.findByText('Categoría creada: Hogar')).toBeInTheDocument()
  })

  it('filtra categorías al buscar en el dropdown de la fila', async () => {
    mockTx(txs)
    renderDashboard({ session: { user: { id: 'user-1' } } })
    await screen.findByText('Débitos')

    const [_, ...rows] = await rowsOfTable()
    const mercadoRow = rows.find(
      (r) => within(r).getAllByRole('cell')[1].textContent === 'MERCADO LIBRE',
    )
    await userEvent.click(within(mercadoRow).getByRole('button', { name: /Compras/i }))

    const search = await screen.findByPlaceholderText('Buscar categoría…')
    await userEvent.type(search, 'suscrip')

    expect(screen.getByRole('button', { name: /✓\s*Suscripciones/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /✓ Transferencias/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sin categoría/i })).toBeInTheDocument()
  })

  it('muestra el badge de tipo y período en la columna Resumen', async () => {
    mockTx([
      {
        id: '1',
        date: '2026-07-01',
        merchant: 'MERCADO LIBRE',
        category: 'Compras',
        currency: 'ARS',
        amount: -1500,
        summary_id: 's1',
        card_summaries: {
          file_name: 'visa-julio.pdf',
          summary_type: 'VISA',
          period_month: 7,
          period_year: 2026,
        },
      },
    ])
    renderDashboard({ session: { user: { id: 'user-1' } } })
    await screen.findByText('Débitos')
    expect(await screen.findByText('VISA · jul 2026')).toBeInTheDocument()
  })
})
