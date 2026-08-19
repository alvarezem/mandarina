import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExcelJS from 'exceljs'
import ReportsView from './ReportsView'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'
import supabase from '../lib/supabaseClient'
import { toPdf } from '../lib/reports'

vi.mock('chart.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Chart: class {
      static register = () => {}
      constructor() {
        this.toBase64Image = () => 'data:image/png;base64,QUFBQQ=='
      }
      destroy() {}
    },
  }
})

vi.mock('../lib/reports', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, toPdf: vi.fn(() => ({ save: vi.fn() })) }
})

const TX = (overrides = {}) => ({
  id: 't1',
  date: '2026-07-01',
  merchant: 'MERCADO LIBRE',
  category: 'Compras',
  currency: 'ARS',
  amount: -1500,
  summary_id: 's1',
  card_summaries: { file_name: 'visa-julio.csv' },
  ...overrides,
})

const OPS = (overrides = {}) => ({
  id: 'o1',
  symbol: 'GGAL',
  side: 'compra',
  quantity: 10,
  price: 25,
  commission: 2,
  commission_is_pct: false,
  currency: 'ARS',
  date: '2026-07-10',
  notes: null,
  ...overrides,
})

function mockData(txs = [], ops = []) {
  supabase.mockTable('transactions', txs)
  supabase.mockTable('ledger_operations', ops)
}

const wrap = (ui, lang = 'es') =>
  render(
    <LangProvider lang={lang} setLang={() => {}}>
      <ToastProvider>{ui}</ToastProvider>
    </LangProvider>,
  )

