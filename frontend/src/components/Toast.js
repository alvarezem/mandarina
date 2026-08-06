import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

const STYLES = {
  success:
    'border-emerald-200 bg-slate-50/95 text-emerald-700 dark:border-emerald-900 dark:bg-slate-900/95 dark:text-emerald-300',
  error:
    'border-red-200 bg-slate-50/95 text-red-600 dark:border-red-900 dark:bg-slate-900/95 dark:text-red-400',
  info: 'border-teal-200 bg-slate-50/95 text-teal-700 dark:border-teal-900 dark:bg-slate-900/95 dark:text-teal-300',
}

function Icon({ type }) {
  const cls = 'h-5 w-5 shrink-0'
  if (type === 'success') {
    return (
      <svg className={`${cls} text-emerald-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg className={`${cls} text-red-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    )
  }
  return (
    <svg className={`${cls} text-teal-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timers = useRef([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ type = 'info', message }) => {
      const id = ++idRef.current
      setToasts((list) => [...list.slice(-2), { id, type, message }])
      timers.current.push(window.setTimeout(() => dismiss(id), 3200))
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-slide-in-right pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-md backdrop-blur ${STYLES[t.type]}`}
          >
            <Icon type={t.type} />
            <span className="text-sm font-medium leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
