import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../components/LangProvider'
import { t } from '../lib/i18n'

export function useAsync(fn, deps = []) {
  const { lang } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fn()
        if (active) setData(result)
      } catch (e) {
        if (active) setError(e?.message || t(lang, 'common.errorFallback'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, setData, loading, error, reload }
}
