import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadSummaries from './UploadSummaries'
import ToastProvider from './Toast'
import supabase from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({ upload: vi.fn() })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({}),
    },
  },
}))

function mockSummaries(list) {
  const order = vi.fn().mockResolvedValue({ data: list, error: null })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  supabase.from.mockImplementation((table) =>
    table === 'card_summaries' ? { select } : {},
  )
}

describe('UploadSummaries', () => {
  beforeEach(() => {
    mockSummaries([])
  })

  const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>)

  it('muestra el estado vacío sin resúmenes', async () => {
    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText(/No subiste resúmenes todavía/i)).toBeInTheDocument()
  })

  it('lista los resúmenes con su status', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' },
      { id: 'b', file_name: 'mc-junio.csv', status: 'error', error: 'parse failed', created_at: '2026-06-01' },
    ])
    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('visa-julio.pdf')).toBeInTheDocument()
    expect(screen.getByText('Procesado')).toBeInTheDocument()
    expect(screen.getByText('mc-junio.csv')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('parse failed')).toBeInTheDocument()
  })

  it('dispara la subida y el parseo con un archivo y muestra toast de éxito', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      })),
    }))
    supabase.storage.from.mockReturnValue({ upload })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert,
        }
      }
      return {}
    })
    const onDataChanged = vi.fn()

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} onDataChanged={onDataChanged} />)
    const file = new File(['x'], 'resumen.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    await waitFor(() => expect(upload).toHaveBeenCalledWith('u1/resumen.csv', file, { upsert: false }))
    expect(supabase.functions.invoke).toHaveBeenCalledWith('parse-summary', {
      body: { summary_id: 'new-id' },
    })
    await waitFor(() => expect(onDataChanged).toHaveBeenCalled())
    expect(await screen.findByText('Resumen resumen.csv subido')).toBeInTheDocument()
  })

  it('muestra toast de error cuando la subida falla', async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: 'Ya existe' } })
    supabase.storage.from.mockReturnValue({ upload })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    const file = new File(['x'], 'resumen.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Ya existe')
  })

  it('sanitiza el nombre en el path de Storage y conserva el nombre original', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      })),
    }))
    supabase.storage.from.mockReturnValue({ upload })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    const file = new File(['x'], 'Nación.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    await waitFor(() => expect(upload).toHaveBeenCalledWith('u1/Nacion.csv', file, { upsert: false }))
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', file_name: 'Nación.csv', file_path: 'u1/Nacion.csv' }),
    )
    expect(await screen.findByText('Resumen Nación.csv subido')).toBeInTheDocument()
  })

  it('dedupe: avisa con toast cuando el path sanitizado ya existía', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      })),
    }))
    supabase.storage.from.mockReturnValue({ upload })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'a', file_name: 'Nacion.csv', file_path: 'u1/Nacion.csv', status: 'done', error: null, created_at: '2026-07-01' },
                ],
                error: null,
              }),
            }),
          }),
          insert,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('Nacion.csv')
    const file = new File(['x'], 'Nación.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    await waitFor(() => expect(upload).toHaveBeenCalledWith('u1/Nacion_1.csv', file, { upsert: false }))
    expect(
      await screen.findByText(/subido como Nacion_1\.csv \(ya existía un archivo con ese nombre\)/),
    ).toBeInTheDocument()
  })

  it('renombra un resumen existente', async () => {
    mockSummaries([{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }])
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }],
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('visa-julio.pdf')

    await userEvent.click(screen.getByRole('button', { name: /Renombrar visa-julio/ }))
    const input = screen.getByRole('textbox', { name: /Nombre del resumen/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'julio 2026')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ file_name: 'julio 2026' }))
    expect(eq).toHaveBeenCalledWith('id', 'a')
    expect(await screen.findByText('julio 2026')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nombre actualizado')
  })

  it('no guarda un nombre vacío', async () => {
    mockSummaries([{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }])
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }],
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('visa-julio.pdf')

    await userEvent.click(screen.getByRole('button', { name: /Renombrar visa-julio/ }))
    const input = screen.getByRole('textbox', { name: /Nombre del resumen/i })
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    expect(update).not.toHaveBeenCalled()
    expect(screen.getByText('visa-julio.pdf')).toBeInTheDocument()
  })

  it('borra el archivo de storage y la fila con confirmación inline', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', file_path: 'u1/visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' },
    ])
    const remove = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    supabase.storage.from.mockReturnValue({ remove })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', file_path: 'u1/visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }],
                error: null,
              }),
            }),
          }),
          delete: del,
        }
      }
      return {}
    })
    const onDataChanged = vi.fn()
    const onSelect = vi.fn()

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} onDataChanged={onDataChanged} onSelect={onSelect} />)
    await screen.findByText('visa-julio.pdf')

    await userEvent.click(screen.getByRole('button', { name: /Eliminar visa-julio/ }))
    expect(screen.getByText('¿Borrar?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith(['u1/visa-julio.pdf']))
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 'a')
    await waitFor(() => expect(onDataChanged).toHaveBeenCalled())
    expect(await screen.findByRole('status')).toHaveTextContent('Resumen visa-julio.pdf eliminado')
  })

  it('cancela la confirmación de borrado', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', file_path: 'u1/visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' },
    ])
    const remove = vi.fn()
    supabase.storage.from.mockReturnValue({ remove })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('visa-julio.pdf')

    await userEvent.click(screen.getByRole('button', { name: /Eliminar visa-julio/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('¿Borrar?')).not.toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
  })

  it('muestra toast de error si falla el borrado de la fila', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', file_path: 'u1/visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' },
    ])
    const remove = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockResolvedValue({ error: { message: 'denied' } })
    const del = vi.fn().mockReturnValue({ eq })
    supabase.storage.from.mockReturnValue({ remove })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', file_path: 'u1/visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01' }],
                error: null,
              }),
            }),
          }),
          delete: del,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('visa-julio.pdf')

    await userEvent.click(screen.getByRole('button', { name: /Eliminar visa-julio/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))

    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo eliminar el resumen')
  })

  it('muestra el badge de tipo y período (y "Sin clasificar" si no hay metadata)', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01', summary_type: 'VISA', period_month: 7, period_year: 2026 },
      { id: 'b', file_name: 'mc-junio.csv', status: 'done', error: null, created_at: '2026-06-01' },
    ])
    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    expect(await screen.findByText('VISA · jul 2026')).toBeInTheDocument()
    expect(screen.getByText('Sin clasificar')).toBeInTheDocument()
  })

  it('edita el tipo y período de un resumen', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01', summary_type: 'VISA', period_month: 7, period_year: 2026 },
    ])
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01', summary_type: 'VISA', period_month: 7, period_year: 2026 }],
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VISA · jul 2026')

    await userEvent.click(screen.getByRole('button', { name: /Clasificar visa-julio/ }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Tipo de resumen/i }), 'Broker')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Mes del período/i }), '8')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Año del período/i }), '2026')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clasificación' }))

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ summary_type: 'Broker', period_month: 8, period_year: 2026 }),
    )
    expect(eq).toHaveBeenCalledWith('id', 'a')
    expect(await screen.findByText('Broker · ago 2026')).toBeInTheDocument()
  })

  it('cancela la edición de metadata sin guardar', async () => {
    mockSummaries([
      { id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01', summary_type: 'VISA', period_month: 7, period_year: 2026 },
    ])
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    supabase.from.mockImplementation((table) => {
      if (table === 'card_summaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ id: 'a', file_name: 'visa-julio.pdf', status: 'done', error: null, created_at: '2026-07-01', summary_type: 'VISA', period_month: 7, period_year: 2026 }],
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    wrap(<UploadSummaries session={{ user: { id: 'u1' } }} />)
    await screen.findByText('VISA · jul 2026')

    await userEvent.click(screen.getByRole('button', { name: /Clasificar visa-julio/ }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Tipo de resumen/i }), 'Broker')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar clasificación' }))

    expect(update).not.toHaveBeenCalled()
    expect(screen.getByText('VISA · jul 2026')).toBeInTheDocument()
  })
})
