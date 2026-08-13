import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FiltersBar from './FiltersBar'

const SUMMARY_OPTIONS = [
  { id: 's1', name: 'visa-julio.pdf' },
  { id: 's2', name: 'mc-junio.csv' },
]

const defaultProps = {
  period: 'todo',
  onPeriod: vi.fn(),
  customFrom: '',
  customTo: '',
  onCustomFrom: vi.fn(),
  onCustomTo: vi.fn(),
  summaryOptions: SUMMARY_OPTIONS,
  summaryId: null,
  onSummarySelect: vi.fn(),
  categoryOptions: ['Compras', 'Pagos', 'Suscripciones'],
  categories: [],
  onToggleCategory: vi.fn(),
  onClearCategories: vi.fn(),
  currency: 'all',
  onCurrency: vi.fn(),
  query: '',
  onQuery: vi.fn(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
}

const renderBar = (props = {}) => render(<FiltersBar {...defaultProps} {...props} />)

const openButton = (name) => screen.getByRole('button', { name: new RegExp(name) })

describe('FiltersBar', () => {
  it('selecciona un período y dispara onPeriod', async () => {
    renderBar()
    await userEvent.click(openButton('Período'))
    await userEvent.click(screen.getByRole('button', { name: 'Últimos 3 meses' }))
    expect(defaultProps.onPeriod).toHaveBeenCalledWith('last3m')
  })

  it('muestra el resumen del período activo', () => {
    renderBar({ period: 'thisMonth' })
    expect(openButton('Período')).toHaveTextContent('Este mes')
  })

  it('muestra inputs de fecha en el período personalizado y edita desde/hasta', async () => {
    const onCustomFrom = vi.fn()
    const onCustomTo = vi.fn()
    renderBar({ period: 'custom', onCustomFrom, onCustomTo })
    expect(openButton('Período')).toHaveTextContent('Personalizado')
    await userEvent.click(openButton('Período'))

    const [from, to] = document.querySelectorAll('input[type="date"]')
    expect(from).toBeInTheDocument()
    expect(to).toBeInTheDocument()

    fireEvent.change(from, { target: { value: '2026-08-01' } })
    expect(onCustomFrom).toHaveBeenCalledWith('2026-08-01')
    fireEvent.change(to, { target: { value: '2026-08-31' } })
    expect(onCustomTo).toHaveBeenCalledWith('2026-08-31')
  })

  it('filtra por resumen y muestra el seleccionado como summary', async () => {
    const onSummarySelect = vi.fn()
    renderBar({ summaryId: 's1', onSummarySelect })
    expect(openButton('Resumen')).toHaveTextContent('visa-julio.pdf')
    await userEvent.click(openButton('Resumen'))
    await userEvent.click(screen.getByRole('button', { name: /mc-junio\.csv/ }))
    expect(onSummarySelect).toHaveBeenCalledWith('s2')
  })

  it('muestra placeholder (sin resúmenes) cuando no hay opciones', async () => {
    renderBar({ summaryOptions: [] })
    await userEvent.click(openButton('Resumen'))
    expect(screen.getByText('(sin resúmenes)')).toBeInTheDocument()
  })

  it('alterna categorías y muestra el conteo como summary', async () => {
    const onToggleCategory = vi.fn()
    renderBar({ categories: ['Compras', 'Pagos'], onToggleCategory })
    expect(openButton('Categorías')).toHaveTextContent('2 seleccionadas')
    await userEvent.click(openButton('Categorías'))
    await userEvent.click(screen.getByRole('button', { name: /Suscripciones/ }))
    expect(onToggleCategory).toHaveBeenCalledWith('Suscripciones')
  })

  it('muestra Limpiar cuando hay categorías y llama onClearCategories', async () => {
    const onClearCategories = vi.fn()
    renderBar({ categories: ['Compras'], onClearCategories })
    await userEvent.click(openButton('Categorías'))
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onClearCategories).toHaveBeenCalled()
  })

  it('selecciona la moneda', async () => {
    const onCurrency = vi.fn()
    renderBar({ currency: 'ARS', onCurrency })
    expect(openButton('Moneda')).toHaveTextContent('ARS')
    await userEvent.click(openButton('Moneda'))
    await userEvent.click(screen.getByRole('button', { name: /Ambas/ }))
    expect(onCurrency).toHaveBeenCalledWith('all')
  })

  it('escribe en el buscador de comercios', async () => {
    const onQuery = vi.fn()
    renderBar({ onQuery })
    await userEvent.type(screen.getByPlaceholderText(/Buscar comercio/i), 'mercado')
    expect(onQuery).toHaveBeenCalledTimes('mercado'.length)
  })

  it('muestra el botón de limpiar filtros solo con filtros activos', async () => {
    const onClearFilters = vi.fn()
    const { rerender } = renderBar({ hasActiveFilters: false, onClearFilters })
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()

    rerender(<FiltersBar {...defaultProps} hasActiveFilters onClearFilters={onClearFilters} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalled()
  })
})
