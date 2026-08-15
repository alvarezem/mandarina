import Auth from './Auth'
import ThemeToggle from './ThemeToggle'
import LangToggle from './LangToggle'
import { Logo } from './Sidebar'
import { DEFAULT_LANG, t } from '../lib/i18n'

export default function Landing({
  dark,
  onToggleTheme,
  lang = DEFAULT_LANG,
  onSelectLang = () => {},
}) {
  const features = t(lang, 'landing.features')
  const steps = t(lang, 'landing.steps')
  const when = t(lang, 'landing.when.items')
  const faq = t(lang, 'landing.faq.items')

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/40">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/10" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle lang={lang} onSelect={onSelectLang} />
        <div className="group">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-brand-500/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-brand-500/15" />
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
        <header className="mb-12 flex items-center justify-center gap-3 animate-fade-in-up">
          <Logo className="h-12 w-12" />
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Mandarina
          </span>
        </header>

        <section className="mx-auto mb-14 max-w-3xl text-center animate-fade-in-up">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
            {t(lang, 'landing.hero.title')}
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {t(lang, 'landing.hero.subtitle')}
          </p>
        </section>

        <div className="mb-14 flex justify-center">
          <Auth dark={dark} onToggleTheme={onToggleTheme} embedded lang={lang} />
        </div>

        <section className="mb-14 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">{f.title}</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mb-14" aria-label={t(lang, 'landing.how.title')}>
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'landing.how.title')}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
              >
                <span className="text-sm font-bold text-brand-500">
                  {t(lang, 'landing.step')} {i + 1}
                </span>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label={t(lang, 'landing.when.title')}>
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'landing.when.title')}
          </h2>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {when.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label={t(lang, 'landing.who.title')}>
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'landing.who.title')}
          </h2>
          <blockquote className="rounded-2xl border-l-4 border-brand-500 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-brand-400 dark:bg-slate-900/80">
            <p className="text-slate-600 italic dark:text-slate-300">
              “{t(lang, 'landing.testimonial.quote')}”
            </p>
            <footer className="mt-3 text-sm font-semibold text-brand-600 dark:text-brand-400">
              — {t(lang, 'landing.testimonial.author')}
            </footer>
          </blockquote>
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label={t(lang, 'landing.faq.title')}>
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, 'landing.faq.title')}
          </h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-slate-900 dark:text-slate-50">
                  {item.question}
                  <span className="shrink-0 text-brand-500 transition-transform group-open:rotate-45">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
