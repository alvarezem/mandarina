import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LangToggle from './LangToggle'

describe('LangToggle', () => {
  it('marca el idioma activo con aria-pressed', () => {
    render(<LangToggle lang="es" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('llama onSelect al cambiar de idioma', async () => {
    const onSelect = vi.fn()
    render(<LangToggle lang="es" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(onSelect).toHaveBeenCalledWith('en')
  })
})
