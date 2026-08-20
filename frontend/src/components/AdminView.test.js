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
      banned_until: null,
      plan: 'pro',
      status: 'active',
      current_period_end: '2027-01-19T10:00:00Z',
    },
    {
      user_id: 'u2',
      email: 'b@b.com',
      created_at: '2026-08-01T00:00:00Z',
      last_sign_in_at: null,
      banned_until: null,
      plan: null,
      status: null,
      current_period_end: null,
    },
  ],
}

const wrap = (ui, lang = 'es') =>
  render(
    <LangProvider lang={lang} setLang={() => {}}>
      <ToastProvider>{ui}</ToastProvider>
    </LangProvider>,
  )

const renderView = () => wrap(<AdminView currentUserId="u1" />)

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.rpc.mockResolvedValue({ data: overview, error: null })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('muestra la columna Vence con la duración restante del Pro activo', async () => {
    renderView()
    expect(
      await screen.findByRole('heading', { name: 'Panel de administración' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Vence')).toBeInTheDocument()
    expect(screen.getByText(/2027/)).toBeInTheDocument()
    expect(screen.getByText('· 4 meses')).toBeInTheDocument()
  })

  it('activa Pro desde una solicitud con el RPC (meses por defecto) y avisa', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Activar' })[0])

    expect(supabase.rpc).toHaveBeenCalledWith('admin_set_subscription', {
      p_user_id: 'u2',
      p_status: 'active',
      p_months: 1,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('b@b.com ahora es Pro')
  })

  it('activa con la duración elegida en el selector', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    const selects = screen.getAllByRole('combobox', { name: 'Duración' })
    await userEvent.selectOptions(selects[0], '6')
    await userEvent.click(screen.getAllByRole('button', { name: 'Activar' })[0])

    expect(supabase.rpc).toHaveBeenCalledWith('admin_set_subscription', {
      p_user_id: 'u2',
      p_status: 'active',
      p_months: 6,
    })
  })

  it('cancela Pro de un suscripto con confirmación', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(window.confirm).toHaveBeenCalled()
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

  it('deshabilita una cuenta con confirmación y el RPC de ban', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })

    await userEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(supabase.rpc).toHaveBeenCalledWith('admin_ban_user', {
      p_user_id: 'u2',
      p_banned_until: expect.stringMatching(/^2[0-9]{3}-/),
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta de b@b.com deshabilitada')
  })

  it('no ofrece deshabilitar la propia cuenta (owner)', async () => {
    renderView()
    await screen.findByRole('heading', { name: 'Panel de administración' })
    const banButtons = screen.getAllByRole('button', { name: 'Deshabilitar' })
    expect(banButtons).toHaveLength(1)
  })

  it('muestra badge Bloqueado y permite habilitar la cuenta', async () => {
    const bannedOverview = {
      requests: [],
      users: [
        {
          user_id: 'u1',
          email: 'a@b.com',
          created_at: '2026-01-01T00:00:00Z',
          last_sign_in_at: null,
          banned_until: null,
          plan: 'pro',
          status: 'active',
          current_period_end: null,
        },
        {
          user_id: 'u3',
          email: 'c@c.com',
          created_at: '2026-08-01T00:00:00Z',
          last_sign_in_at: null,
          banned_until: '2999-01-01T00:00:00Z',
          plan: null,
          status: null,
          current_period_end: null,
        },
      ],
    }
    supabase.rpc.mockResolvedValue({ data: bannedOverview, error: null })
    renderView()
    expect(await screen.findByText('Bloqueado')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Habilitar' }))

    expect(supabase.rpc).toHaveBeenCalledWith('admin_ban_user', {
      p_user_id: 'u3',
      p_banned_until: null,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Cuenta de c@c.com habilitada')
  })

  it('muestra error de carga y toast de error en las acciones', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    renderView()
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('traduce al inglés', async () => {
    wrap(<AdminView currentUserId="u1" />, 'en')
    expect(await screen.findByRole('heading', { name: 'Admin panel' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Activate' }).length).toBeGreaterThan(0)
  })
})
