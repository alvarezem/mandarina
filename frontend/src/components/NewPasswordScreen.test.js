import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewPasswordScreen from './NewPasswordScreen'
import ToastProvider from './Toast'
import { LangProvider } from './LangProvider'
import supabase from '../lib/supabaseClient'

function renderScreen() {
  return render(
    <ToastProvider>
      <NewPasswordScreen />
    </ToastProvider>,
  )
}

function LangHarness({ children }) {
  const [lang, setLang] = useState('es')
  return (
    <LangProvider lang={lang} setLang={setLang}>
      {children}
    </LangProvider>
  )
}

describe('NewPasswordScreen', () => {
  beforeEach(() => {
    supabase.auth.updateUser.mockReset()
    supabase.auth.signOut.mockReset()
    supabase.auth.updateUser.mockResolvedValue({ error: null })
    supabase.auth.signOut.mockResolvedValue({ error: null })
  })

  it('muestra la pantalla de nueva contraseña', () => {
    renderScreen()
    expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar contraseña/i })).toBeInTheDocument()
  })

  it('valida contraseñas cortas o sin letras y números', async () => {
    renderScreen()
    await userEvent.type(screen.getByLabelText('Contraseña'), 'abc')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Contraseña'))
    await userEvent.type(screen.getByLabelText('Contraseña'), '12345678')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(
      await screen.findByText('La contraseña debe incluir letras y números'),
    ).toBeInTheDocument()
  })

  it('valida que las contraseñas coincidan', async () => {
    renderScreen()
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Abc12345')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Abc99999')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('llama a updateUser con la contraseña y cierra la sesión al tener éxito', async () => {
    renderScreen()
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Abc12345')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Abc12345')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Abc12345' })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('muestra el error traducido si updateUser falla', async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: { code: 'weak_password' } })
    renderScreen()
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Abc12345')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Abc12345')
    await userEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(
      await screen.findByText(
        'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
      ),
    ).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('muestra el toggle de idioma y cambia toda la pantalla a inglés', async () => {
    render(
      <ToastProvider>
        <LangHarness>
          <NewPasswordScreen />
        </LangHarness>
      </ToastProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByRole('heading', { name: 'New password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save password/i })).toBeInTheDocument()
  })
})
