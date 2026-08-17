import { fmt, fmtPct } from '../lib/format'
import SortableTh from './SortableTh'
import AssetForm from './AssetForm'
import { useLang } from './LangProvider'
import { assetTypeLabel, t } from '../lib/i18n'

function progressWidth(item) {
  return item.target_weight > 0 ? Math.min(100, (item.actualPct / item.target_weight) * 100) : 0
}

export default function PlanTable({
  items,
  sort,
  onSort,
  editingId,
  draft,
  onDraftChange,
  onSave,
  onCancel,
  onEdit,
  onRemove,
  quotes,
  display,
}) {
  const { lang } = useLang()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <SortableTh
              label={t(lang, 'inv.table.activo')}
              sortKey="symbol"
              sort={sort}
              onSort={onSort}
            />
            <SortableTh
              label={t(lang, 'inv.table.precio')}
              sortKey="price"
              sort={sort}
              onSort={onSort}
              align="right"
              className="hidden sm:table-cell"
            />
            <SortableTh
              label={t(lang, 'inv.table.meta')}
              sortKey="target_weight"
              sort={sort}
              onSort={onSort}
              align="right"
            />
            <SortableTh
              label={t(lang, 'inv.table.actual')}
              sortKey="actualPct"
              sort={sort}
              onSort={onSort}
              align="right"
            />
            <SortableTh
              label={t(lang, 'inv.table.gap')}
              sortKey="gap"
              sort={sort}
              onSort={onSort}
              align="right"
            />
            <SortableTh
              label={t(lang, 'inv.table.cantidad')}
              sortKey="quantity"
              sort={sort}
              onSort={onSort}
              align="right"
              className="hidden sm:table-cell"
            />
            <SortableTh
              label={t(lang, 'inv.table.valor')}
              sortKey="value"
              sort={sort}
              onSort={onSort}
              align="right"
            />
            <SortableTh
              label={t(lang, 'inv.table.aComprar')}
              sortKey="buy"
              sort={sort}
              onSort={onSort}
              align="right"
            />
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) =>
            editingId === item.id ? (
              <tr key={item.id} className="bg-brand-50/50 dark:bg-brand-950/20">
                <td colSpan={9} className="px-4 py-3">
                  <AssetForm
                    draft={draft}
                    onChange={onDraftChange}
                    onSave={onSave}
                    onCancel={onCancel}
                  />
                </td>
              </tr>
            ) : (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {item.symbol}
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {assetTypeLabel(lang, item.asset_type)}
                    </span>
                  </div>
                  {item.name && item.name !== item.symbol && (
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {item.name}
                    </p>
                  )}
                  <div className="mt-1.5 h-1 w-full rounded bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-1 rounded bg-brand-500"
                      style={{ width: `${progressWidth(item)}%` }}
                    />
                  </div>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  {item.price != null ? (
                    <span>
                      {fmt(item.price, item.valueCurrency ?? display)}
                      {quotes[item.symbol]?.changePct != null && (
                        <span
                          className={`ml-1.5 text-xs ${
                            quotes[item.symbol].changePct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {quotes[item.symbol].changePct >= 0 ? '▲' : '▼'}
                          {Math.abs(quotes[item.symbol].changePct).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      {t(lang, 'inv.sinPrecio')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                  {fmtPct(item.target_weight, lang)}
                </td>
                <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                  {fmtPct(item.actualPct, lang)}
                </td>
                <td
                  className={`px-3 py-3 text-right ${
                    item.over
                      ? 'text-amber-600 dark:text-amber-400'
                      : item.gap > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.over
                    ? `${fmtPct(item.gap, lang)}`
                    : item.gap > 0
                      ? `+${fmtPct(item.gap, lang)}`
                      : '—'}
                </td>
                <td className="hidden px-3 py-3 text-slate-600 dark:text-slate-300 sm:table-cell">
                  {item.quantity}
                </td>
                <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-200">
                  {fmt(item.value, item.valueCurrency ?? display)}
                </td>
                <td className="px-3 py-3 text-right">
                  {item.buy > 0 ? (
                    <span className="font-medium text-brand-700 dark:text-brand-300">
                      ≈{item.buyQty} u
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label={t(lang, 'inv.table.editAria', { symbol: item.symbol })}
                      title={t(lang, 'inv.table.editTitle')}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label={t(lang, 'inv.table.removeAria', { symbol: item.symbol })}
                      title={t(lang, 'inv.table.removeTitle')}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ),
          )}
          {editingId === '__new__' && (
            <tr className="bg-brand-50/50 dark:bg-brand-950/20">
              <td colSpan={9} className="px-4 py-3">
                <AssetForm
                  draft={draft}
                  onChange={onDraftChange}
                  onSave={onSave}
                  onCancel={onCancel}
                  autoFocusSymbol
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
