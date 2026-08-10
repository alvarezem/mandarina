export const itemBase =
  'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition'
export const itemActive = 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
export const itemInactive = 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'

export default function Check({ on }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
        on
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-slate-300 text-transparent dark:border-slate-600'
      }`}
    >
      ✓
    </span>
  )
}
