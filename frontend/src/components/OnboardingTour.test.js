import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingTour from './OnboardingTour'

describe('OnboardingTour', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  it('no renderiza nada cuando está cerrado', () => {
    const { container } = render(<OnboardingTour open={false} onClose={onClose} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el primer paso al abrir', () => {
    render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })
    expect(within(dialog).getByRole('heading', { name: /Bienvenido/i })).toBeInTheDocument()
  })

  it('deshabilita Anterior en el primer paso y navega hasta el final', async () => {
    render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })

    expect(within(dialog).getByRole('button', { name: /Anterior/i })).toBeDisabled()

    await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/i }))
    expect(within(dialog).getByRole('heading', { name: 'Costos' })).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /Anterior/i }))
    expect(within(dialog).getByRole('heading', { name: /Bienvenido/i })).toBeInTheDocument()
  })

  it('cierra con Omitir', async () => {
    render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Omitir' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('finaliza el último paso con el botón Finalizar', async () => {
    render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })

    for (let i = 0; i < 5; i += 1) {
      await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente|Finalizar/i }))
    }
    expect(within(dialog).getByRole('button', { name: 'Finalizar' })).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra con Escape y al hacer click en el fondo', async () => {
    render(<OnboardingTour open onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    const overlay = document.querySelector('.bg-black\\/40')
    expect(overlay).not.toBeNull()
    await userEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('no marca ninguna sección en el primer paso', () => {
    render(<OnboardingTour open onClose={onClose} />)
    const backdrop = document.querySelector('[data-testid="tour-backdrop"]')
    expect(backdrop.style.WebkitMaskImage).toBeFalsy()
    expect(screen.queryByTestId('tour-target-ring')).not.toBeInTheDocument()
  })

  it('hace foco en el ícono de la sección nombrada (hueco + anillo)', async () => {
    render(
      <>
        <button type="button" data-tour="costos">
          Costos nav
        </button>
        <OnboardingTour open onClose={onClose} />
      </>
    )
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })
    await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/i }))

    const backdrop = document.querySelector('[data-testid="tour-backdrop"]')
    expect(backdrop.style.WebkitMaskImage).toContain('radial-gradient')
    expect(backdrop.style.maskImage).toContain('radial-gradient')
    expect(screen.getByTestId('tour-target-ring')).toBeInTheDocument()
  })

  it('menciona la separación de gastos en gajos en el paso de Costos', async () => {
    render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })
    await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente/i }))
    expect(within(dialog).getByText(/separás los gastos en gajos/i)).toBeInTheDocument()
  })

  it('el último paso dice "a sacarle todo el jugo" y muestra el gajo', async () => {
    const { container } = render(<OnboardingTour open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /Guía de Mandarina/i })

    for (let i = 0; i < 5; i += 1) {
      await userEvent.click(within(dialog).getByRole('button', { name: /Siguiente|Finalizar/i }))
    }

    expect(within(dialog).getByText(/a sacarle todo el jugo/i)).toBeInTheDocument()
    expect(dialog.querySelectorAll('img').length).toBeGreaterThanOrEqual(1)
    expect(container).not.toBeNull()
  })
})
