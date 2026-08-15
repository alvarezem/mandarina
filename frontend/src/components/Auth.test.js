import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from './Auth'
import supabase from '../lib/supabaseClient'
import { LangProvider } from './LangProvider'

describe('Auth', () => {
  beforeEach(() => {
    supabase.auth.signUp.mockReset()
    supabase.auth.signInWithPassword.mockReset()
    supabase.auth.signInWithOAuth.mockReset()
    supabase.auth.resetPasswordForEmail.mockReset()
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: null },
      error: null,
    })
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
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
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Credenciales inválidas' },
    })
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
    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument()
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

  it('bloquea el signup con contraseña sin números', async () => {
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'onlyletters')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'onlyletters')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(
      await screen.findByText('La contraseña debe incluir letras y números'),
    ).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('traduce el error de login a español', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }))
    expect(await screen.findByText('Email o contraseña incorrectos')).toBeInTheDocument()
  })

  it('traduce el error de weak password del servidor a español', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 8 characters', code: 'weak_password' },
    })
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    expect(
      await screen.findByText(
        'La contraseña no cumple los requisitos: al menos 8 caracteres con letras y números',
      ),
    ).toBeInTheDocument()
  })

  it('muestra "Ya existe una cuenta" cuando signup devuelve user_already_exists', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    })
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Ya existe una cuenta/i })).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Casi listo/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recuperar contraseña/i })).toBeInTheDocument()
  })

  it('muestra "Ya existe una cuenta" si el email ya está registrado', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [] }, session: null },
      error: null,
    })
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Ya existe una cuenta/i })).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Casi listo/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recuperar contraseña/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Volver a iniciar sesión/i })).toHaveLength(1)
  })

  it('envía el reset de contraseña desde la pantalla de email existente', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [] }, session: null },
      error: null,
    })
    render(<Auth />)
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'c@d.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Recuperar contraseña/i }))
    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('c@d.com', {
        redirectTo: 'http://localhost',
      }),
    )
    expect(await screen.findByText(/Te enviamos un link de recuperación/i)).toBeInTheDocument()
  })

  it('muestra "¿Olvidaste tu contraseña?" en el login y envía el reset', async () => {
    render(<Auth />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.click(screen.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i }))
    expect(screen.getByRole('heading', { name: /Recuperar contraseña/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Enviar link de recuperación/i }))
    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
        redirectTo: 'http://localhost',
      }),
    )
    expect(await screen.findByText(/Te enviamos un link a/i)).toBeInTheDocument()
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

  it('muestra el difuminado naranja del toggle de tema solo al pasar el mouse', () => {
    render(<Auth />)
    const button = screen.getByRole('button', { name: 'Cambiar a tema oscuro' })
    const group = button.closest('.group')
    const glow = group.querySelector('.rounded-full')
    expect(glow).toHaveClass('opacity-0')
    expect(glow).toHaveClass('group-hover:opacity-100')
  })

  it('renderiza en inglés cuando lang es en', () => {
    render(
      <LangProvider lang="en" setLang={vi.fn()}>
        <Auth />
      </LangProvider>,
    )
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
