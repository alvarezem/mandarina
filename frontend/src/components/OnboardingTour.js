import { useEffect, useRef, useState } from 'react'
import { Logo } from './Sidebar'

const TOUR_STEPS = [
  {
    title: 'Bienvenido/a a Mandarina 🍊',
    body: 'Mandarina concentra tus finanzas en un solo lugar: seguí tus gastos con resúmenes de tarjeta y armá un plan de inversión. Esta guía te muestra todo en menos de un minuto.',
    target: null,
  },
  {
    title: 'Costos',
    body: 'Al subir resúmenes, separás los gastos en gajos: se categorizan automáticamente y podés reasignarlos con un clic (la categoría se recuerda por comercio). También filtrás por período, tipo y comercio, y ves totales y gráficos de evolución.',
    target: 'costos',
  },
  {
    title: 'Resúmenes',
    body: 'Subí tus resúmenes en PDF, CSV o XLSX desde la pestaña Resúmenes. Se procesan solos: solo tenés que revisar el período y el tipo de tarjeta antes de guardarlos.',
    target: 'resumenes',
  },
  {
    title: 'Inversiones · Plan de inversión',
    body: 'Definí tu cartera: importá un archivo XLSX, agregá activos, cargá precios de BYMA y un presupuesto de compra. Alterná entre pesos (ARS) y dólares (USD) cuando quieras.',
    target: 'inversiones',
  },
  {
    title: 'Inversiones · Cotizaciones en vivo',
    body: 'Seguí el valor de tu patrimonio y las cotizaciones en vivo: gráficos por activo, sesión del día y la evolución de tus posiciones, todo actualizado.',
    target: 'inversiones',
  },
  {
    title: '¡Eso es todo!',
    body: (
      <>
        Cuando lo necesites, volvé a abrir esta guía desde el ícono ? del encabezado. Ahora sí, a sacarle todo el jugo.{' '}
        <Logo className="inline h-5 w-5 align-[-3px]" />
      </>
    ),
    icon: <Logo className="h-9 w-9" />,
    target: 'help',
  },
]

const PAD = 10

export default function OnboardingTour({ open, onClose }) {
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    cardRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const key = TOUR_STEPS[step]?.target
    if (!key) {
      setTarget(null)
      return
    }
    const compute = () => {
      const els = document.querySelectorAll(`[data-tour="${key}"]`)
      if (els.length === 0) return
      let el = els[0]
      for (const candidate of els) {
        const r = candidate.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          el = candidate
          break
        }
      }
      const r = el.getBoundingClientRect()
      setTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [open, step])

  if (!open) return null

  const stepData = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const holeR = target ? Math.max(target.w, target.h) / 2 + PAD + 8 : 0
  const mask = target
    ? `radial-gradient(circle at ${target.x}px ${target.y}px, transparent ${holeR}px, black ${holeR + 40}px)`
    : undefined

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-y-auto ${
        target ? 'flex items-start justify-center p-4 pt-20 pb-32 lg:items-center lg:py-4' : 'flex items-center justify-center p-4'
      }`}
    >
      <div
        data-testid="tour-backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        onClick={onClose}
      />
      {target && (
        <div
          data-testid="tour-target-ring"
          aria-hidden="true"
          className="pointer-events-none absolute z-10 animate-pulse rounded-xl ring-2 ring-brand-500 shadow-[0_0_0_6px_rgba(249,115,22,0.25)]"
          style={{
            left: target.x - target.w / 2 - PAD,
            top: target.y - target.h / 2 - PAD,
            width: target.w + PAD * 2,
            height: target.h + PAD * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Guía de Mandarina · paso ${step + 1} de ${TOUR_STEPS.length}`}
        tabIndex={-1}
        className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-0 sm:p-8 sm:pb-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            {stepData.icon ?? (
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="mr-1 flex items-center gap-1.5" aria-hidden="true">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step ? 'w-5 bg-brand-500' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Omitir guía"
              title="Omitir"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 pt-4 sm:p-8 sm:pt-5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{stepData.title}</h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">{stepData.body}</p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-5 dark:border-slate-800 sm:p-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2.5 text-base font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← Anterior
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Omitir
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-500 dark:hover:bg-brand-400 sm:px-6 sm:py-3"
            >
              {isLast ? 'Finalizar' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
