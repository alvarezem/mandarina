import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

jest.mock('./lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}))

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
  Bar: () => <div data-testid="chart-bar" />,
}))

const supabase = require('./lib/supabaseClient').default

const session = { user: { id: 'u1', email: 'a@b.com' } }

const EMPTY_STATE = 'Subí un resumen para empezar.'

function mockData(table, data) {
  const order = jest.fn().mockResolvedValue({ data, error: null })
  const select = jest.fn().mockReturnValue({ order })
  return { select, order }
}

function mockApp(txs, summaries = []) {
  const tx = mockData('transactions', txs)
  const summariesData = mockData('card_summaries', summaries)
  supabase.from.mockImplementation((table) =>
    table === 'transactions' ? { select: tx.select } : { select: summariesData.select },
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    supabase.auth.signOut.mockResolvedValue({ error: null })
    supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    supabase.functions.invoke.mockResolvedValue({})
    supabase.storage.from.mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: null }) })
    mockApp([])
  })

  it('muestra la pantalla de auth cuando no hay sesión', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<App />)
    expect(await screen.findByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  describe('navegación rail (lg+)', () => {
    it('muestra el rail con logo, Costos activo, Inversiones y Resúmenes', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(within(rail).getAllByRole('button', { name: /Ir al inicio/i }).length).toBeGreaterThan(0)
      expect(within(rail).getByRole('button', { name: 'Costos' }).className).toContain('bg-teal-50')
      expect(within(rail).getByRole('button', { name: /Inversiones/ })).toBeInTheDocument()
      expect(within(rail).getByRole('button', { name: /Resúmenes/ })).toBeInTheDocument()
    })

    it('navega a Inversiones y muestra el placeholder', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      await userEvent.click(within(rail).getByRole('button', { name: /Inversiones/ }))

      expect(await screen.findByText('Próximamente.')).toBeInTheDocument()
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

    it('expande y colapsa el rail con el toggle', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const rail = screen.getByRole('navigation', { name: 'Navegación' })
      expect(within(rail).getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()
      expect(rail.className).toContain('w-52')

      await userEvent.click(within(rail).getByRole('button', { name: 'Colapsar barra' }))
      expect(rail.className).toContain('w-16')
      expect(within(rail).getByRole('button', { name: 'Expandir barra' })).toBeInTheDocument()
      expect(within(rail).queryByText('fimplify')).not.toBeInTheDocument()

      await userEvent.click(within(rail).getByRole('button', { name: 'Expandir barra' }))
      expect(rail.className).toContain('w-52')
      expect(within(rail).getByRole('button', { name: 'Colapsar barra' })).toBeInTheDocument()
      expect(within(rail).getByText('fimplify')).toBeInTheDocument()
    })
  })

  describe('navegación móvil (<lg)', () => {
    it('muestra el logo de fimplify centrado en la bottom nav', async () => {
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

      expect(await screen.findByText('Próximamente.')).toBeInTheDocument()
    })

    it('el logo central vuelve al inicio', async () => {
      render(<App />)
      await screen.findByText(EMPTY_STATE)

      const bottom = screen.getByRole('navigation', { name: 'Navegación principal' })
      await userEvent.click(within(bottom).getByRole('button', { name: 'Inversiones' }))
      await screen.findByText('Próximamente.')

      await userEvent.click(within(bottom).getByRole('button', { name: 'Inicio' }))
      expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument()
    })
  })

  it('mantiene la tabla y las cards en contenedores con scroll/grilla responsive (sin desborde)', async () => {
    mockApp([
      { id: '1', date: '2026-07-01', merchant: 'MERCADO LIBRE', category: 'Compras', currency: 'ARS', amount: -1500, summary_id: 's1', card_summaries: { file_name: 'resumen.csv' } },
    ])
    const { container } = render(<App />)
    await screen.findByRole('table')

    const tableScroll = container.querySelector('.overflow-x-auto')
    expect(tableScroll).not.toBeNull()

    const cardsGrid = container.querySelector('.grid.grid-cols-2')
    expect(cardsGrid).not.toBeNull()
    expect(cardsGrid.className).toContain('lg:grid-cols-3')
  })
})
