import { render, screen, waitFor } from '@testing-library/react'
import { ProProvider, usePro } from './ProProvider'
import supabase from '../lib/supabaseClient'

function Harness() {
  const { isPro, loading, subscription } = usePro()
  return (
    <div data-testid="pro">
      {loading ? 'loading' : isPro ? 'pro' : 'free'}
      {subscription ? `:${subscription.current_period_end ?? 'no-end'}` : ''}
    </div>
  )
}

const renderPro = (userId) =>
  render(
    <ProProvider userId={userId}>
      <Harness />
    </ProProvider>,
  )

describe('ProProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expone isPro true con una suscripción activa', async () => {
    supabase.mockTable('subscriptions', [{ id: 's1', status: 'active' }])
    renderPro('u1')
    await waitFor(() => expect(screen.getByTestId('pro')).toHaveTextContent('pro'))
  })

  it('expone la fila de suscripción (subscription) con su fecha de fin', async () => {
    supabase.mockTable('subscriptions', [
      { id: 's1', status: 'active', current_period_end: '2026-12-31T00:00:00Z' },
    ])
    renderPro('u1')
    await waitFor(() =>
      expect(screen.getByTestId('pro')).toHaveTextContent('pro:2026-12-31T00:00:00Z'),
    )
  })

  it('expone isPro false con una suscripción no activa', async () => {
    supabase.mockTable('subscriptions', [{ id: 's1', status: 'canceled' }])
    renderPro('u1')
    await waitFor(() => expect(screen.getByTestId('pro')).toHaveTextContent('free'))
  })

  it('expone isPro false sin fila en subscriptions', async () => {
    supabase.mockTable('subscriptions', [])
    renderPro('u1')
    await waitFor(() => expect(screen.getByTestId('pro')).toHaveTextContent('free'))
  })

  it('expone isPro false sin userId (sin fetch)', () => {
    renderPro(null)
    expect(screen.getByTestId('pro')).toHaveTextContent('free')
  })

  it('expone isPro false ante error de fetch', async () => {
    supabase.mockTable('subscriptions', [], { message: 'boom' })
    renderPro('u1')
    await waitFor(() => expect(screen.getByTestId('pro')).toHaveTextContent('free'))
  })
})
