import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  it('muestra sol en modo oscuro y alterna al hacer clic', async () => {
    const onToggle = vi.fn()
    render(<ThemeToggle dark onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: 'Cambiar a tema claro' })
    expect(button).toBeInTheDocument()
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalled()
  })

  it('muestra luna en modo claro con su label y el hover naranja', () => {
    render(<ThemeToggle dark={false} onToggle={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Cambiar a tema oscuro' })
    expect(button).toHaveClass('hover:border-brand-300')
    expect(button).toHaveClass('hover:bg-brand-50')
    expect(button).toHaveClass('hover:text-brand-600')
    expect(button).toHaveClass('dark:hover:border-brand-800')
    expect(button).toHaveClass('dark:hover:bg-brand-950/40')
    expect(button).toHaveClass('dark:hover:text-brand-400')
  })
})
