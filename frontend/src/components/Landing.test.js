import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Landing from './Landing'

describe('Landing', () => {
  it('muestra el hero con la propuesta de valor y el header de marca', () => {
    render(<Landing dark={false} onToggleTheme={vi.fn()} />)
    expect(screen.getByText('Mandarina')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'A tu plata, sacale todo el jugo' }),
    ).toBeInTheDocument()
  })

  it('responde las tres preguntas del reporte de llmaudit en la sección FAQ', () => {
    render(<Landing dark={false} onToggleTheme={vi.fn()} />)
    const faq = screen.getByRole('region', { name: 'Preguntas frecuentes' })
    expect(faq).toHaveTextContent('¿Qué es Mandarina y para quién es?')
    expect(faq).toHaveTextContent('¿Por qué elegir Mandarina?')
    expect(faq).toHaveTextContent('¿Qué puedo esperar al usarla?')
    expect(faq).toHaveTextContent('sin ser experta en finanzas')
    expect(faq).toHaveTextContent('registro de operaciones')
  })

  it('muestra cómo funciona, cuándo conviene y el testimonio', () => {
    render(<Landing dark={false} onToggleTheme={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toHaveTextContent('Paso 1')
    expect(screen.getByRole('region', { name: '¿Cuándo conviene Mandarina?' })).toHaveTextContent(
      'planilla de Excel',
    )
    const testimonial = screen.getByRole('region', { name: 'Quién la usa' })
    expect(testimonial).toHaveTextContent('planilla de Excel')
    expect(testimonial).toHaveTextContent('Usuario y creador de Mandarina')
  })

  it('incluye el card de Auth embebido para ingresar', () => {
    render(<Landing dark={false} onToggleTheme={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra el toggle de tema y lo alterna', async () => {
    const onToggleTheme = vi.fn()
    render(<Landing dark={false} onToggleTheme={onToggleTheme} />)
    const button = screen.getByRole('button', { name: 'Cambiar a tema oscuro' })
    await userEvent.click(button)
    expect(onToggleTheme).toHaveBeenCalled()
  })

  it('renderiza en inglés cuando lang es en', () => {
    render(<Landing dark={false} onToggleTheme={vi.fn()} lang="en" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Get the most out of your money' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Frequently asked questions' })).toHaveTextContent(
      'What is Mandarina and who is it for?',
    )
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument()
  })
})
