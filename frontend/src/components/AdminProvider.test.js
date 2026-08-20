import { render, screen, waitFor } from '@testing-library/react'
import { AdminProvider, useAdmin } from './AdminProvider'
import supabase from '../lib/supabaseClient'

function Harness() {
  const { isAdmin, loading } = useAdmin()
  return <div data-testid="admin">{loading ? 'loading' : isAdmin ? 'admin' : 'none'}</div>
}

const renderAdmin = (userId) =>
  render(
    <AdminProvider userId={userId}>
      <Harness />
    </AdminProvider>,
  )

describe('AdminProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expone isAdmin true con una fila en admins', async () => {
    supabase.mockTable('admins', [{ user_id: 'u1' }])
    renderAdmin('u1')
    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('admin'))
  })

  it('expone isAdmin false sin fila en admins', async () => {
    supabase.mockTable('admins', [])
    renderAdmin('u1')
    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('none'))
  })

  it('expone isAdmin false sin userId (sin fetch)', () => {
    renderAdmin(null)
    expect(screen.getByTestId('admin')).toHaveTextContent('none')
  })

  it('expone isAdmin false ante error de fetch', async () => {
    supabase.mockTable('admins', [], { message: 'boom' })
    renderAdmin('u1')
    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('none'))
  })
})
