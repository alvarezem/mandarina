import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvestmentsView from './InvestmentsView'
import ToastProvider from './Toast'

jest.mock('./InvestmentPlan', () => () => <div data-testid="mock-plan">Plan de inversión</div>)
jest.mock('./MarketQuotes', () => () => <div data-testid="mock-quotes">Cotizaciones en vivo</div>)

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

describe('InvestmentsView', () => {
  it('muestra el plan por defecto', () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    const tablist = screen.getByRole('tablist', { name: 'Secciones de Inversiones' })
    expect(tablist).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plan de inversión' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('mock-plan')).toBeInTheDocument()
  })

  it('cambia a cotizaciones en vivo', async () => {
    wrap(<InvestmentsView session={{ user: { id: 'u1' } }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Cotizaciones en vivo' }))
    expect(screen.getByRole('tab', { name: 'Cotizaciones en vivo' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('mock-quotes')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-plan')).not.toBeInTheDocument()
  })
})
