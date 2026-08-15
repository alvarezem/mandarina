import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function textOf(node) {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf(node.props.children)
  return ''
}

export default function Dropdown({
  label,
  summary,
  children,
  align = 'left',
  className = '',
  closeOnSelect = false,
  searchable = false,
  searchPlaceholder = 'Buscar categoría…',
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [query, setQuery] = useState('')
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef(null)

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
    const onScroll = (e) => {
      const menu = menuRef.current
      if (menu && menu.contains(e.target)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  useLayoutEffect(() => {
    if (open && searchable && searchRef.current) searchRef.current.focus()
  }, [open, searchable])

  const toggle = () => {
    setQuery('')
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
    setOpen((o) => !o)
  }

  const q = query.trim().toLowerCase()
  const isRenderProp = typeof children === 'function'
  const filteredChildren =
    !isRenderProp && q
      ? Children.toArray(children).filter((child) => {
          if (!isValidElement(child)) return true
          if (child.props['data-pinned']) return true
          return textOf(child).toLowerCase().includes(q)
        })
      : children

  const spaceBelow = rect ? window.innerHeight - rect.bottom - 8 : 0
  const spaceAbove = rect ? rect.top - 8 : 0
  const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
  const maxHeight = openUp ? spaceAbove : spaceBelow

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
            className="dropdown-scroll animate-pop fixed z-50 min-w-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-md dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: openUp ? 'auto' : rect.bottom + 8,
              bottom: openUp ? window.innerHeight - rect.top + 8 : 'auto',
              left: align === 'right' ? 'auto' : rect.left,
              right: align === 'right' ? window.innerWidth - rect.right : 'auto',
              width: 'max-content',
              maxHeight,
            }}
          >
            {searchable && (
              <div className="relative mb-1.5">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </div>
            )}
            {isRenderProp ? children({ close: () => setOpen(false), query: q }) : filteredChildren}
          </div>,
          document.body,
        )}
    </div>
  )
}
