import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IncomeSources from './IncomeSources'

const sources = [
  {
    merchant: 'SUELDO',
    category: 'Ingresos',
    count: 2,
    total: 500000,
    monthCount: 2,
    recurring: true,
  },
  {
    merchant: 'MERCADO PAGO DEVOLUCIÓN',
    category: null,
    count: 1,
    total: 12500.5,
    monthCount: 1,
    recurring: false,
  },
]

describe('IncomeSources', () => {
  it('muestra orígenes con total formateado', () => {
    render(<IncomeSources sources={sources} />)
    expect(screen.getByRole('heading', { name: 'Acreditaciones por origen' })).toBeInTheDocument()
    expect(screen.getByText('SUELDO')).toBeInTheDocument()
    expect(screen.getByText('$ 500.000,00')).toBeInTheDocument()
    expect(screen.getByText('$ 12.500,50')).toBeInTheDocument()
    expect(screen.getByText('2 orígenes')).toBeInTheDocument()
  })

  it('muestra badge Recurrente solo para orígenes recurrentes', () => {
    render(<IncomeSources sources={sources} />)
    const rows = screen.getAllByRole('button')
    expect(within(rows[0]).getByText('Recurrente')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('Recurrente')).not.toBeInTheDocument()
  })

  it('muestra la categoría o Sin categoría junto al contador', () => {
    render(<IncomeSources sources={sources} />)
    const rows = screen.getAllByRole('button')
    expect(within(rows[0]).getByText(/Ingresos · ×2/)).toBeInTheDocument()
    expect(within(rows[1]).getByText(/Sin categoría · ×1/)).toBeInTheDocument()
  })

  it('llama onSelect con el merchant al hacer click', async () => {
    const onSelect = vi.fn()
    render(<IncomeSources sources={sources} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('SUELDO'))
    expect(onSelect).toHaveBeenCalledWith('SUELDO')
  })
})
