import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dropdown from './Dropdown'

const openButton = (name) => screen.getByRole('button', { name })

describe('Dropdown', () => {
  it('abre el menú con label y summary y lo cierra con Escape', () => {
    render(
      <Dropdown label="Período" summary="Este mes">
        <button type="button">Opción A</button>
      </Dropdown>,
    )
    const btn = openButton(/Período/)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveTextContent('Este mes')

    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Opción A' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Opción A' })).not.toBeInTheDocument()
  })

  it('cierra al hacer click fuera del menú', () => {
    render(
      <div>
        <button type="button">otro</button>
        <Dropdown label="Período" summary="Todo">
          <button type="button">Opción A</button>
        </Dropdown>
      </div>,
    )
    fireEvent.click(openButton(/Período/))
    expect(screen.getByRole('button', { name: 'Opción A' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'Opción A' })).not.toBeInTheDocument()
  })

  it('filtra por texto y respeta data-pinned', async () => {
    render(
      <Dropdown label="Categorías" summary="Todas" searchable>
        <button type="button" data-pinned>
          ⭐ Fijadas
        </button>
        <button type="button">Compras</button>
        <button type="button">Pagos</button>
      </Dropdown>,
    )
    fireEvent.click(openButton(/Categorías/))
    const search = screen.getByPlaceholderText(/Buscar categoría/i)
    await userEvent.type(search, 'Pagos')

    expect(screen.getByRole('button', { name: '⭐ Fijadas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compras' })).not.toBeInTheDocument()
  })

  it('soporta render prop con query y close', () => {
    render(
      <Dropdown label="Período" summary="Todo" searchable>
        {({ query }) => <span data-testid="renderprop">{query}</span>}
      </Dropdown>,
    )
    fireEvent.click(openButton(/Período/))
    const search = screen.getByPlaceholderText(/Buscar categoria|Buscar categoría/i)
    fireEvent.change(search, { target: { value: 'abc' } })
    expect(screen.getByTestId('renderprop')).toHaveTextContent('abc')
  })

  it('cierra al seleccionar cuando closeOnSelect está activo', () => {
    render(
      <Dropdown label="Moneda" summary="ARS" closeOnSelect>
        <button type="button">USD</button>
      </Dropdown>,
    )
    fireEvent.click(openButton(/Moneda/))
    fireEvent.click(screen.getByRole('button', { name: 'USD' }))
    expect(screen.queryByRole('button', { name: 'USD' })).not.toBeInTheDocument()
  })

  it('cierra al hacer scroll fuera del menú', () => {
    render(
      <Dropdown label="Período" summary="Todo">
        <button type="button">Opción A</button>
      </Dropdown>,
    )
    fireEvent.click(openButton(/Período/))
    fireEvent.scroll(document.body)
    expect(screen.queryByRole('button', { name: 'Opción A' })).not.toBeInTheDocument()
  })
})
