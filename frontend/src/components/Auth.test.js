import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from './Auth'

jest.mock('../lib/supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}))

const supabase = require('../lib/supabaseClient').default

describe('Auth', () => {
  beforeEach(() => {
    supabase.auth.signUp.mockReset()
    supabase.auth.signInWithPassword.mockReset()
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    supabase.auth.signUp.mockResolvedValue({ error: null })
  })

  it('muestra el formulario de login por defecto', () => {
    render(<Auth />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('inicia sesión con email y contraseña', async () => {
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    })
  })

  it('alterna a signup y registra la cuenta', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(screen.getByRole('button', { name: /Crear cuenta/i })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'c@d.com',
      password: 'pass123',
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
})
