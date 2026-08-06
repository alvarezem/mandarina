import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from './Auth'

jest.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}))

const supabase = require('../lib/supabaseClient').default

describe('Auth', () => {
  beforeEach(() => {
    supabase.auth.signUp.mockReset()
    supabase.auth.signInWithPassword.mockReset()
    supabase.auth.signInWithOAuth.mockReset()
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    })
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
  })

  it('muestra el formulario de login por defecto', () => {
    render(<Auth />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar con Google/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Confirmar contraseña')).not.toBeInTheDocument()
  })

  it('inicia sesión con email y contraseña', async () => {
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument(),
    )
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    })
  })

  it('muestra el error cuando el login falla', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Credenciales inválidas' } })
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }))
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })

  it('valida email inválido y no envía el formulario', async () => {
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-un-email')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }))
    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument()
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('alterna a signup y muestra confirmar contraseña + fuerza', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'P@ssw0rd123')
    expect(await screen.findByText('Fuerte')).toBeInTheDocument()
  })

  it('bloquea el signup con contraseña corta o que no coincide', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'short')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'other123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('registra la cuenta y muestra el estado de confirmación por email', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await waitFor(() => expect(screen.getByText(/Casi listo/i)).toBeInTheDocument())
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'c@d.com',
      password: 'password123',
    })
    expect(screen.getByRole('button', { name: /Volver a iniciar sesión/i })).toBeInTheDocument()
  })

  it('inicia OAuth con Google', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }))
    await waitFor(() =>
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost' },
      }),
    )
  })
})
