import { useLayoutEffect, useRef } from 'react'

/** Shrinks font size so single-line text fits its container (floor `min` px). */
export function useFitText(text: string, max = 15, min = 12) {
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      let size = max
      el.style.fontSize = `${size}px`
      el.style.whiteSpace = 'nowrap'
      while (el.scrollWidth > el.clientWidth && size > min) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, max, min])

  return ref
}
