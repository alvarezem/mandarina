import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProUpsell from './ProUpsell'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'
import supabase from '../lib/supabaseClient'

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

  it('registra la solicitud con el RPC y avisa al tocar Suscribirme', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })
    wrap(<ProUpsell />)
    await userEvent.click(screen.getByRole('button', { name: 'Suscribirme' }))

    expect(supabase.rpc).toHaveBeenCalledWith('request_pro')
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Solicitud enviada')
    expect(screen.getByRole('button', { name: 'Solicitud enviada' })).toBeDisabled()
  })

  it('muestra toast de error si el RPC falla', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    wrap(<ProUpsell />)
    await userEvent.click(screen.getByRole('button', { name: 'Suscribirme' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('No se pudo enviar la solicitud')
  })

  it('traduce los textos al inglés', () => {
    wrap(<ProUpsell />, 'en')
    expect(screen.getByRole('heading', { name: 'Mandarina Pro' })).toBeInTheDocument()
    expect(screen.getByText('Full Excel export')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })
})
