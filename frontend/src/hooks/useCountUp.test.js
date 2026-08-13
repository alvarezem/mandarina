import { renderHook } from '@testing-library/react'
import useCountUp from './useCountUp'

describe('useCountUp', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('anima de 0 al target usando requestAnimationFrame', () => {
    const raf = vi.fn((cb) => cb(performance.now() + 2000))
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(raf)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const { result } = renderHook(() => useCountUp(80, { duration: 200 }))
    expect(result.current).toBeCloseTo(80)
    expect(raf).toHaveBeenCalled()
  })

  it('salta directo al target si el usuario prefiere menos movimiento', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
    const { result } = renderHook(() => useCountUp(50))
    expect(result.current).toBe(50)
  })

  it('cancela la animación al desmontar', () => {
    const cancel = vi.fn()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(cancel)

    const { unmount } = renderHook(() => useCountUp(100, { duration: 1000 }))
    unmount()
    expect(cancel).toHaveBeenCalledWith(7)
  })
})
