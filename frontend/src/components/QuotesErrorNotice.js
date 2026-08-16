import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

export default function QuotesErrorNotice() {
  const { lang } = useLang()
  return (
    <span
      data-testid="quotes-error-notice"
      title={t(lang, 'inv.errNotice.title')}
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z"
        />
      </svg>
      {t(lang, 'inv.errNotice.text')}
    </span>
  )
}
