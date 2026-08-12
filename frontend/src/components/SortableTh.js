export default function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
}) {
  const active = sort.key === sortKey
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition active:scale-[0.98] ${
          active
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        {label}
        {active && <span className="text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}
