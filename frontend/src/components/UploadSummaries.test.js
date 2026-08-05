import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadSummaries from './UploadSummaries'

jest.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({ upload: jest.fn() })),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({}),
    },
  },
}))

const supabase = require('../lib/supabaseClient').default

function mockSummaries(list) {
  const order = jest.fn().mockResolvedValue({ data: list, error: null })
  const select = jest.fn().mockReturnValue({ order })
  supabase.from.mockImplementation((table) =>
    table === 'card_summaries' ? { select } : {},
  )
}

describe('UploadSummaries', () => {
  beforeEach(() => {
    mockSummaries([])
  })

  it('muestra el estado vacío sin resúmenes', async () => {
    render(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/No subiste resúmenes todavía/i)).toBeInTheDocument()
  })

  it('lista los resúmenes con su status', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' },
      { id: 'b', file_name: 'mc-junio.csv', status: 'error', error: 'parse failed', created_at: '2026-06-01' },
    ])
    render(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('visa-julio.pdf')).toBeInTheDocument()
    expect(screen.getByText('Procesado')).toBeInTheDocument()
    expect(screen.getByText('mc-junio.csv')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('parse failed')).toBeInTheDocument()
  })

  it('dispara la subida y el parseo con un archivo', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null })
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      })),
    }))
    supabase.storage.from.mockReturnValue({ upload })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: [], error: null }) }),
          insert,
        }
      }
      return {}
    })
    const onDataChanged = jest.fn()

    render(<UploadSummaries session={{ user: { id: 'u1' } }} onDataChanged={onDataChanged} />)
    const file = new File(['x'], 'resumen.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    await waitFor(() => expect(upload).toHaveBeenCalledWith('u1/resumen.csv', file, { upsert: false }))
    expect(supabase.functions.invoke).toHaveBeenCalledWith('parse-summary', {
      body: { summary_id: 'new-id' },
    })
    await waitFor(() => expect(onDataChanged).toHaveBeenCalled())
  })
})
