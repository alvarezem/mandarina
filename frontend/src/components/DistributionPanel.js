import { fmt } from '../lib/format'

const STRATEGY_OPTIONS = [
  { key: 'faltante', label: 'Mayor faltante ($)' },
  { key: 'gap', label: 'Mayor faltante (%)' },
  { key: 'billetera', label: 'Mayor % de cartera' },
  { key: 'peso', label: 'Mayor peso objetivo' },
  { key: 'barato', label: 'Más barato' },
  { key: 'caro', label: 'Más caro' },
]

export default function DistributionPanel({
  budget,
  onBudget,
  strategy,
  onStrategy,
  dist,
  display,
  onBuy,
}) {
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tengo para comprar
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Priorizar por
          <select
            value={strategy}
            onChange={(e) => onStrategy(e.target.value)}
            aria-label="Prioridad de compra"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {STRATEGY_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="number"
            value={budget}
            onChange={(e) => onBudget(e.target.value)}
            placeholder={display === 'USD' ? '0' : '0'}
            aria-label="Presupuesto para comprar"
            min={0}
            className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400">{display}</span>
        </label>
      </div>

      {Number(budget) > 0 ? (
        dist.steps.length > 0 ? (
          <>
            <ul className="flex flex-col gap-1.5">
              {dist.steps.map((step, i) => (
                <li
                  key={`${step.symbol}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {step.symbol}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">≈{step.qty} u</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {fmt(step.amount, display)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onBuy(step)}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-400"
                    >
                      Comprar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {dist.covered
                ? `Te sobran ${fmt(dist.remaining, display)} para llegar a la meta.`
                : `Con ${fmt(Number(budget) || 0, display)} cubrís ${fmt((Number(budget) || 0) - dist.remaining, display)} de ${fmt(dist.totalNeeded, display)} de faltantes.`}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay faltantes: ya estás en la meta o con exceso.
          </p>
        )
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Ingresá cuánto tenés disponible y te ordenamos qué comprar primero según tu prioridad (se
          recalcula en vivo al comprar).
        </p>
      )}
    </section>
  )
}
