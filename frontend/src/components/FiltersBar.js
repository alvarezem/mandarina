import Dropdown from './Dropdown'
import Check, { itemBase, itemActive, itemInactive } from './Check'
import { useLang } from './LangProvider'
import { t, tn, categoryLabel } from '../lib/i18n'

const PERIODS = [
  { key: 'thisMonth' },
  { key: 'lastMonth' },
  { key: 'last3m' },
  { key: 'last12m' },
  { key: 'thisYear' },
  { key: 'todo' },
  { key: 'custom' },
]

const CURRENCIES = [{ key: 'all' }, { key: 'ARS' }, { key: 'USD' }]

export default function FiltersBar({
  period,
  onPeriod,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  summaryOptions,
  summaryId,
  onSummarySelect,
  categoryOptions,
  categories,
  onToggleCategory,
  onClearCategories,
  currency,
  onCurrency,
  query,
  onQuery,
  hasActiveFilters,
  onClearFilters,
  hideSummary = false,
}) {
  const { lang } = useLang()
  const periodSummary = t(lang, `period.${period}`)
  const categorySummary =
    categories.length === 0
      ? t(lang, 'filters.all')
      : categories.length === 1
        ? categoryLabel(lang, categories[0])
        : tn(lang, 'filters.selected', categories.length)
  const currencySummary = currency === 'all' ? t(lang, 'filters.allCurrencies') : currency

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown label={t(lang, 'filters.period')} summary={periodSummary}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPeriod(p.key)}
            className={`${itemBase} ${period === p.key ? itemActive : itemInactive}`}
          >
            {t(lang, `period.${p.key}`)}
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

      {!hideSummary && (
        <Dropdown
          label={t(lang, 'filters.summary')}
          summary={
            summaryOptions.find((s) => s.id === summaryId)?.name ?? t(lang, 'filters.allSummaries')
          }
        >
          <button
            type="button"
            onClick={() => onSummarySelect(null)}
            className={`${itemBase} ${summaryId === null ? itemActive : itemInactive}`}
          >
            <Check on={summaryId === null} />
            {t(lang, 'filters.allSummaries')}
          </button>
          {summaryOptions.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-slate-400">{t(lang, 'filters.noSummaries')}</p>
          ) : (
            summaryOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSummarySelect(s.id)}
                className={`${itemBase} ${summaryId === s.id ? itemActive : itemInactive}`}
              >
                <Check on={summaryId === s.id} />
                {s.name}
              </button>
            ))
          )}
        </Dropdown>
      )}

      <Dropdown label={t(lang, 'filters.categories')} summary={categorySummary}>
        <div className="mb-1 flex items-center justify-between border-b border-slate-100 px-2 pb-1.5 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            {categories.length > 0
              ? tn(lang, 'filters.selected', categories.length)
              : t(lang, 'filters.all')}
          </span>
          {categories.length > 0 && (
            <button
              type="button"
              onClick={onClearCategories}
              className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t(lang, 'filters.clear')}
            </button>
          )}
        </div>
        {categoryOptions.length === 0 ? (
          <p className="px-3 py-1.5 text-xs text-slate-400">{t(lang, 'filters.noCategories')}</p>
        ) : (
          categoryOptions.map((cat) => {
            const on = categories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCategory(cat)}
                className={`${itemBase} ${on ? itemActive : itemInactive}`}
              >
                <Check on={on} />
                {categoryLabel(lang, cat)}
              </button>
            )
          })
        )}
      </Dropdown>

      <Dropdown label={t(lang, 'filters.currency')} summary={currencySummary}>
        {CURRENCIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onCurrency(c.key)}
            className={`${itemBase} ${currency === c.key ? itemActive : itemInactive}`}
          >
            <Check on={currency === c.key} />
            {c.key === 'all' ? t(lang, 'filters.allCurrencies') : c.key}
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t(lang, 'filters.search')}
          className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {t(lang, 'filters.clearFilters')}
        </button>
      )}
    </div>
  )
}