describe('ReportsView', () => {
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
  let blobs

  beforeEach(() => {
    vi.clearAllMocks()
    blobs = []
    const local = blobs
    URL.createObjectURL = vi.fn((blob) => {
      local.push(blob)
      return `blob:${local.length}`
    })
    URL.revokeObjectURL = vi.fn()
    mockData()
  })

  afterAll(() => clickSpy.mockRestore())

  const section = (title) => screen.getByRole('heading', { name: title }).closest('section')
  const firstBlob = () => waitFor(() => expect(blobs).toHaveLength(1))

  it('muestra las tres secciones de exportación', async () => {
    mockData([TX()], [OPS()])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByRole('heading', { name: 'Exportación completa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumen impositivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export del ledger' })).toBeInTheDocument()
  })

  it('exporta CSV de transacciones con BOM y fila del resumen', async () => {
    mockData([TX({ merchant: 'Mercado Libre, S.A.' })])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Exportación completa' })

    await userEvent.click(
      within(section('Exportación completa')).getByRole('button', { name: 'CSV' }),
    )
    await firstBlob()

    const text = await blobs[0].text()
    const bytes = new Uint8Array(await blobs[0].arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(text).toContain('Fecha,Descripción,Categoría,Moneda,Monto,Resumen')
    expect(text).toContain('"Mercado Libre, S.A."')
    expect(text).toContain('visa-julio.csv')
    const anchor = clickSpy.mock.instances[0]
    expect(anchor.download).toMatch(/^mandarina-transacciones-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(screen.getByText('Exportado: CSV')).toBeInTheDocument()
  })

  it('filtra por período y moneda antes de exportar CSV', async () => {
    mockData([
      TX({ id: 'a', date: '2025-01-05', merchant: 'VIEJO', amount: -500 }),
      TX({ id: 'b', date: '2026-07-01', merchant: 'MERCADO LIBRE' }),
      TX({ id: 'c', date: '2026-07-02', merchant: 'APPLE', currency: 'USD', amount: -99 }),
    ])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Exportación completa' })

    await userEvent.selectOptions(
      within(section('Exportación completa')).getByLabelText('Período'),
      'year',
    )
    await userEvent.selectOptions(
      within(section('Exportación completa')).getByLabelText('Año'),
      '2026',
    )
    await userEvent.selectOptions(
      within(section('Exportación completa')).getByLabelText('Moneda'),
      'ARS',
    )
    await userEvent.click(
      within(section('Exportación completa')).getByRole('button', { name: 'CSV' }),
    )
    await firstBlob()

    const text = await blobs[0].text()
    expect(text).toContain('MERCADO LIBRE')
    expect(text).not.toContain('VIEJO')
    expect(text).not.toContain('APPLE')
  })

  it('exporta Excel con las 3 hojas (Transacciones, Por categoría, Por comercio)', async () => {
    mockData([TX()])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Exportación completa' })

    await userEvent.click(
      within(section('Exportación completa')).getByRole('button', { name: 'Excel' }),
    )
    await firstBlob()

    expect(blobs[0].type).toContain('spreadsheetml')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blobs[0].arrayBuffer())
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Transacciones',
      'Por categoría',
      'Por comercio',
    ])
    const ws = wb.getWorksheet('Transacciones')
    expect(ws.getCell('A2').value).toBe('2026-07-01')
    expect(ws.getCell('E2').value).toBe(-1500)
    const cat = wb.getWorksheet('Por categoría')
    expect(cat.getCell('A2').value).toBe('ARS')
    expect(cat.getCell('B2').value).toBe('Compras')
    expect(screen.getByText('Exportado: Excel')).toBeInTheDocument()
  })

  it('exporta PDF de transacciones con tablas de categoría y comercio', async () => {
    mockData([TX()])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Exportación completa' })

    await userEvent.click(
      within(section('Exportación completa')).getByRole('button', { name: 'PDF' }),
    )

    expect(toPdf).toHaveBeenCalledTimes(1)
    const arg = toPdf.mock.calls[0][0]
    expect(arg.title).toBe('Exportación completa')
    expect(arg.tables.map((t) => t.title)).toEqual(['Por categoría', 'Por comercio'])
    expect(arg.meta[2].label).toBe('Transacciones')
    expect(screen.getByText('Exportado: PDF')).toBeInTheDocument()
  })

  it('avisa y no exporta cuando no hay transacciones', async () => {
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByText('No hay transacciones que coincidan con los filtros.')

    await userEvent.click(
      within(section('Exportación completa')).getByRole('button', { name: 'CSV' }),
    )

    expect(screen.getByText('No hay datos para exportar')).toBeInTheDocument()
    expect(blobs).toHaveLength(0)
  })

  it('exporta el resumen impositivo en PDF con el doughnut embebido', async () => {
    mockData([
      TX({ date: '2026-02-10', category: 'Compras' }),
      TX({ date: '2026-03-05', category: 'Suscripciones', merchant: 'NETFLIX', amount: -2000 }),
      TX({
        date: '2026-04-01',
        merchant: 'APPLE',
        category: 'Compras',
        amount: -99,
        currency: 'USD',
      }),
      TX({ date: '2026-05-02', merchant: 'VISA', category: 'Pagos', amount: -50000 }),
      TX({ date: '2025-12-01', merchant: 'VIEJO', amount: -300 }),
    ])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Resumen impositivo' })

    await userEvent.selectOptions(
      within(section('Resumen impositivo')).getByLabelText('Año'),
      '2026',
    )
    await userEvent.click(
      within(section('Resumen impositivo')).getByRole('button', { name: 'PDF' }),
    )

    expect(toPdf).toHaveBeenCalledTimes(1)
    const arg = toPdf.mock.calls[0][0]
    expect(arg.title).toBe('Resumen impositivo 2026')
    expect(arg.chartImage).toMatch(/^data:image\/png;base64,/)
    expect(arg.tables.map((t) => t.title)).toEqual([
      'Gastos por categoría (ARS)',
      'Top comercios (ARS)',
      'Gastos por categoría (USD)',
      'Top comercios (USD)',
    ])
    const usdCat = arg.tables[2].rows
    expect(usdCat.some((r) => r[0] === 'Compras')).toBe(true)
    const { save } = toPdf.mock.results[0].value
    expect(save).toHaveBeenCalledWith('mandarina-impositivo-2026.pdf')
    expect(screen.getByText('Exportado: PDF')).toBeInTheDocument()
  })

  it('el CSV impositivo excluye Pagos y filtra por año', async () => {
    mockData([
      TX({ id: 'a', date: '2026-02-10', category: 'Compras' }),
      TX({ id: 'b', date: '2026-05-02', merchant: 'VISA', category: 'Pagos', amount: -50000 }),
      TX({ id: 'c', date: '2025-12-01', merchant: 'VIEJO', amount: -300 }),
    ])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Resumen impositivo' })

    await userEvent.selectOptions(
      within(section('Resumen impositivo')).getByLabelText('Año'),
      '2026',
    )
    await userEvent.click(
      within(section('Resumen impositivo')).getByRole('button', { name: 'CSV' }),
    )
    await firstBlob()

    const text = await blobs[0].text()
    expect(text).toContain('Compras')
    expect(text).not.toContain('Pagos')
    expect(text).not.toContain('VIEJO')
    expect(blobs[0].type).toContain('csv')
  })

  it('exporta el ledger en Excel con operaciones y resumen por símbolo', async () => {
    mockData(
      [TX()],
      [OPS(), OPS({ id: 'o2', symbol: 'AAPL', quantity: 3, price: 200, currency: 'USD' })],
    )
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Export del ledger' })

    await userEvent.click(
      within(section('Export del ledger')).getByRole('button', { name: 'Excel' }),
    )
    await firstBlob()

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blobs[0].arrayBuffer())
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Operaciones', 'Resumen por símbolo'])
    const ops = wb.getWorksheet('Operaciones')
    expect(ops.getCell('B2').value).toBe('GGAL')
    expect(ops.getCell('I2').value).toBe(252)
    const bySymbol = wb.getWorksheet('Resumen por símbolo')
    expect(bySymbol.getCell('A2').value).toBe('AAPL')
    expect(bySymbol.getCell('A3').value).toBe('GGAL')
    expect(bySymbol.getCell('E3').value).toBe(252)
  })

  it('exporta el ledger en PDF con totales por moneda', async () => {
    mockData(
      [TX()],
      [OPS(), OPS({ id: 'o2', symbol: 'AAPL', quantity: 3, price: 200, currency: 'USD' })],
    )
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Export del ledger' })

    await userEvent.click(within(section('Export del ledger')).getByRole('button', { name: 'PDF' }))

    const arg = toPdf.mock.calls[0][0]
    expect(arg.meta.map((m) => m.label)).toEqual([
      'Invertido (ARS)',
      'Invertido (USD)',
      'Operaciones',
    ])
    expect(arg.tables.map((t) => t.title)).toEqual(['Resumen por símbolo', 'Operaciones'])
    expect(arg.tables[1].rows[0][2]).toBe('Compra')
  })

  it('muestra el estado vacío del ledger', async () => {
    mockData([TX()], [])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    await screen.findByRole('heading', { name: 'Export del ledger' })
    expect(screen.getByText('No registraste operaciones todavía.')).toBeInTheDocument()
  })

  it('muestra el error de carga de transacciones', async () => {
    supabase.mockTable('transactions', [], { message: 'boom' })
    supabase.mockTable('ledger_operations', [])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('No se pudieron cargar los datos')).toBeInTheDocument()
  })

  it('traduce las secciones y los filtros al inglés', async () => {
    mockData([TX()])
    wrap(<ReportsView session={{ user: { id: 'u1' } }} />, 'en')
    expect(await screen.findByRole('heading', { name: 'Full export' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fiscal summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ledger export' })).toBeInTheDocument()
  })
})
