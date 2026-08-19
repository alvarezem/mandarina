import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProUpsell from './ProUpsell'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'

const wrap = (ui, lang = 'es') =>
  render(
    <LangProvider lang={lang} setLang={() => {}}>
      <ToastProvider>{ui}</ToastProvider>
    </LangProvider>,
  )

describe('ProUpsell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra título, features y CTA de suscripción', () => {
    wrap(<ProUpsell />)
    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mandarina Pro' })).toBeInTheDocument()
    expect(screen.getByText('Exportación completa a Excel')).toBeInTheDocument()
    expect(screen.getByText('Exportación a CSV')).toBeInTheDocument()
    expect(screen.getByText('Reportes en PDF')).toBeInTheDocument()
    expect(screen.getByText('Resumen impositivo anual')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suscribirme' })).toBeInTheDocument()
  })

  it('avisa con toast que el cobro llega pronto al tocar Suscribirme', async () => {
    wrap(<ProUpsell />)
    await userEvent.click(screen.getByRole('button', { name: 'Suscribirme' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/El cobro por MercadoPago llega pronto/)
  })

  it('traduce los textos al inglés', () => {
    wrap(<ProUpsell />, 'en')
    expect(screen.getByRole('heading', { name: 'Mandarina Pro' })).toBeInTheDocument()
    expect(screen.getByText('Full Excel export')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })
})
