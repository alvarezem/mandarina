import { useEffect, useRef, useState } from 'react'
import { Logo } from './Sidebar'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

const TARGETS = [null, 'egresos', 'resumenes', 'inversiones', 'inversiones', 'help']

const FINAL_ICON = <Logo className="h-9 w-9" />

const PAD = 10

export default function OnboardingTour({ open, onClose }) {
  const { lang } = useLang()
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState(null)
  const cardRef = useRef(null)

  const dictSteps = t(lang, 'tour.steps')
  const finalBody = (
    <>
      {t(lang, 'tour.finalBody')} <Logo className="inline h-5 w-5 align-[-3px]" />
    </>
  )
  const steps = dictSteps.map((s, i) => {
    const last = i === dictSteps.length - 1
    return {
      title: s.title,
      body: last ? finalBody : s.body,
      target: TARGETS[i],
      icon: last ? FINAL_ICON : undefined,
    }
  })

  // Ajustes en render (patrón de React): reinicia el paso al reabrir y deriva
  // el target nulo sin setState síncrono en effects.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open && open !== prevOpen) {
    setPrevOpen(open)
    setStep(0)
  }
  const targetKey = TARGETS[step]
  const shownTarget = targetKey ? target : null

  useEffect(() => {
    if (!open) return
    cardRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const key = TARGETS[step]
    if (!key) return
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

  const stepData = steps[step]
  const isLast = step === steps.length - 1
  const holeR = shownTarget ? Math.max(shownTarget.w, shownTarget.h) / 2 + PAD + 8 : 0
  const mask = shownTarget
    ? `radial-gradient(circle at ${shownTarget.x}px ${shownTarget.y}px, transparent ${holeR}px, black ${holeR + 40}px)`
    : undefined

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-y-auto ${
        shownTarget
          ? 'flex items-start justify-center p-4 pt-20 pb-32 lg:items-center lg:py-4'
          : 'flex items-center justify-center p-4'
      }`}
    >
      <div
        data-testid="tour-backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        onClick={onClose}
      />
      {shownTarget && (
        <div
          data-testid="tour-target-ring"
          aria-hidden="true"
          className="pointer-events-none absolute z-10 animate-pulse rounded-xl ring-2 ring-brand-500 shadow-[0_0_0_6px_rgba(249,115,22,0.25)]"
          style={{
            left: shownTarget.x - shownTarget.w / 2 - PAD,
            top: shownTarget.y - shownTarget.h / 2 - PAD,
            width: shownTarget.w + PAD * 2,
            height: shownTarget.h + PAD * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'tour.aria', { step: step + 1, total: steps.length })}
        tabIndex={-1}
        className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-0 sm:p-8 sm:pb-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            {stepData.icon ?? (
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
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
              {steps.map((_, i) => (
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
              aria-label={t(lang, 'tour.skipAria')}
              title={t(lang, 'tour.skip')}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 pt-4 sm:p-8 sm:pt-5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {stepData.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            {stepData.body}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-5 dark:border-slate-800 sm:p-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2.5 text-base font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t(lang, 'tour.prev')}
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t(lang, 'tour.skip')}
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-500 dark:hover:bg-brand-400 sm:px-6 sm:py-3"
            >
              {isLast ? t(lang, 'tour.finish') : t(lang, 'tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
