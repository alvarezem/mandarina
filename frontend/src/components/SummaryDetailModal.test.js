import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SummaryDetailModal from './SummaryDetailModal'
import supabase from '../lib/supabaseClient'

const txs = [
  {
    id: '1',
    date: '2026-07-01',
    merchant: 'MERCADO LIBRE',
    category: 'Compras',
    currency: 'ARS',
    amount: -1500,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
  {
    id: '2',
    date: '2026-07-02',
    merchant: 'SUELDO',
    category: 'Ingresos',
    currency: 'ARS',
    amount: 500000,
    summary_id: 's1',
    card_summaries: { file_name: 'resumen-julio.csv' },
  },
]

function renderModal(props = {}) {
  return render(
    <SummaryDetailModal
      file={{ id: 's1', file_name: 'resumen-julio.csv' }}
      session={{ user: { id: 'user-1' } }}
      dark={false}
      onClose={vi.fn()}
      {...props}
    />,
  )
}

async function tableMerchants() {
  const table = await screen.findByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[1].textContent)
}

describe('SummaryDetailModal', () => {
  beforeEach(() => {
    supabase.mockTable('transactions', txs)
    supabase.mockTable('merchant_overrides', [])
    supabase.mockTable('custom_categories', [])
  })

  it('abre el detalle del resumen y muestra sus transacciones', async () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByText('resumen-julio.csv')).toBeInTheDocument()
    expect(await tableMerchants()).toContain('MERCADO LIBRE')
  })

  it('oculta el dropdown de resumen para mantener el summary fijo', () => {
    renderModal()
    expect(
      screen.queryByRole('button', { name: /Resumen\s*Todos los resúmenes/i }),
    ).not.toBeInTheDocument()
  })

  it('alterna a modo ingresos con su toggle', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('tab', { name: 'Ingresos' }))
    expect(await screen.findByText('Mayor ingreso ARS')).toBeInTheDocument()
  })

  it('cierra con el botón X', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await screen.findByText('resumen-julio.csv')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('cierra con la tecla Escape', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await screen.findByText('resumen-julio.csv')
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
