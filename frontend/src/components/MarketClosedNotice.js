import { Logo } from './Sidebar'

export default function MarketClosedNotice({ onClose }) {
  return (
    <div
      role="status"
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40"
    >
      <div className="flex min-w-0 items-center gap-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        <Logo className="h-5 w-5 shrink-0" />
        <span>
          Mercado cerrado · Las cotizaciones son del último cierre y se actualizan cuando el mercado
          vuelva a abrir (lun–vie, 11 a 17 h).
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        title="Cerrar"
        className="shrink-0 rounded-lg p-1.5 text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
