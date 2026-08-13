import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarketClosedNotice from './MarketClosedNotice'

describe('MarketClosedNotice', () => {
  it('muestra el aviso de mercado cerrado', () => {
    render(<MarketClosedNotice onClose={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Mercado cerrado/i)
  })

  it('llama onClose al presionar el botón de cerrar', async () => {
    const onClose = vi.fn()
    render(<MarketClosedNotice onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(onClose).toHaveBeenCalled()
  })
})
