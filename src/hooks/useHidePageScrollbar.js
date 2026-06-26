import { useEffect } from 'react'

/** Hide the document scrollbar while keeping scroll (full-screen flows outside AppLayout). */
export function useHidePageScrollbar(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    document.documentElement.classList.add('hide-page-scrollbar')
    return () => document.documentElement.classList.remove('hide-page-scrollbar')
  }, [enabled])
}
