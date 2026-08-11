import { useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { authErrorToSpanish } from '../lib/authErrors'
import ThemeToggle from './ThemeToggle'
import { Logo } from './Sidebar'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function strengthOf(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score)
}

const STRENGTH_LABEL = ['', 'Débil', 'Media', 'Buena', 'Fuerte']
const STRENGTH_BAR = ['', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

function GoogleIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.86 11.86 0 0 0 0 12c0 1.94.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}

export default function Auth({ dark, onToggleTheme }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const strength = useMemo(() => strengthOf(password), [password])

  const toggleMode = () => {
    setIsSignUp((prev) => !prev)
    setFieldErrors({})
    setError(null)
    setEmailTaken(false)
    setForgotMode(false)
    setResetSent(false)
  }

  const validate = () => {
    const errors = {}
    if (!EMAIL_RE.test(email)) errors.email = 'Ingresá un email válido'
    if (isSignUp) {
      if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres'
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
        errors.password = 'La contraseña debe incluir letras y números'
      if (confirm !== password) errors.confirm = 'Las contraseñas no coinciden'
    } else if (!password) {
      errors.password = 'Ingresá tu contraseña'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (isSignUp && error.code === 'user_already_exists') {
          setEmailTaken(true)
          return
        }
        setError(authErrorToSpanish(error))
        return
      }
      if (isSignUp && data.user && !data.session) {
        if (data.user.identities && data.user.identities.length === 0) {
          setEmailTaken(true)
        } else {
          setSignupSuccess(true)
        }
      }
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) {
        setError(authErrorToSpanish(error))
        return
      }
      setResetSent(true)
    } catch {
      setError('No se pudo enviar el email. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) setError(authErrorToSpanish(error))
    } catch {
      setError('No se pudo conectar con Google. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (invalid) =>
    `w-full rounded-lg border px-3 py-2 text-slate-900 outline-none transition focus:ring-2 dark:text-slate-100 dark:placeholder:text-slate-500 ${
      invalid
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60'
        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800'
    }`

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/40 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/40">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10" />

      <div className="group absolute right-4 top-4 z-10">
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-brand-500/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-brand-500/15" />
        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center animate-fade-in-up">
          <Logo className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Mandarina
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A tu plata, sacale todo el jugo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-8 shadow-lg shadow-slate-200/50 backdrop-blur animate-fade-in-up dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
          {signupSuccess ? (
            <div className="text-center animate-fade-in-up" role="status">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Casi listo</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Te enviamos un email a <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>{' '}
                para confirmar tu cuenta. Revisá tu bandeja de entrada.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSignupSuccess(false)
                  setIsSignUp(false)
                  setPassword('')
                  setConfirm('')
                }}
                className="mt-6 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : emailTaken ? (
            <div className="text-center animate-fade-in-up" role="status">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Ya existe una cuenta</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ya existe una cuenta con el email{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>. Si es tuya, podés
                iniciar sesión o recuperar tu contraseña.
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-70"
              >
                {submitting ? 'Enviando…' : 'Recuperar contraseña'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailTaken(false)
                  setIsSignUp(false)
                  setPassword('')
                  setConfirm('')
                }}
                className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Volver a iniciar sesión
              </button>
              {resetSent && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 animate-fade-in dark:bg-emerald-950/50 dark:text-emerald-400">
                  Te enviamos un link de recuperación a <span className="font-medium">{email}</span>. Revisá tu bandeja de entrada.
                </p>
              )}
            </div>
          ) : forgotMode ? (
            <form onSubmit={handleResetPassword} className="animate-fade-in-up" noValidate>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ingresá tu email y te enviamos un link para crear una nueva contraseña.
              </p>
              <label className="mb-1 mt-5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder="tu@email.com"
                autoComplete="email"
                className={fieldClass(false)}
              />
              <button
                type="submit"
                disabled={submitting || !EMAIL_RE.test(email)}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-70"
              >
                {submitting ? 'Enviando…' : 'Enviar link de recuperación'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setResetSent(false)
                  setError(null)
                }}
                className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Volver
              </button>
              {resetSent && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 animate-fade-in dark:bg-emerald-950/50 dark:text-emerald-400">
                  Te enviamos un link a <span className="font-medium">{email}</span>. Revisá tu bandeja de entrada.
                </p>
              )}
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                ) : (
                  <GoogleIcon className="h-5 w-5" />
                )}
                Continuar con Google
              </button>

              <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                o
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div key={isSignUp ? 'signup' : 'login'} className="animate-fade-in-up">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }))
                    }}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={fieldClass(Boolean(fieldErrors.email))}
                  />
                  <FieldError id="email-error" message={fieldErrors.email} />

                  <label className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }))
                      }}
                      placeholder="••••••••"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      className={`${fieldClass(Boolean(fieldErrors.password))} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <FieldError id="password-error" message={fieldErrors.password} />

                  {!isSignUp && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true)
                          setError(null)
                        }}
                        className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  {isSignUp && (
                    <>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i <= strength ? STRENGTH_BAR[strength] : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        {password && (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {STRENGTH_LABEL[strength]}
                          </span>
                        )}
                      </div>

                      <label className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="confirm">
                        Confirmar contraseña
                      </label>
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value)
                          if (fieldErrors.confirm) setFieldErrors((f) => ({ ...f, confirm: undefined }))
                        }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={Boolean(fieldErrors.confirm)}
                        aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
                        className={fieldClass(Boolean(fieldErrors.confirm))}
                      />
                      <FieldError id="confirm-error" message={fieldErrors.confirm} />
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-70"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                        {isSignUp ? 'Creando cuenta…' : 'Ingresando…'}
                      </span>
                    ) : isSignUp ? (
                      'Crear cuenta'
                    ) : (
                      'Iniciar sesión'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {!signupSuccess && !emailTaken && !forgotMode && (
            <button
              type="button"
              onClick={toggleMode}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isSignUp ? 'Ya tengo cuenta' : 'Crear cuenta'}
            </button>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 animate-fade-in dark:bg-red-950/50 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
