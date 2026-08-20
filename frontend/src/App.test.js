import { render, screen, waitFor, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import App from './App'
import supabase from './lib/supabaseClient'

const session = { user: { id: 'u1', email: 'a@b.com' } }

const EMPTY_STATE = 'Subí un resumen para empezar.'

function mockApp(txs, summaries = []) {
  supabase.mockTable('transactions', txs)
  supabase.mockTable('card_summaries', summaries)
  supabase.mockTable('merchant_overrides', [])
  supabase.mockTable('custom_categories', [])
}

describe('App', () => {
  let authListener

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('mandarina:tour:u1', '1')
    Object.defineProperty(navigator, 'language', { value: 'es-AR', configurable: true })
    authListener = vi.fn()
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      authListener = cb
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })
    supabase.auth.signOut.mockResolvedValue({ error: null })
    supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    supabase.functions.invoke.mockResolvedValue({})
    supabase.storage.from.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) })
    mockApp([])
  })

  const signIn = (user) =>
    act(() => {
      authListener('SIGNED_IN', { user })
    })

  it('muestra la pantalla de auth cuando no hay sesión', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<App />)
    expect(await screen.findByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra el toast de logout con estilo de éxito (no error)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    const toast = (await screen.findByText('¡Nos vemos!')).closest('[role="status"]')
    expect(toast).not.toBeNull()
    expect(toast.className).toContain('border-emerald-200')
    expect(toast.className).toContain('text-emerald-700')
    expect(toast.className).not.toContain('brand')
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('saluda con "¡Bienvenido/a!" la primera vez que inicia sesión (mano saludando)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    signIn({
      id: 'u1',
      email: 'a@b.com',
      created_at: '2026-01-01T00:00:00.000Z',
      last_sign_in_at: '2026-01-01T00:00:00.000Z',
    })

    expect(await screen.findByText('¡Bienvenido/a a Mandarina!')).toBeInTheDocument()
    expect(screen.getByTestId('toast-icon-wave')).toBeInTheDocument()
  })

  it('saluda con "¡Volviste!" cuando vuelve a iniciar sesión', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    signIn({
      id: 'u1',
      email: 'a@b.com',
      created_at: '2026-01-01T00:00:00.000Z',
      last_sign_in_at: '2026-01-05T00:00:00.000Z',
    })

    const toast = await screen.findByText('¡Volviste! 😂')
    expect(toast).toBeInTheDocument()
    expect(
      toast.closest('[role="status"]').querySelector('[data-testid="toast-icon-wave"]'),
    ).not.toBeInTheDocument()
  })

  it('muestra las top 3 posiciones con su variación al iniciar sesión', async () => {
    const plan = [
      { id: '1', symbol: 'VIST', target_weight: 20 },
      { id: '2', symbol: 'QQQ', target_weight: 14 },
      { id: '3', symbol: 'KO', target_weight: 12 },
    ]
    supabase.mockTable('portfolio_plan', plan)
    supabase.mockTable('transactions', [])
    supabase.mockTable('card_summaries', [])
    supabase.mockTable('merchant_overrides', [])
    supabase.mockTable('custom_categories', [])
    supabase.functions.invoke.mockResolvedValue({
      data: {
        quotes: {
          VIST: { price: 34920, changePct: 1.2 },
          QQQ: { price: 56400, changePct: -0.5 },
          KO: { price: 27320, changePct: null },
        },
      },
    })

    render(<App />)
    await screen.findByText(EMPTY_STATE)

    signIn({
      id: 'u1',
      email: 'a@b.com',
      created_at: '2026-01-01T00:00:00.000Z',
      last_sign_in_at: '2026-01-01T00:00:00.000Z',
    })

    const up = await screen.findByText('VIST ▲1.20%')
    expect(up.closest('[role="status"]')).toHaveTextContent(
      'Tus posiciones: VIST ▲1.20% · QQQ ▼0.50% · KO —',
    )
    expect(up.className).toContain('text-emerald-600')
    const down = screen.getByText(/QQQ ▼0\.50%/)
    expect(down.className).toContain('text-red-600')
    expect(screen.getByText(/KO —/).className).toBe('')
    expect(screen.getByTestId('toast-icon-trend')).toBeInTheDocument()
  })

  it('no saluda ni busca posiciones al restaurar la sesión guardada (refresh)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    expect(screen.queryByText(/¡Bienvenido|¡Volviste!/)).not.toBeInTheDocument()
  })

  it('muestra la pantalla de nueva contraseña ante PASSWORD_RECOVERY (sin dashboard ni saludo)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    act(() => authListener('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'a@b.com' } }))

    expect(await screen.findByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    expect(screen.queryByText(/¡Bienvenido|¡Volviste!/)).not.toBeInTheDocument()
  })

  it('cambia la contraseña desde el recovery, cierra la sesión y vuelve al login', async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: null })
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    act(() => authListener('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'a@b.com' } }))
    await screen.findByRole('heading', { name: 'Nueva contraseña' })

    await userEvent.type(screen.getByLabelText('Contraseña'), 'Abc12345')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Abc12345')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Abc12345' })
    expect(supabase.auth.signOut).toHaveBeenCalled()

    act(() => authListener('SIGNED_OUT', null))
    expect(await screen.findByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  describe('navegación rail (lg+)', () => {
    it('muestra header con hamburguesa, logo Mandarina y rail con Resúmenes activo', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument()
      expect(screen.getByText('Mandarina')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(within(rail).getByRole('button', { name: 'Resúmenes' }).className).toContain(
        'bg-brand-50',
      )
      expect(within(rail).getByRole('button', { name: /Inversiones/ })).toBeInTheDocument()
    })

    it('oculta el grupo móvil en lg para que el branding quede a la izquierda', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const mobileGroup = screen.getByRole('button', { name: 'Abrir menú' }).parentElement
      expect(mobileGroup).toHaveClass('flex-1')
      expect(mobileGroup).toHaveClass('lg:hidden')
    })

    it('navega a Inversiones y muestra el plan de inversión vacío', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await userEvent.click(within(rail).getByRole('button', { name: /Inversiones/ }))

      expect(await screen.findByRole('heading', { name: 'Plan de inversión' })).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
    })

    it('navega a Resúmenes y permite abrir la pestaña de carga', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await userEvent.click(within(rail).getByRole('button', { name: /Resúmenes/ }))

      const tabs = screen.getByRole('tablist', { name: 'Secciones de resúmenes' })
      await userEvent.click(within(tabs).getByRole('tab', { name: 'Resúmenes' }))

      expect(await screen.findByText('Subir resumen')).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    })

    it('muestra Reportes deshabilitado en el rail cuando no es Pro', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      const reportes = within(rail).getByText('Reportes')
      expect(reportes).toBeInTheDocument()
      expect(within(rail).getByText('Mejora a Pro')).toBeInTheDocument()
      expect(reportes.closest('[aria-disabled="true"]')).toBeInTheDocument()
    })

    it('muestra Reportes en el rail cuando es Pro', async () => {
      supabase.mockTable('subscriptions', [{ id: 's1', status: 'active' }])
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await waitFor(() =>
        expect(within(rail).getByRole('button', { name: 'Reportes' })).toBeInTheDocument(),
      )
    })

    it('oculta Admin del rail cuando no es admin', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(within(rail).queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('muestra Admin en el rail cuando es admin', async () => {
      supabase.mockTable('admins', [{ user_id: 'u1' }])
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await waitFor(() =>
        expect(within(rail).getByRole('button', { name: 'Admin' })).toBeInTheDocument(),
      )
    })

    it('el avatar del header abre el perfil', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir mi perfil' }))

      expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
    })

    it('cambia entre las pestañas Egresos e Ingresos', async () => {
      mockApp([
        {
          id: 'i1',
          date: '2026-07-01',
          merchant: 'SUELDO',
          category: 'Ingresos',
          currency: 'ARS',
          amount: 500000,
          summary_id: 's1',
          card_summaries: { file_name: 'resumen.csv' },
        },
        {
          id: 'x1',
          date: '2026-07-02',
          merchant: 'MERCADO LIBRE',
          category: 'Compras',
          currency: 'ARS',
          amount: -1500,
          summary_id: 's1',
          card_summaries: { file_name: 'resumen.csv' },
        },
      ])
      render(<App />)
      await screen.findByText('Débitos')

      const tabs = screen.getByRole('tablist', { name: 'Secciones de resúmenes' })
      await userEvent.click(within(tabs).getByRole('tab', { name: 'Ingresos' }))

      expect(await screen.findByText('Mayor ingreso ARS')).toBeInTheDocument()
      expect(screen.queryByText('Débitos')).not.toBeInTheDocument()
      expect(screen.getByText('Ingresos acumulados')).toBeInTheDocument()

      await userEvent.click(within(tabs).getByRole('tab', { name: 'Egresos' }))
      expect(await screen.findByText('Débitos')).toBeInTheDocument()
    })

    it('expande y colapsa el rail con el hamburguesa del header', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(rail.className).toContain('w-52')
      expect(screen.getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Colapsar barra' }))
      expect(rail.className).toContain('w-16')
      expect(screen.getByRole('button', { name: 'Expandir barra' })).toBeInTheDocument()
      expect(screen.getByText('Mandarina')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Expandir barra' }))
      expect(rail.className).toContain('w-52')
      expect(screen.getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()
    })
  })

  describe('navegación móvil (<lg)', () => {
    it('la hamburguesa abre el drawer con nav, email y Cerrar sesión', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      expect(drawer.className).toContain('w-72')
      expect(within(drawer).getByRole('button', { name: 'Resúmenes' })).toBeInTheDocument()
      expect(within(drawer).getByRole('button', { name: 'Inversiones' })).toBeInTheDocument()
      expect(within(drawer).getByText('a@b.com')).toBeInTheDocument()
      expect(within(drawer).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    })

    it('navega a Resúmenes desde el drawer y abre la pestaña de carga', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(drawer).getByRole('button', { name: 'Resúmenes' }))

      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()

      const tabs = screen.getByRole('tablist', { name: 'Secciones de resúmenes' })
      await userEvent.click(within(tabs).getByRole('tab', { name: 'Resúmenes' }))

      expect(await screen.findByText('Subir resumen')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    })

    it('cambia de vista desde el drawer y lo cierra', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(drawer).getByRole('button', { name: 'Inversiones' }))

      expect(await screen.findByRole('heading', { name: 'Plan de inversión' })).toBeInTheDocument()
      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()
    })

    it('cierra el drawer con la X', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(drawer).getByRole('button', { name: 'Cerrar menú' }))

      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()
    })

    it('cierra el drawer con el backdrop', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()

      await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar menú' })[0])

      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()
    })

    it('cierra el drawer con Escape', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()

      await userEvent.keyboard('{Escape}')

      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()
    })

    it('Cerrar sesión del drawer cierra la sesión', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(drawer).getByRole('button', { name: 'Cerrar sesión' }))

      expect(await screen.findByText('¡Nos vemos!')).toBeInTheDocument()
      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(
        screen.queryByRole('navigation', { name: 'Navegación principal' }),
      ).not.toBeInTheDocument()
    })
  })

  it('mantiene la tabla y las cards en contenedores con scroll/grilla responsive (sin desborde)', async () => {
    mockApp([
      {
        id: '1',
        date: '2026-07-01',
        merchant: 'MERCADO LIBRE',
        category: 'Compras',
        currency: 'ARS',
        amount: -1500,
        summary_id: 's1',
        card_summaries: { file_name: 'resumen.csv' },
      },
    ])
    const { container } = render(<App />)
    await screen.findByRole('table')

    const tableScroll = container.querySelector('.overflow-x-auto')
    expect(tableScroll).not.toBeNull()

    const cardsGrid = container.querySelector('.grid.grid-cols-1')
    expect(cardsGrid).not.toBeNull()
    expect(cardsGrid.className).toContain('sm:grid-cols-2')
    expect(cardsGrid.className).toContain('xl:grid-cols-4')
  })

  describe('OnboardingTour', () => {
    it('abre el tutorial automáticamente la primera vez (sin flag) y bloquea el scroll', async () => {
      localStorage.removeItem('mandarina:tour:u1')
      const { container } = render(<App />)

      expect(await screen.findByRole('dialog', { name: /Guía de Mandarina/i })).toBeInTheDocument()
      const main = container.querySelector('main')
      expect(main.className).toContain('overflow-hidden')
    })

    it('el ícono "Ver guía" reabre el tutorial', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)
      expect(screen.queryByRole('dialog', { name: /Guía de Mandarina/i })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Ver guía' }))

      expect(await screen.findByRole('dialog', { name: /Guía de Mandarina/i })).toBeInTheDocument()
    })

    it('Omitir cierra el tutorial y guarda el flag para no volver a mostrarlo', async () => {
      localStorage.removeItem('mandarina:tour:u1')
      const { container } = render(<App />)
      const dialog = await screen.findByRole('dialog', { name: /Guía de Mandarina/i })

      await userEvent.click(within(dialog).getByRole('button', { name: 'Omitir' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(localStorage.getItem('mandarina:tour:u1')).toBe('1')
      const main = container.querySelector('main')
      expect(main.className).toContain('overflow-y-auto')
    })

    it('navega por los pasos con Siguiente/Anterior y finaliza', async () => {
      localStorage.removeItem('mandarina:tour:u1')
      render(<App />)
      const dialog = await screen.findByRole('dialog', { name: /Guía de Mandarina/i })
      expect(within(dialog).getByRole('heading', { name: /Bienvenido/i })).toBeInTheDocument()

      await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/i }))
      expect(within(dialog).getByRole('heading', { name: 'Egresos' })).toBeInTheDocument()

      await userEvent.click(within(dialog).getByRole('button', { name: /Anterior/i }))
      expect(within(dialog).getByRole('heading', { name: /Bienvenido/i })).toBeInTheDocument()

      for (let i = 0; i < 5; i += 1) {
        await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente|Finalizar/i }))
      }
      await userEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(localStorage.getItem('mandarina:tour:u1')).toBe('1')
    })

    it('abre el tutorial en el primer login de una cuenta nueva', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)
      expect(screen.queryByRole('dialog', { name: /Guía de Mandarina/i })).not.toBeInTheDocument()

      signIn({ id: 'u2', email: 'nuevo@b.com' })

      expect(await screen.findByRole('dialog', { name: /Guía de Mandarina/i })).toBeInTheDocument()
    })

    it('los íconos de navegación y la guía llevan el marcador data-tour', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const drawer = screen.getByRole('navigation', { name: 'Navegación principal' })
      expect(
        within(drawer).getByRole('button', { name: 'Resúmenes' }).getAttribute('data-tour'),
      ).toBe('resumenes')
      expect(
        within(drawer).getByRole('button', { name: 'Inversiones' }).getAttribute('data-tour'),
      ).toBe('inversiones')

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(
        within(rail).getByRole('button', { name: 'Inversiones' }).getAttribute('data-tour'),
      ).toBe('inversiones')

      expect(screen.getByRole('button', { name: 'Ver guía' }).getAttribute('data-tour')).toBe(
        'help',
      )
    })
  })

  it('muestra la pantalla de auth si getSession falla (sin quedarse en splash)', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('red'))
    render(<App />)
    expect(await screen.findByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra un toast de error si cerrar sesión falla', async () => {
    supabase.auth.signOut.mockRejectedValue(new Error('red'))
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('No se pudo cerrar la sesión')).toBeInTheDocument()
    expect(screen.queryByText('¡Nos vemos!')).not.toBeInTheDocument()
  })
})
