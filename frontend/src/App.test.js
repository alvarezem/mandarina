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

describe('App responsive', () => {
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

  it('abre el drawer móvil con el botón hamburguesa (<lg)', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    const hamburger = screen.getByRole('button', { name: /Abrir resúmenes/i })
    expect(hamburger.className).toContain('lg:hidden')

    await userEvent.click(hamburger)
    const close = await screen.findByRole('button', { name: 'Cerrar' })
    const drawer = close.closest('aside')
    expect(drawer.className).toContain('lg:hidden')
    expect(within(drawer).getByText('Subir resumen')).toBeInTheDocument()

    await userEvent.click(close)
    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
  })

  it('colapsa el sidebar en lg+ y persiste en localStorage', async () => {
    render(<App />)
    await screen.findByText(EMPTY_STATE)

    const toggle = screen.getByRole('button', { name: /Ocultar panel lateral/i })
    expect(toggle.className).toContain('lg:block')

    const aside = screen.getByRole('complementary')
    expect(aside.className).toContain('lg:block')

    await userEvent.click(toggle)
    expect(localStorage.getItem('fimplify-sidebar')).toBe('collapsed')
    expect(screen.getByRole('button', { name: /Mostrar panel lateral/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary').className).toBe('hidden')

    await userEvent.click(screen.getByRole('button', { name: /Mostrar panel lateral/i }))
    expect(localStorage.getItem('fimplify-sidebar')).toBe('open')
    expect(screen.getByRole('complementary').className).toContain('lg:block')
  })

  it('inicia con el sidebar colapsado si localStorage lo indica', async () => {
    localStorage.setItem('fimplify-sidebar', 'collapsed')
    render(<App />)
    await screen.findByText(EMPTY_STATE)
    expect(screen.getByRole('button', { name: /Mostrar panel lateral/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary').className).toBe('hidden')
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
