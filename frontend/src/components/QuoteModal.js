import PriceChart from './PriceChart'

export default function QuoteModal({
  modal,
  chartQuote,
  chartPoints,
  chartData,
  display,
  onRange,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Gráfico de ${modal.symbol}`}
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Precio · {modal.symbol}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gráfico"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <PriceChart
          symbol={modal.symbol}
          range={modal.range}
          points={chartPoints}
          loading={chartData.loading}
          error={chartData.error}
          onRange={(r) => onRange(r, 'modal')}
          quote={chartQuote}
          display={display}
        />
      </div>
    </div>
  )
}
