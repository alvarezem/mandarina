import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import App from './App'
import supabase from './lib/supabaseClient'

vi.mock('./lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}))

const session = { user: { id: 'u1', email: 'a@b.com' } }

const EMPTY_STATE = 'Subí un resumen para empezar.'

function mockData(table, data) {
  const order = vi.fn().mockResolvedValue({ data, error: null })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq, order })
  return { select, eq, order }
}

function mockApp(txs, summaries = []) {
  const tx = mockData('transactions', txs)
  const summariesData = mockData('card_summaries', summaries)
  const meta = (_table) => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq, order })
    return { select }
  }
  supabase.from.mockImplementation((table) => {
    if (table === 'transactions') return { select: tx.select }
    if (table === 'card_summaries') return { select: summariesData.select }
    return meta(table)
  })
}

describe('App', () => {
  let authListener

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('mandarina:tour:u1', '1')
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
    const limit = vi.fn().mockResolvedValue({ data: plan, error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const planSelect = vi.fn().mockReturnValue({ order })
    const tx = mockData('transactions', [])
    const summariesData = mockData('card_summaries', [])
    const metaEq = vi.fn().mockResolvedValue({ data: [], error: null })
    const metaSelect = vi.fn().mockReturnValue({ eq: metaEq })
    supabase.from.mockImplementation((table) => {
      if (table === 'portfolio_plan') return { select: planSelect }
      if (table === 'transactions') return { select: tx.select }
      if (table === 'card_summaries') return { select: summariesData.select }
      return { select: metaSelect }
    })
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

    expect(
      await screen.findByText('Tus posiciones: VIST ▲1.20% · QQQ ▼0.50% · KO —'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('toast-icon-trend')).toBeInTheDocument()
  })

  it('no saluda ni busca posiciones al restaurar la sesión guardada (refresh)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    expect(screen.queryByText(/¡Bienvenido|¡Volviste!/)).not.toBeInTheDocument()
  })

  describe('navegación rail (lg+)', () => {
    it('muestra header con hamburguesa, logo Mandarina y rail con Costos activo', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument()
      expect(screen.getByText('Mandarina')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(within(rail).getByRole('button', { name: 'Costos' }).className).toContain(
        'bg-brand-50',
      )
      expect(within(rail).getByRole('button', { name: /Inversiones/ })).toBeInTheDocument()
      expect(within(rail).getByRole('button', { name: /Resúmenes/ })).toBeInTheDocument()
    })

    it('navega a Inversiones y muestra el plan de inversión vacío', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await userEvent.click(within(rail).getByRole('button', { name: /Inversiones/ }))

      expect(await screen.findByRole('heading', { name: 'Plan de inversión' })).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
    })

    it('navega a Resúmenes y muestra el listado centrado', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await userEvent.click(within(rail).getByRole('button', { name: /Resúmenes/ }))

      expect(await screen.findByText('Subir resumen')).toBeInTheDocument()
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
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
    it('muestra el logo de mandarina centrado en la bottom nav', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      expect(bottom.className).toContain('lg:hidden')
      expect(bottom.querySelector('.grid-cols-3')).not.toBeNull()

      const home = within(bottom).getByRole('button', { name: 'Inicio' })
      expect(home.className).toContain('absolute')
      expect(home.className).toContain('left-1/2')
    })

    it('navega a Resúmenes desde la bottom nav y muestra el listado centrado', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(bottom).getByRole('button', { name: 'Resúmenes' }))

      expect(await screen.findByText('Subir resumen')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    })

    it('cambia de vista desde la bottom nav', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(bottom).getByRole('button', { name: 'Inversiones' }))

      expect(await screen.findByRole('heading', { name: 'Plan de inversión' })).toBeInTheDocument()
    })

    it('el logo central vuelve al inicio', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(bottom).getByRole('button', { name: 'Inversiones' }))
      await screen.findByRole('heading', { name: 'Plan de inversión' })

      await userEvent.click(within(bottom).getByRole('button', { name: 'Inicio' }))
      expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument()
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

    const cardsGrid = container.querySelector('.grid.grid-cols-2')
    expect(cardsGrid).not.toBeNull()
    expect(cardsGrid.className).toContain('lg:grid-cols-3')
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
      expect(within(dialog).getByRole('heading', { name: 'Costos' })).toBeInTheDocument()

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

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      expect(within(bottom).getByRole('button', { name: 'Costos' }).getAttribute('data-tour')).toBe(
        'costos',
      )
      expect(
        within(bottom).getByRole('button', { name: 'Inversiones' }).getAttribute('data-tour'),
      ).toBe('inversiones')
      expect(
        within(bottom).getByRole('button', { name: 'Resúmenes' }).getAttribute('data-tour'),
      ).toBe('resumenes')

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
