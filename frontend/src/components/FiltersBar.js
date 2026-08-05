import Dropdown from './Dropdown'

const PERIODS = [
  { key: 'thisMonth', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'last3m', label: 'Últimos 3 meses' },
  { key: 'last12m', label: 'Últimos 12 meses' },
  { key: 'thisYear', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
  { key: 'custom', label: 'Personalizado' },
]

const CURRENCIES = [
  { key: 'all', label: 'Ambas' },
  { key: 'ARS', label: 'ARS' },
  { key: 'USD', label: 'USD' },
]

const itemBase =
  'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition'

const itemActive = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
const itemInactive = 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'

function Check({ on }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
        on
          ? 'border-teal-600 bg-teal-600 text-white'
          : 'border-slate-300 text-transparent dark:border-slate-600'
      }`}
    >
      ✓
    </span>
  )
}

export default function FiltersBar({
  period,
  onPeriod,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  categoryOptions,
  categories,
  onToggleCategory,
  onClearCategories,
  currency,
  onCurrency,
  query,
  onQuery,
}) {
  const periodSummary = PERIODS.find((p) => p.key === period)?.label ?? 'Todo'
  const categorySummary =
    categories.length === 0
      ? 'Todas'
      : categories.length === 1
        ? categories[0]
        : `${categories.length} seleccionadas`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown label="Período" summary={periodSummary}>
        {PERIODS.map((p) => (
          <button key={p.key} type="button" onClick={() => onPeriod(p.key)} className={`${itemBase} ${period === p.key ? itemActive : itemInactive}`}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 px-1 pt-2 dark:border-slate-800">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </Dropdown>

      <Dropdown label="Categorías" summary={categorySummary}>
        <div className="mb-1 flex items-center justify-between border-b border-slate-100 px-2 pb-1.5 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            {categories.length > 0 ? `${categories.length} seleccionadas` : 'Todas'}
          </span>
          {categories.length > 0 && (
            <button
              type="button"
              onClick={onClearCategories}
              className="text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              Limpiar
            </button>
          )}
        </div>
        {categoryOptions.length === 0 ? (
          <p className="px-3 py-1.5 text-xs text-slate-400">(sin categorías)</p>
        ) : (
          categoryOptions.map((cat) => {
            const on = categories.includes(cat)
            return (
              <button key={cat} type="button" onClick={() => onToggleCategory(cat)} className={`${itemBase} ${on ? itemActive : itemInactive}`}>
                <Check on={on} />
                {cat}
              </button>
            )
          })
        )}
      </Dropdown>

      <Dropdown label="Moneda" summary={CURRENCIES.find((c) => c.key === currency)?.label ?? 'Ambas'}>
        {CURRENCIES.map((c) => (
          <button key={c.key} type="button" onClick={() => onCurrency(c.key)} className={`${itemBase} ${currency === c.key ? itemActive : itemInactive}`}>
            <Check on={currency === c.key} />
            {c.label}
          </button>
        ))}
      </Dropdown>

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar comercio…"
          className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  )
}
