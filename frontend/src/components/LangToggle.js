import { useLang } from './LangProvider'

export default function LangToggle() {
  const { lang, setLang } = useLang()
  const options = [
    { code: 'es', label: 'ES', aria: 'Español' },
    { code: 'en', label: 'EN', aria: 'English' },
  ]
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          aria-pressed={lang === o.code}
          aria-label={o.aria}
          title={o.aria}
          className={`flex h-9 w-10 items-center justify-center rounded-md text-sm font-semibold transition ${
            lang === o.code
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
