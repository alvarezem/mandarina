import { useMemo, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { authErrorToMessage } from '../lib/authErrors'
import { strengthOf, STRENGTH_BAR, validatePassword } from '../lib/password'
import { t } from '../lib/i18n'
import ThemeToggle from './ThemeToggle'
import { Logo } from './Sidebar'
import { useToast } from './Toast'
import { useLang } from './LangProvider'

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}

export default function NewPasswordScreen({ dark, onToggleTheme }) {
  const { lang } = useLang()
  const pushToast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => strengthOf(password), [password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const errors = {}
    const passwordError = validatePassword(password, lang)
    if (passwordError) errors.password = passwordError
    if (confirm !== password) errors.confirm = t(lang, 'auth.passwordsMismatch')
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(authErrorToMessage(error, lang))
        return
      }
      await supabase.auth.signOut()
      pushToast({ type: 'success', icon: 'wave', message: t(lang, 'password.updated') })
    } catch {
      setError(t(lang, 'password.updateError'))
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

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      aria-label={showPassword ? t(lang, 'auth.hidePassword') : t(lang, 'auth.showPassword')}
      title={showPassword ? t(lang, 'auth.hidePassword') : t(lang, 'auth.showPassword')}
      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        {showPassword ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.573 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
        )}
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  )

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
            {t(lang, 'password.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'password.subtitle')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-8 shadow-lg shadow-slate-200/50 backdrop-blur animate-fade-in-up dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
          <form onSubmit={handleSubmit} noValidate>
            <label
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="new-password"
            >
              {t(lang, 'auth.password')}
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }))
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className={`${fieldClass(Boolean(fieldErrors.password))} pr-11`}
              />
              {eyeButton}
            </div>
            <FieldError id="password-error" message={fieldErrors.password} />

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
                  {t(lang, 'auth.strength')[strength]}
                </span>
              )}
            </div>

            <label
              className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="confirm-password"
            >
              {t(lang, 'auth.confirm')}
            </label>
            <div className="relative">
              <input
                id="confirm-password"
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
                className={`${fieldClass(Boolean(fieldErrors.confirm))} pr-11`}
              />
              {eyeButton}
            </div>
            <FieldError id="confirm-error" message={fieldErrors.confirm} />

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-70"
            >
              {submitting ? t(lang, 'password.saving') : t(lang, 'password.save')}
            </button>
          </form>

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
