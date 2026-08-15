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

const STEPS = [
  {
    title: 'Subí tu resumen',
    text: 'Cargás el resumen de tu tarjeta de crédito en formato CSV, XLSX o PDF.',
  },
  {
    title: 'Mirá tu análisis',
    text: 'Mandarina clasifica cada movimiento por categoría y comercio, y te muestra totales, ingresos recurrentes y la evolución del consumo.',
  },
  {
    title: 'Planificá e invertí',
    text: 'Definís tu plan de inversión, seguís cotizaciones en vivo de BYMA y registrás tus operaciones para ver tu rentabilidad.',
  },
]

const WHEN = [
  'Dejar de cargar tus gastos a mano en una planilla de Excel.',
  'Ver tus gastos e ingresos categorizados automáticamente, en español.',
  'Armar un plan de inversión con metas porcentuales y seguirlo con cotizaciones en vivo.',
  'Llevar un registro de tus compras y ventas (costo promedio y rentabilidad).',
]

const TESTIMONIAL = {
  quote:
    'Empecé Mandarina por necesidad: estaba cansado de cargar todos mis gastos a mano en una planilla de Excel. Cuando arranqué con las inversiones, decidí sumar esa sección para tener todas mis finanzas en un mismo lugar de confianza. Hoy subo mi resumen, veo los gastos categorizados y sigo mi plan sin volver a la planilla.',
  author: 'Usuario y creador de Mandarina',
}

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

        <section className="mb-14" aria-label="Cómo funciona">
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Cómo funciona
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
              >
                <span className="text-sm font-bold text-brand-500">Paso {i + 1}</span>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label="Cuándo conviene Mandarina">
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            ¿Cuándo conviene Mandarina?
          </h2>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {WHEN.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mb-14 max-w-3xl" aria-label="Testimonios">
          <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Quién la usa
          </h2>
          <blockquote className="rounded-2xl border-l-4 border-brand-500 bg-slate-50/95 p-5 shadow-sm backdrop-blur dark:border-brand-400 dark:bg-slate-900/80">
            <p className="text-slate-600 italic dark:text-slate-300">“{TESTIMONIAL.quote}”</p>
            <footer className="mt-3 text-sm font-semibold text-brand-600 dark:text-brand-400">
              — {TESTIMONIAL.author}
            </footer>
          </blockquote>
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
