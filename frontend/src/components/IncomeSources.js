import { fmt } from '../lib/format'

export default function IncomeSources({ sources, onSelect }) {
  return (
    <div className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Acreditaciones por origen
        </h3>
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {sources.length} {sources.length === 1 ? 'origen' : 'orígenes'}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {sources.map((s) => (
          <li key={s.merchant}>
            <button
              type="button"
              onClick={() => onSelect?.(s.merchant)}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              title={`Ver transacciones de ${s.merchant}`}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {s.merchant}
                  </span>
                  {s.recurring && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Recurrente
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                  {s.category ?? 'Sin categoría'} · ×{s.count}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {fmt(s.total)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Clic en un origen filtra el detalle por ese comercio.
      </p>
    </div>
  )
}
