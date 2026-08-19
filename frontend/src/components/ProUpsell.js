import { t } from '../lib/i18n'
import { useLang } from './LangProvider'
import { useToast } from './Toast'

// Panel de upgrade del tier Pro. Se muestra en lugar de ReportsView cuando el
// usuario no tiene una suscripción activa. El billing de MercadoPago (checkout
// + webhook) llega en un paso futuro: hoy el botón informa que el cobro aún no
// está activo y la activación es manual.
export default function ProUpsell() {
  const { lang } = useLang()
  const pushToast = useToast()

  const handleSubscribe = () => {
    pushToast({ type: 'info', message: t(lang, 'pro.upcoming') })
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t(lang, 'reports.title')}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t(lang, 'pro.subtitle')}
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-brand-200 bg-white/70 p-6 text-center shadow-sm backdrop-blur dark:border-brand-800 dark:bg-slate-900/70">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl dark:bg-brand-950/40">
          <span aria-hidden="true">🍊</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {t(lang, 'pro.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(lang, 'pro.description')}
        </p>

        <ul className="mt-4 space-y-2 text-left">
          {['excel', 'csv', 'pdf', 'fiscal'].map((k) => (
            <li
              key={k}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
            >
              <svg
                className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{t(lang, `pro.features.${k}`)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleSubscribe}
          className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          {t(lang, 'pro.cta')}
        </button>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{t(lang, 'pro.note')}</p>
      </div>
    </div>
  )
}
