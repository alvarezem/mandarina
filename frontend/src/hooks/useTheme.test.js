import { act, renderHook } from '@testing-library/react'
import { useTheme } from './useTheme'

const THEME_KEY = 'mandarina-theme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('arranca con la preferencia del sistema y la aplica en el DOM', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('lee un tema guardado', () => {
    localStorage.setItem(THEME_KEY, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe(false)
  })

  it('migra una clave legada si no existe la nueva', () => {
    localStorage.setItem('fimplify-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('toggle: setDark persiste y actualiza el DOM', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1](true))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('toggle de vuelta a light', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1](true))
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
  })
})
