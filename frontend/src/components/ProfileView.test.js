import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileView from './ProfileView'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'
import { ProProvider } from './ProProvider'
import supabase from '../lib/supabaseClient'

const session = { user: { id: 'u1', email: 'a@b.com', created_at: '2026-01-01T00:00:00Z' } }

const wrap = (ui, lang = 'es') =>
  render(
    <LangProvider lang={lang} setLang={() => {}}>
      <ToastProvider>
        <ProProvider userId="u1">{ui}</ProProvider>
      </ToastProvider>
    </LangProvider>,
  )

const renderView = (props = {}) => wrap(<ProfileView session={session} {...props} />)

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.mockTable('pro_requests', [])
    supabase.mockTable('subscriptions', [])
  })

  it('muestra los datos de la cuenta y el estado gratis', async () => {
    renderView()
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText('Plan gratis')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar Pro' })).toBeInTheDocument()
  })

  it('solicita Pro con el RPC y pasa a estado pendiente', async () => {
    supabase.rpc.mockImplementation(() => {
      supabase.mockTable('pro_requests', [{ user_id: 'u1', status: 'pending' }])
      return Promise.resolve({ data: null, error: null })
    })
    renderView()
    await screen.findByText('Plan gratis')

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Pro' }))

    expect(supabase.rpc).toHaveBeenCalledWith('request_pro')
    expect(await screen.findByText('Solicitud pendiente')).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud enviada')
  })

  it('deshabilita el botón cuando ya hay una solicitud pendiente', async () => {
    supabase.mockTable('pro_requests', [{ user_id: 'u1', status: 'pending' }])
    renderView()
    expect(await screen.findByText('Solicitud pendiente')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Solicitud enviada' })
    expect(btn).toBeDisabled()
  })

  it('muestra Pro activo cuando el usuario ya es Pro (sin botón)', async () => {
    supabase.mockTable('subscriptions', [{ id: 's1', user_id: 'u1', status: 'active' }])
    renderView()
    expect(await screen.findByText('Pro activo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Solicitar Pro' })).not.toBeInTheDocument()
  })

  it('muestra la fecha de vencimiento cuando hay período', async () => {
    supabase.mockTable('subscriptions', [
      { id: 's1', user_id: 'u1', status: 'active', current_period_end: '2026-12-31T00:00:00Z' },
    ])
    renderView()
    expect(await screen.findByText(/Pro activo hasta/)).toBeInTheDocument()
    expect(screen.getByText(/diciembre de 2026/)).toBeInTheDocument()
  })

  it('muestra toast de error si el RPC falla', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    renderView()
    await screen.findByText('Plan gratis')

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Pro' }))

    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo enviar la solicitud')
  })

  it('traduce al inglés', async () => {
    wrap(<ProfileView session={session} />, 'en')
    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request Pro' })).toBeInTheDocument()
  })
})
