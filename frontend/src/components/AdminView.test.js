import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminView from './AdminView'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'
import supabase from '../lib/supabaseClient'

const overview = {
  requests: [
    {
      user_id: 'u2',
      email: 'b@b.com',
      status: 'pending',
      created_at: '2026-08-19T10:00:00Z',
    },
  ],
  users: [
    {
      user_id: 'u1',
      email: 'a@b.com',
      created_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: null,
      plan: 'pro',
      status: 'active',
    },
    {
      user_id: 'u2',
      email: 'b@b.com',
      created_at: '2026-08-01T00:00:00Z',
      last_sign_in_at: null,
      plan: null,
      status: null,
    },
  ],
}

const wrap = (ui, lang = 'es') =>
  render(
    <LangProvider lang={lang} setLang={() => {}}>
      <ToastProvider>{ui}</ToastProvider>
    </LangProvider>,
  )

const renderView = () => wrap(<AdminView session={{ user: { id: 'u1', email: 'a@b.com' } }} />)

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.rpc.mockResolvedValue({ data: overview, error: null })
  })

  it('muestra contadores, solicitudes pendientes y suscriptos', async () => {
    renderView()
    expect(
      await screen.findByRole('heading', { name: 'Panel de administración' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Pro activos')).toBeInTheDocument()
    expect(screen.getAllByText('Solicitudes pendientes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('b@b.com').length).toBeGreaterThan(0)
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Activar' }).length).toBe(2)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
  })

  it('activa Pro desde una solicitud con el RPC y avisa', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Activar' })[0])

    expect(supabase.rpc).toHaveBeenCalledWith('admin_set_subscription', {
      p_user_id: 'u2',
      p_status: 'active',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('b@b.com ahora es Pro')
  })

  it('cancela Pro de un suscripto con el RPC', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(supabase.rpc).toHaveBeenCalledWith('admin_set_subscription', {
      p_user_id: 'u1',
      p_status: 'canceled',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Pro cancelado para a@b.com')
  })

  it('descarta una solicitud con el RPC', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(supabase.rpc).toHaveBeenCalledWith('admin_dismiss_request', { p_user_id: 'u2' })
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud de b@b.com descartada')
  })

  it('muestra error de carga y toast de error en las acciones', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    renderView()
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('traduce al inglés', async () => {
    wrap(<AdminView session={{ user: { id: 'u1', email: 'a@b.com' } }} />, 'en')
    expect(await screen.findByRole('heading', { name: 'Admin panel' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Activate' }).length).toBeGreaterThan(0)
  })
})
