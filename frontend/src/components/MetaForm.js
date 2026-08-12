import { MONTHS } from '../lib/constants'

const TYPES = ['VISA', 'MASTERCARD', 'AMEX', 'Banco', 'Billetera virtual', 'Broker', 'Otro']

const NOW_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 8 }, (_, i) => NOW_YEAR - 6 + i)

export default function MetaForm({ draft, onChange, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-center gap-1.5">
      <select
        value={draft.type}
        onChange={(e) => onChange({ type: e.target.value })}
        aria-label="Tipo de resumen"
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="">Tipo…</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={draft.month}
        onChange={(e) => onChange({ month: Number(e.target.value) })}
        aria-label="Mes del período"
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={draft.year}
        onChange={(e) => onChange({ year: Number(e.target.value) })}
        aria-label="Año del período"
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="submit"
        aria-label="Guardar clasificación"
        className="shrink-0 rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
        aria-label="Cancelar clasificación"
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </form>
  )
}
