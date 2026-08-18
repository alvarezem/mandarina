import { useState } from 'react'
import { fmt, fileOf, monthAbbr } from '../lib/format'
import Dropdown from './Dropdown'
import SortableTh from './SortableTh'
import Check, { itemBase, itemActive, itemInactive } from './Check'
import { useLang } from './LangProvider'
import { t, tn, categoryLabel } from '../lib/i18n'

const TABLE_PAGE = 100

function CategoryCell({ tx, options, onChange, onAddCustom }) {
  const { lang } = useLang()
  const [remember, setRemember] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const submitNew = (close) => {
    const name = newName.trim()
    if (!name) return
    onChange(tx, name, remember)
    onAddCustom(name)
    setNewName('')
    setShowNew(false)
    close()
  }

  return (
    <Dropdown
      label=""
      summary={categoryLabel(lang, tx.category) ?? t(lang, 'table.noCategory')}
      searchable
      searchPlaceholder={t(lang, 'table.searchCategory')}
      className="[&>button]:border-0 [&>button]:bg-transparent [&>button]:px-0 [&>button]:py-0.5 [&>button]:hover:bg-transparent dark:[&>button]:bg-transparent"
    >
      {({ close, query }) => (
        <>
          {options
            .filter((cat) => !query || cat.toLowerCase().includes(query))
            .map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange(tx, cat, remember)
                  close()
                }}
                className={`${itemBase} ${tx.category === cat ? itemActive : itemInactive}`}
              >
                <Check on={tx.category === cat} />
                {categoryLabel(lang, cat)}
              </button>
            ))}
          <div data-pinned className="my-1 border-t border-slate-100 dark:border-slate-800" />
          {showNew ? (
            <div data-pinned className="px-1 pb-1">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNew(close)
                }}
                placeholder={t(lang, 'table.categoryName')}
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            </div>
          ) : (
            <button
              data-pinned
              type="button"
              onClick={() => setShowNew(true)}
              className={`${itemBase} ${itemInactive}`}
            >
              {t(lang, 'table.newCategory')}
            </button>
          )}
          <label data-pinned className={`${itemBase} cursor-pointer`}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 shrink-0 accent-brand-600"
            />
            {t(lang, 'table.remember')}
          </label>
          <button
            data-pinned
            type="button"
            onClick={() => {
              onChange(tx, null, false)
              close()
            }}
            className={`${itemBase} ${tx.category == null ? itemActive : itemInactive}`}
          >
            <Check on={tx.category == null} />
            {t(lang, 'table.noCategory')}
          </button>
        </>
      )}
    </Dropdown>
  )
}

function SummaryMeta({ row, lang }) {
  const cs = row.card_summaries
  if (!cs) return null
  const m = Array.isArray(cs) ? cs[0] : cs
  if (!m) return null
  const parts = []
  if (m.summary_type) parts.push(m.summary_type)
  if (m.period_month) parts.push(`${monthAbbr(lang, m.period_month)} ${m.period_year}`)
  if (parts.length === 0) return null
  return (
    <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
      {parts.join(' · ')}
    </span>
  )
}

export default function TransactionsTable({
  summaryId,
  sort,
  onSort,
  sorted,
  filterKey,
  allCategoryOptions,
  changeCategory,
  addCustomCategory,
}) {
  const { lang } = useLang()
  const [pageSize, setPageSize] = useState(TABLE_PAGE)
  // Reset de la página cuando cambian los filtros: ajuste de estado durante el
  // render (patrón del repo, ver Dashboard.js prevRefs).
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setPageSize(TABLE_PAGE)
  }
  const visible = sorted.slice(0, pageSize)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <SortableTh label={t(lang, 'table.date')} sortKey="date" sort={sort} onSort={onSort} />
            <SortableTh
              label={t(lang, 'table.description')}
              sortKey="merchant"
              sort={sort}
              onSort={onSort}
            />
            {!summaryId && (
              <SortableTh
                label={t(lang, 'table.summary')}
                sortKey="summary"
                sort={sort}
                onSort={onSort}
              />
            )}
            <SortableTh
              label={t(lang, 'table.category')}
              sortKey="category"
              sort={sort}
              onSort={onSort}
            />
            <SortableTh
              label={t(lang, 'table.currency')}
              sortKey="currency"
              sort={sort}
              onSort={onSort}
            />
            <SortableTh
              label={t(lang, 'table.amount')}
              sortKey="amount"
              sort={sort}
              onSort={onSort}
              align="right"
            />
          </tr>
        </thead>
        <tbody
          key={filterKey}
          className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900"
        >
          {visible.map((t, i) => (
            <tr
              key={t.id}
              className="animate-fade-in transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              style={{ animationDelay: `${Math.min(i * 20, 500)}ms` }}
            >
              <td className="px-4 py-3 text-sm text-slate-600 tabular-nums dark:text-slate-400">
                {t.date}
              </td>
              <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{t.merchant}</td>
              {!summaryId && (
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex flex-col items-start gap-0.5">
                    <span>{fileOf(t) ?? '—'}</span>
                    <SummaryMeta row={t} lang={lang} />
                  </span>
                </td>
              )}
              <td className="px-4 py-3">
                <CategoryCell
                  tx={t}
                  options={allCategoryOptions}
                  onChange={changeCategory}
                  onAddCustom={addCustomCategory}
                />
              </td>
              <td className="px-4 py-3">
                {t.currency === 'USD' ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    USD
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    ARS
                  </span>
                )}
              </td>
              <td
                className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                  t.amount < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {fmt(t.amount, t.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > visible.length && (
        <div className="border-t border-slate-200 px-4 py-3 text-center dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPageSize((p) => p + TABLE_PAGE)}
            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {tn(lang, 'table.showMore', sorted.length - visible.length)}
          </button>
        </div>
      )}
    </div>
  )
}
