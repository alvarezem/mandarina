import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Dropdown({ label, summary, children, align = 'left', className = '', closeOnSelect = false }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      const button = buttonRef.current
      const menu = menuRef.current
      if ((button && button.contains(e.target)) || (menu && menu.contains(e.target))) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScrollOrResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  const toggle = () => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen((o) => !o)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          open
            ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        {label}
        <span className={open ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400'}>
          {summary}
        </span>
        <svg
          className={`h-3 w-3 transition ${open ? 'rotate-180 text-brand-600 dark:text-brand-300' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            onClick={closeOnSelect ? () => setOpen(false) : undefined}
            className="animate-pop fixed z-50 max-h-[60vh] min-w-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-md dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: rect.bottom + 8,
              left: align === 'right' ? 'auto' : rect.left,
              right: align === 'right' ? window.innerWidth - rect.right : 'auto',
              width: 'max-content',
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  )
}
