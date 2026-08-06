import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvestmentsView from './InvestmentsView'

jest.mock('./InvestmentPlan', () => ({ session, display, setDisplay, rateMode, setRateMode }) => (
  <div data-testid="mock-plan">
    <span>Plan {display} {rateMode}</span>
    <button type="button" onClick={() => setDisplay('USD')}>
      cambiar a USD
    </button>
  </div>
))
jest.mock('./MarketQuotes', () => ({ session, display, rateMode }) => (
  <div data-testid="mock-quotes">Cotizaciones {display} {rateMode}</div>
))

const wrap = (ui) => render(ui)

describe('InvestmentsView', () => {
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
    expect(screen.queryByTestId('mock-plan')).not.toBeInTheDocument()
  })

  it('comparte ARS/USD entre ambas vistas', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    await userEvent.click(screen.getByRole('button', { name: 'cambiar a USD' }))
    expect(screen.getByTestId('mock-plan')).toHaveTextContent('Plan USD CCL')

    await userEvent.click(screen.getByRole('tab', { name: 'Cotizaciones en vivo' }))
    expect(screen.getByTestId('mock-quotes')).toHaveTextContent('Cotizaciones USD CCL')
  })
})
