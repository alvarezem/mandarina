import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToastProvider, { useToast } from './Toast'

function Consumer({ message, type = 'success', icon }) {
  const pushToast = useToast()
  return (
    <button type="button" onClick={() => pushToast({ type, icon, message })} data-testid="disparar">
      disparar
    </button>
  )
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra un toast al llamar pushToast y lo auto-descarta', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Consumer message="Resumen subido" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByTestId('disparar'))
    expect(screen.getByRole('status')).toHaveTextContent('Resumen subido')

    await act(() => vi.advanceTimersByTimeAsync(3300))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('usa el estilo correcto según el tipo', async () => {
    render(
      <ToastProvider>
        <Consumer message="Todo ok" />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByTestId('disparar'))
    const toast = await screen.findByRole('status')
    expect(toast).toHaveClass('border-emerald-200')
  })

  it('renderiza un toast de error con su icono', async () => {
    render(
      <ToastProvider>
        <Consumer message="Algo falló" type="error" />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByTestId('disparar'))
    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Algo falló')
    expect(toast).toHaveClass('border-red-200')
  })

  it('soporta el icono wave y el icono none', async () => {
    render(
      <ToastProvider>
        <Consumer message="llegó" type="info" icon="wave" />
        <Consumer message="sin icono" type="info" icon="none" />
      </ToastProvider>,
    )
    await userEvent.click(screen.getAllByTestId('disparar')[0])
    await userEvent.click(screen.getAllByTestId('disparar')[1])
    expect(await screen.findByTestId('toast-icon-wave')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })
})
