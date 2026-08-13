import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar, { NAV_ITEMS, Logo } from './Sidebar'

const renderSidebar = (props = {}) =>
  render(<Sidebar view="resumenes" onNavigate={vi.fn()} {...props} />)

describe('Sidebar', () => {
  it('muestra los 2 items de navegación y marca el activo', () => {
    renderSidebar()
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('button', { name: item.label })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Resúmenes' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('colapsa a iconos sin labels cuando expanded está apagado', () => {
    renderSidebar({ expanded: false })
    for (const item of NAV_ITEMS) {
      const btn = screen.getByRole('button', { name: item.label })
      expect(btn).toHaveAttribute('title', item.label)
    }
    const nav = screen.getByRole('navigation', { name: 'Navegación' })
    expect(nav.className).toContain('w-16')
  })

  it('expande a labels cuando expanded está encendido', () => {
    renderSidebar({ expanded: true })
    const nav = screen.getByRole('navigation', { name: 'Navegación' })
    expect(nav.className).toContain('w-52')
    expect(screen.getByText('Resúmenes')).toBeInTheDocument()
  })

  it('navega al hacer click en un item', async () => {
    const onNavigate = vi.fn()
    renderSidebar({ onNavigate })
    await userEvent.click(screen.getByRole('button', { name: 'Inversiones' }))
    expect(onNavigate).toHaveBeenCalledWith('inversiones')
  })
})

describe('Logo', () => {
  it('es un img con alt vacío y aria-hidden', () => {
    const { container } = render(<Logo className="h-5 w-5" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(img).toHaveClass('h-5 w-5')
  })
})
