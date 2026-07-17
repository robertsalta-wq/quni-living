import { useEffect, useState, type RefObject } from 'react'

/** Fires once when `ref` enters the viewport; then disconnects. */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  options?: IntersectionObserverInit,
): boolean {
  const [inView, setInView] = useState(false)
  const rootMargin = options?.rootMargin ?? '0px 0px -12% 0px'
  const threshold = options?.threshold ?? 0.2

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setInView(true)
        observer.disconnect()
      },
      { rootMargin, threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, inView, rootMargin, threshold])

  return inView
}
