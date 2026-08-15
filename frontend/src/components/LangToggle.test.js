import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LangToggle from './LangToggle'
import { LangProvider } from './LangProvider'

function renderToggle({ lang, setLang }) {
  return render(
    <LangProvider lang={lang} setLang={setLang}>
      <LangToggle />
    </LangProvider>,
  )
}

describe('LangToggle', () => {
  it('marca el idioma activo con aria-pressed', () => {
    renderToggle({ lang: 'es', setLang: vi.fn() })
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('llama setLang al cambiar de idioma', async () => {
    const setLang = vi.fn()
    renderToggle({ lang: 'es', setLang })
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(setLang).toHaveBeenCalledWith('en')
  })
})
