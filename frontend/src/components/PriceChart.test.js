import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PriceChart from './PriceChart'

const POINTS = [
  { t: '2026-07-01T14:00:00Z', c: 100 },
  { t: '2026-07-02T14:00:00Z', c: 110 },
]

const QUOTE = {
  price: 110,
  changePct: 3.5,
  tradeHour: '15:00',
  open: 100,
  prevClose: 106,
  high: 112,
  low: 98,
}

const renderChart = (props = {}) =>
  render(<PriceChart symbol="VIST" range="3m" points={POINTS} onRange={vi.fn()} {...props} />)

describe('PriceChart', () => {
  it('muestra el símbolo y los rangos con el activo marcado', async () => {
    const onRange = vi.fn()
    renderChart({ onRange, range: '3M' })
    expect(screen.getByText('VIST')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^3M$/ })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /^1M$/ }))
    expect(onRange).toHaveBeenCalledWith('1M')
  })

  it('muestra el encabezado de cotización con cambio positivo', () => {
    renderChart({ quote: QUOTE })
    expect(screen.getByText(/▲3\.50%/)).toBeInTheDocument()
    expect(screen.getByText('hoy 15:00')).toBeInTheDocument()
  })

  it('marca el cambio negativo en rojo', () => {
    renderChart({ quote: { ...QUOTE, changePct: -2 } })
    expect(screen.getByText(/▼2\.00%/)).toBeInTheDocument()
  })

  it('muestra Cargando histórico… mientras carga', () => {
    renderChart({ loading: true })
    expect(screen.getByText('Cargando histórico…')).toBeInTheDocument()
  })

  it('muestra el mensaje de error', () => {
    renderChart({ error: 'boom' })
    expect(screen.getByText('No se pudo cargar el histórico.')).toBeInTheDocument()
  })

  it('muestra aviso sin datos', () => {
    renderChart({ points: [] })
    expect(screen.getByText('Sin datos históricos para VIST.')).toBeInTheDocument()
  })
})
