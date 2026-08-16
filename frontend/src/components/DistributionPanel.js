import { fmt } from '../lib/format'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

const STRATEGY_OPTIONS = ['faltante', 'gap', 'billetera', 'peso', 'barato', 'caro']

export default function DistributionPanel({
  budget,
  onBudget,
  strategy,
  onStrategy,
  dist,
  display,
  onBuy,
}) {
  const { lang } = useLang()
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t(lang, 'inv.dist.title')}
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {t(lang, 'inv.dist.priorityBy')}
          <select
            value={strategy}
            onChange={(e) => onStrategy(e.target.value)}
            aria-label={t(lang, 'inv.dist.priorityAria')}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {STRATEGY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {t(lang, `inv.dist.strategy.${key}`)}
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
            aria-label={t(lang, 'inv.dist.budgetAria')}
            min={0}
            className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400">{display}</span>
        </label>
      </div>

      {Number(budget) > 0 ? (
        <>
          {dist.steps.length > 0 ? (
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
                      <span className="ml-2 text-xs text-slate-400">
                        {t(lang, 'inv.dist.units', { qty: step.qty })}
                      </span>
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
                        {t(lang, 'inv.dist.buy')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {dist.covered
                  ? t(lang, 'inv.dist.covered', { amount: fmt(dist.remaining, display) })
                  : t(lang, 'inv.dist.partial', {
                      budget: fmt(Number(budget) || 0, display),
                      covered: fmt((Number(budget) || 0) - dist.remaining, display),
                      needed: fmt(dist.totalNeeded, display),
                    })}
              </p>
            </>
          ) : (
            dist.skipped?.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(lang, 'inv.dist.noShortfall')}
              </p>
            )
          )}
          {dist.skipped?.length > 0 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t(lang, 'inv.dist.skipped', {
                symbols: dist.skipped.map((s) => s.symbol).join(', '),
              })}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">{t(lang, 'inv.dist.hint')}</p>
      )}
    </section>
  )
}
