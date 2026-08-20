import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { canRequestPro, initialsOf, requestStatus } from '../lib/admin'
import { useLang } from './LangProvider'
import { usePro } from './ProProvider'
import { useToast } from './Toast'
import { useAsync } from '../hooks/useAsync'
import { t } from '../lib/i18n'

const memberSince = (user, lang) =>
  user?.created_at
    ? new Date(user.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

function ProCard({ isPro, subscription, request, onRequest }) {
  const { lang } = useLang()
  const pushToast = useToast()
  const [busy, setBusy] = useState(false)
  const status = requestStatus(request)
  const canRequest = canRequestPro({ isPro, request })

  const periodEnd =
    isPro && subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString(
          lang === 'en' ? 'en-US' : 'es-AR',
          { year: 'numeric', month: 'long', day: 'numeric' },
        )
      : null

  const badge =
    isPro || status === 'approved'
      ? { key: 'active', label: t(lang, 'profile.pro.active'), tone: 'text-emerald-600' }
      : status === 'pending'
        ? { key: 'pending', label: t(lang, 'profile.pro.pending'), tone: 'text-amber-600' }
        : { key: 'free', label: t(lang, 'profile.pro.free'), tone: 'text-slate-500' }
  const hintKey = isPro
    ? 'profile.pro.activeHint'
    : status === 'pending'
      ? 'profile.pro.pendingHint'
      : status === 'approved'
        ? 'profile.pro.approvedHint'
        : 'profile.pro.freeHint'

  const handleRequest = async () => {
    if (busy || !canRequest) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('request_pro')
      if (error) throw error
      onRequest()
    } catch {
      pushToast({ type: 'error', message: t(lang, 'profile.pro.err') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-white/70 p-4 backdrop-blur dark:border-brand-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t(lang, 'profile.pro.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t(lang, hintKey)}</p>
          {periodEnd && (
            <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t(lang, 'profile.pro.until', { date: periodEnd })}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isPro || status === 'approved'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : status === 'pending'
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {badge.label}
        </span>
      </div>
      {!isPro && (
        <button
          type="button"
          onClick={handleRequest}
          disabled={busy || !canRequest}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : null}
          {status === 'pending'
            ? t(lang, 'profile.pro.sent')
            : status === 'approved'
              ? t(lang, 'profile.pro.approved')
              : t(lang, 'profile.pro.cta')}
        </button>
      )}
    </div>
  )
}

export default function ProfileView({ session }) {
  const { lang } = useLang()
  const pushToast = useToast()
  const userId = session?.user?.id
  const { isPro, subscription } = usePro()

  const {
    data: request,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    if (!userId) return null
    const { data, error: err } = await supabase
      .from('pro_requests')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
    if (err) throw err
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  }, [userId])

  const onRequest = () => {
    reload()
    pushToast({ type: 'success', message: t(lang, 'profile.pro.requested') })
  }

  const user = session?.user ?? {}

  return (
    <div className="animate-fade-in-up mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t(lang, 'profile.title')}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t(lang, 'profile.subtitle')}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              {initialsOf(user.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {user.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t(lang, 'profile.memberSince')} {memberSince(user, lang)}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
        ) : (
          <ProCard
            isPro={isPro}
            subscription={subscription}
            request={request}
            onRequest={onRequest}
          />
        )}
      </div>
    </div>
  )
}
