import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useLang } from './LangProvider'
import { useToast } from './Toast'
import { useAsync } from '../hooks/useAsync'
import { t } from '../lib/i18n'

const STATUS_KEY = {
  active: 'admin.status.active',
  canceled: 'admin.status.canceled',
  past_due: 'admin.status.past_due',
  expired: 'admin.status.expired',
}

const MONTH_OPTIONS = [1, 3, 6, 12]

const shortDate = (iso, lang) =>
  iso
    ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const remainingMonths = (iso) => {
  if (!iso) return null
  const end = new Date(iso)
  const now = new Date()
  if (end <= now) return 0
  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  if (end.getDate() < now.getDate()) months -= 1
  return Math.max(0, months)
}

const isBanned = (u) => u?.banned_until && new Date(u.banned_until) > new Date()

function Badge({ status }) {
  const { lang } = useLang()
  if (status === 'active') {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
        {t(lang, 'admin.status.active')}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
        {t(lang, 'admin.status.pending')}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {t(lang, STATUS_KEY[status] ?? 'admin.none')}
    </span>
  )
}

function BannedBadge() {
  const { lang } = useLang()
  return (
    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
      {t(lang, 'admin.status.banned')}
    </span>
  )
}

function ActionButton({ onClick, busy, label, tone = 'primary' }) {
  const tones = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500',
    danger:
      'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {busy && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {label}
    </button>
  )
}

