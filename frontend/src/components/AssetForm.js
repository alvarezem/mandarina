import { ASSET_TYPES } from '../lib/constants'
import { useLang } from './LangProvider'
import { assetTypeLabel, t } from '../lib/i18n'

const EDIT_FIELDS = [
  { key: 'symbol', label: 'inv.form.ticker', type: 'text' },
  { key: 'name', label: 'inv.form.name', type: 'text' },
  { key: 'target_weight', label: 'inv.form.targetWeight', type: 'number' },
  { key: 'quantity', label: 'inv.form.quantity', type: 'number' },
]

export default function AssetForm({ draft, onChange, onSave, onCancel, autoFocusSymbol = false }) {
  const { lang } = useLang()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-wrap items-end gap-2"
    >
      {EDIT_FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400"
        >
          {t(lang, f.label)}
          <input
            type={f.type}
            value={draft[f.key]}
            onChange={(e) => onChange(f.key, e.target.value)}
            min={f.type === 'number' ? 0 : undefined}
            step={f.key === 'target_weight' ? '0.5' : undefined}
            aria-label={t(lang, f.label)}
            autoFocus={autoFocusSymbol && f.key === 'symbol'}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      ))}
      <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        {t(lang, 'inv.form.type')}
        <select
          value={draft.asset_type}
          onChange={(e) => onChange('asset_type', e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {Object.keys(ASSET_TYPES).map((k) => (
            <option key={k} value={k}>
              {assetTypeLabel(lang, k)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        {t(lang, 'inv.form.currency')}
        <select
          value={draft.currency}
          onChange={(e) => onChange('currency', e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <div className="ml-auto flex gap-1.5">
        <button
          type="submit"
          aria-label={t(lang, 'inv.form.saveAria')}
          className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <svg
            className="h-5 w-5"
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
          onClick={onCancel}
          aria-label={t(lang, 'inv.form.cancelAria')}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </form>
  )
}
