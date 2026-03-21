import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const KEYS = ['q', 'uni', 'type', 'price', 'furnished', 'sort'] as const

/**
 * Listings URL contract (shareable):
 * `q`, `uni`, `type`, `price`, `furnished`, `sort`
 */
export function useListingsFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const qFromUrl = searchParams.get('q') ?? ''
  const [qInput, setQInput] = useState(qFromUrl)

  const university = searchParams.get('uni') ?? ''
  const roomType = searchParams.get('type') ?? ''
  const priceFilter = searchParams.get('price') ?? ''
  const furnished = searchParams.get('furnished') === 'true'
  const sort = searchParams.get('sort') ?? 'newest'

  useEffect(() => {
    setQInput(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = qInput.trim()
      setSearchParams(
        (prev) => {
          const cur = prev.get('q') ?? ''
          if (trimmed === cur) return prev
          const next = new URLSearchParams(prev)
          if (trimmed) next.set('q', trimmed)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 350)
    return () => window.clearTimeout(t)
  }, [qInput, setSearchParams])

  const patch = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === undefined || v === '') next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setUniversity = useCallback((v: string) => patch({ uni: v || null }), [patch])
  const setRoomType = useCallback((v: string) => patch({ type: v || null }), [patch])
  const setPriceFilter = useCallback((v: string) => patch({ price: v || null }), [patch])
  const setFurnished = useCallback(
    (v: boolean) => patch({ furnished: v ? 'true' : null }),
    [patch],
  )
  const setSort = useCallback(
    (v: string) => patch({ sort: v === 'newest' ? null : v }),
    [patch],
  )

  const clearAll = useCallback(() => {
    setQInput('')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const k of KEYS) next.delete(k)
      return next
    }, { replace: true })
  }, [setSearchParams])

  /** Filters that users typically “clear” (sort is separate UX, like your original) */
  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(qFromUrl) ||
      Boolean(university) ||
      Boolean(roomType) ||
      Boolean(priceFilter) ||
      furnished
    )
  }, [qFromUrl, university, roomType, priceFilter, furnished])

  const querySignature = useMemo(() => searchParams.toString(), [searchParams])

  return {
    qInput,
    setQInput,
    qApplied: qFromUrl,
    university,
    setUniversity,
    roomType,
    setRoomType,
    priceFilter,
    setPriceFilter,
    furnished,
    setFurnished,
    sort,
    setSort,
    clearAll,
    hasActiveFilters,
    querySignature,
  }
}
