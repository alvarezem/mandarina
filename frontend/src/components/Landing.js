import Auth from './Auth'
import ThemeToggle from './ThemeToggle'
import { Logo } from './Sidebar'

const FEATURES = [
  {
    title: 'Analizá tu consumo',
    text: 'Subís tus resúmenes (CSV, XLSX o PDF) y Mandarina clasifica tus gastos por categoría y comercio, detecta tus ingresos recurrentes y te muestra la evolución mes a mes.',
  },
  {
    title: 'Planificá tus inversiones',
    text: 'Armá tu plan de inversión con metas porcentuales, seguí cotizaciones en vivo de BYMA (acciones, CEDEARs y bonos) con histórico de precios y registrá tus operaciones para ver cuánto ganaste.',
  },
  {
    title: 'Gratis y con tus datos privados',
    text: 'Sin publicidad y sin letra chica: cada cuenta solo ve sus propios datos y podés borrarlos cuando quieras.',
  },
]

const FAQ = [
  {
    question: '¿Qué es Mandarina y para quién es?',
    answer:
      'Mandarina es una app gratuita que analiza los resúmenes de tus tarjetas de crédito. Subís tus archivos y obtenés un dashboard con gastos categorizados, vista de ingresos, plan de inversión con metas y cotizaciones en vivo. Está pensada para cualquier persona que quiera entender a dónde va su plata y tomar decisiones con datos, sin ser experta en finanzas.',
  },
  {
    question: '¿Por qué elegir Mandarina?',
    answer:
      'Porque te ahorra cargar y clasificar gastos a mano, es gratis, sin publicidad y con tus datos protegidos. Suma un plan de inversión con metas porcentuales, cotizaciones en vivo, historial de precios, y un registro de operaciones (ledger) para saber cuánto ganaste o perdiste con cada posición.',
  },
  {
    question: '¿Qué puedo esperar al usarla?',
    answer:
      'Subís un resumen y Mandarina lo procesa: totales, gastos por categoría y comercio, ingresos recurrentes (por ejemplo tu sueldo) y la evolución del consumo en el tiempo. Después podés armar tu plan de inversión, seguir cotizaciones en vivo y registrar compras y ventas para ver tu rentabilidad.',
  },
]

export default function Landing({ dark, onToggleTheme }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/40">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/10" />

      <div className="group absolute right-4 top-4 z-10">
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-brand-500/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-brand-500/15" />
        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
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
            A tu plata, sacale todo el jugo
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Mandarina analiza los resúmenes de tus tarjetas de crédito y te muestra tus gastos
            categorizados, tus ingresos y la evolución de tu consumo. Después te ayuda a planificar
            inversiones con cotizaciones en vivo.
          </p>
        </section>

        <section className="mb-14 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">{f.title}</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label="Preguntas frecuentes">
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
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

        <div className="flex justify-center">
          <Auth dark={dark} onToggleTheme={onToggleTheme} embedded />
        </div>
      </div>
    </div>
  )
}