export default function AdminView({ currentUserId }) {
  const { lang } = useLang()
  const pushToast = useToast()
  const [busy, setBusy] = useState(null)
  const [monthsByUser, setMonthsByUser] = useState({})

  const {
    data: overview,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    const { data, error: err } = await supabase.rpc('admin_pro_overview')
    if (err) throw err
    return data
  }, [])

  const requests = Array.isArray(overview?.requests) ? overview.requests : []
  const users = Array.isArray(overview?.users) ? overview.users : []
  const proActive = users.filter((u) => u.status === 'active').length

  const monthsOf = (id) => monthsByUser[id] ?? 1
  const setMonths = (id, value) => setMonthsByUser((prev) => ({ ...prev, [id]: Number(value) }))

  const durationLabel = (n) => `${n} ${t(lang, n === 1 ? 'admin.month' : 'admin.months')}`

  const run = async (key, fn, okMessage, errKey = 'admin.err.set') => {
    if (busy) return
    setBusy(key)
    try {
      const { error: err } = await fn()
      if (err) throw err
      reload()
      if (okMessage) pushToast({ type: 'success', message: okMessage })
    } catch {
      pushToast({ type: 'error', message: t(lang, errKey) })
    } finally {
      setBusy(null)
    }
  }

  const setStatus = (user, status) =>
    run(
      `${user.user_id}:${status}`,
      () =>
        supabase.rpc('admin_set_subscription', {
          p_user_id: user.user_id,
          p_status: status,
          ...(status === 'active' ? { p_months: monthsOf(user.user_id) } : {}),
        }),
      status === 'active'
        ? t(lang, 'admin.ok.active', { email: user.email })
        : t(lang, 'admin.ok.canceled', { email: user.email }),
    )

  const confirmSetStatus = (user, status) => {
    if (status === 'active') {
      setStatus(user, status)
      return
    }
    if (!window.confirm(t(lang, 'admin.confirm.cancel', { email: user.email }))) return
    setStatus(user, status)
  }

  const setBan = (user, bannedUntil, okKey) =>
    run(
      `${user.user_id}:${bannedUntil ? 'ban' : 'unban'}`,
      () =>
        supabase.rpc('admin_ban_user', { p_user_id: user.user_id, p_banned_until: bannedUntil }),
      t(lang, okKey, { email: user.email }),
      'admin.err.ban',
    )

  const confirmBan = (user) => {
    if (!window.confirm(t(lang, 'admin.confirm.ban', { email: user.email }))) return
    const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    setBan(user, farFuture, 'admin.ok.banned')
  }

  const confirmUnban = (user) => {
    if (!window.confirm(t(lang, 'admin.confirm.unban', { email: user.email }))) return
    setBan(user, null, 'admin.ok.unbanned')
  }

  const dismiss = (req) =>
    run(
      `dismiss:${req.user_id}`,
      () => supabase.rpc('admin_dismiss_request', { p_user_id: req.user_id }),
      t(lang, 'admin.ok.dismissed', { email: req.email }),
    )

  if (loading) {
    return (
      <div className="animate-fade-in-up flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t(lang, 'admin.title')}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t(lang, 'admin.subtitle')}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t(lang, 'admin.counters.active')}
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {proActive}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t(lang, 'admin.counters.pending')}
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {requests.length}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t(lang, 'admin.requests.title')}
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {t(lang, 'admin.requests.empty')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.email')}</th>
                  <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.date')}</th>
                  <th className="py-2 font-medium">{t(lang, 'admin.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.user_id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{r.email}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {shortDate(r.created_at, lang)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={t(lang, 'admin.duration')}
                          value={monthsOf(r.user_id)}
                          onChange={(e) => setMonths(r.user_id, e.target.value)}
                          className="h-8 rounded-lg border border-slate-300 bg-white px-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {durationLabel(m)}
                            </option>
                          ))}
                        </select>
                        <ActionButton
                          label={t(lang, 'admin.act')}
                          onClick={() =>
                            setStatus({ user_id: r.user_id, email: r.email }, 'active')
                          }
                          busy={busy === `${r.user_id}:active`}
                        />
                        <ActionButton
                          label={t(lang, 'admin.dismiss')}
                          tone="danger"
                          onClick={() => dismiss(r)}
                          busy={busy === `dismiss:${r.user_id}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t(lang, 'admin.users.title')}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.email')}</th>
                <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.date')}</th>
                <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.status')}</th>
                <th className="py-2 pr-4 font-medium">{t(lang, 'admin.col.expires')}</th>
                <th className="py-2 font-medium">{t(lang, 'admin.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const banned = isBanned(u)
                const remaining =
                  u.status === 'active' ? remainingMonths(u.current_period_end) : null
                const isSelf = u.user_id === currentUserId
                return (
                  <tr
                    key={u.user_id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{u.email}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {shortDate(u.created_at, lang)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge status={u.status ?? 'none'} />
                        {banned && <BannedBadge />}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {remaining != null ? (
                        <>
                          {shortDate(u.current_period_end, lang)}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {' '}
                            · {durationLabel(remaining)}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {u.status === 'active' ? (
                          <ActionButton
                            label={t(lang, 'admin.cancel')}
                            tone="danger"
                            onClick={() => confirmSetStatus(u, 'canceled')}
                            busy={busy === `${u.user_id}:canceled`}
                          />
                        ) : (
                          <>
                            <select
                              aria-label={t(lang, 'admin.duration')}
                              value={monthsOf(u.user_id)}
                              onChange={(e) => setMonths(u.user_id, e.target.value)}
                              className="h-8 rounded-lg border border-slate-300 bg-white px-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            >
                              {MONTH_OPTIONS.map((m) => (
                                <option key={m} value={m}>
                                  {durationLabel(m)}
                                </option>
                              ))}
                            </select>
                            <ActionButton
                              label={t(lang, 'admin.act')}
                              onClick={() => setStatus(u, 'active')}
                              busy={busy === `${u.user_id}:active`}
                            />
                          </>
                        )}
                        {!isSelf &&
                          (banned ? (
                            <ActionButton
                              label={t(lang, 'admin.unban')}
                              tone="danger"
                              onClick={() => confirmUnban(u)}
                              busy={busy === `${u.user_id}:unban`}
                            />
                          ) : (
                            <ActionButton
                              label={t(lang, 'admin.ban')}
                              tone="danger"
                              onClick={() => confirmBan(u)}
                              busy={busy === `${u.user_id}:ban`}
                            />
                          ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
