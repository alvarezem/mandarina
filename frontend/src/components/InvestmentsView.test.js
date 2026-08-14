import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvestmentsView from './InvestmentsView'

vi.mock('./InvestmentPlan', () => ({
  default: ({ display, setDisplay, rateMode, sort, onSort }) => (
    <div data-testid="mock-plan">
      <span>
        Plan {display} {rateMode} {sort.key}:{sort.dir}
      </span>
      <button type="button" onClick={() => setDisplay('USD')}>
        cambiar a USD
      </button>
      <button type="button" onClick={() => onSort('price')}>
        ordenar por precio
      </button>
    </div>
  ),
}))
vi.mock('./MarketQuotes', () => ({
  default: ({ display, rateMode, sort }) => (
    <div data-testid="mock-quotes">
      Cotizaciones {display} {rateMode} {sort.key}:{sort.dir}
    </div>
  ),
}))
vi.mock('./Watchlist', () => ({
  default: ({ display, rateMode }) => (
    <div data-testid="mock-watchlist">
      Watchlist {display} {rateMode}
    </div>
  ),
}))
vi.mock('./LedgerView', () => ({
  default: ({ display, rateMode }) => (
    <div data-testid="mock-ledger">
      Ledger {display} {rateMode}
    </div>
  ),
}))

const wrap = (ui) => render(ui)

describe('InvestmentsView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra el plan por defecto con estado compartido inicial', () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    const tablist = screen.getByRole('tablist', { name: 'Secciones de Inversiones' })
    expect(tablist).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plan de inversión' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('Plan ARS CCL')
  })

  it('cambia a cotizaciones en vivo con el mismo estado compartido', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Cotizaciones en vivo' }))
    expect(screen.getByRole('tab', { name: 'Cotizaciones en vivo' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('mock-quotes')).toHaveTextContent('Cotizaciones ARS CCL')
    expect(screen.getByTestId('mock-watchlist')).toHaveTextContent('Watchlist ARS CCL')
    expect(screen.queryByTestId('mock-plan')).not.toBeInTheDocument()
  })

  it('comparte ARS/USD entre ambas vistas', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    await userEvent.click(screen.getByRole('button', { name: 'cambiar a USD' }))
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('Plan USD CCL')

    await userEvent.click(screen.getByRole('tab', { name: 'Cotizaciones en vivo' }))
    expect(screen.getByTestId('mock-quotes')).toHaveTextContent('Cotizaciones USD CCL')
    expect(screen.getByTestId('mock-watchlist')).toHaveTextContent('Watchlist USD CCL')
  })

  it('cambia a operaciones con el estado compartido', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Operaciones' }))
    expect(screen.getByRole('tab', { name: 'Operaciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('mock-ledger')).toHaveTextContent('Ledger ARS CCL')
    expect(screen.queryByTestId('mock-plan')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-quotes')).not.toBeInTheDocument()
  })

  it('inicia con % Meta desc y comparte el orden con Cotizaciones, persistiéndolo', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('target_weight:desc')

    await userEvent.click(screen.getByRole('button', { name: 'ordenar por precio' }))
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('price:desc')
    expect(localStorage.getItem('mandarina:plan:sort:u1')).toBe(
      JSON.stringify({ key: 'price', dir: 'desc' }),
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Cotizaciones en vivo' }))
    expect(screen.getByTestId('mock-quotes')).toHaveTextContent('price:desc')
  })

  it('restaura la preferencia guardada al montar', () => {
    localStorage.setItem('mandarina:plan:sort:u1', JSON.stringify({ key: 'value', dir: 'desc' }))
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('value:desc')
  })
})
