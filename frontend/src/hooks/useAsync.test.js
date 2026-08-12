import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsync } from './useAsync'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsync', () => {
  it('carga datos con éxito y limpia el estado de loading', async () => {
    const { result } = renderHook(() => useAsync(async () => 'ok', []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('ok'))
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('setea un mensaje de error cuando la promesa rechaza', async () => {
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw new Error('boom')
      }, []),
    )
    await waitFor(() => expect(result.current.error).toBe('boom'))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('reload vuelve a ejecutar la función', async () => {
    let calls = 0
    const { result } = renderHook(() => useAsync(async () => ++calls, []))
    await waitFor(() => expect(result.current.data).toBe(1))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toBe(2))
  })

  it('setData permite actualizaciones optimistas locales', () => {
    const { result } = renderHook(() => useAsync(async () => 'server', []))
    act(() => result.current.setData('local'))
    expect(result.current.data).toBe('local')
  })

  it('cancela el setState tras desmontar', async () => {
    const d = deferred()
    const { result, unmount } = renderHook(() => useAsync(() => d.promise, []))
    unmount()
    d.resolve('tarde')
    await act(async () => {})
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)
  })
})
