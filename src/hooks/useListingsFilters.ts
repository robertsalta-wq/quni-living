import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  effectiveMoveOutForAvailability,
  isIsoDateString,
} from '../lib/listingAvailabilityDates'
import { campusUrlSlug } from '../lib/slug'
import { resolveUniversitySlugParam } from '../lib/universitySlugAliases'

const KEYS = [
  'q',
  'uni',
  'university_id',
  'campus',
  'campus_id',
  'suburb',
  'state',
  'type',
  'price',
  'furnished',
  'sort',
  'move_in',
  'move_out',
  'lease',
] as const

type UniversityRef = { id: string; slug: string; name: string }
type CampusRef = { id: string; name: string; university_id: string | null; slug?: string | null }

type UseListingsFiltersOptions = {
  universities?: UniversityRef[]
  campuses?: CampusRef[]
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Listings URL contract (shareable):
 * `q`, `uni` (or `university_id`), `campus` (or `campus_id`), `suburb`, `type`, `price`, `furnished`, `sort`
 */
export function useListingsFilters(options: UseListingsFiltersOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const universities = options.universities ?? []
  const campuses = options.campuses ?? []

  const uniIdBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of universities) map.set((u.slug ?? '').toLowerCase(), u.id)
    return map
  }, [universities])

  const uniSlugById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of universities) map.set(u.id, (u.slug ?? '').toLowerCase())
    return map
  }, [universities])

  const qFromUrl = searchParams.get('q') ?? ''
  const [qInput, setQInput] = useState(qFromUrl)

  const universityRaw = searchParams.get('uni') ?? searchParams.get('university_id') ?? ''
  const university = useMemo(() => {
    const val = universityRaw.trim()
    if (!val) return ''
    if (looksLikeUuid(val)) return val
    const lower = val.toLowerCase()
    const canonicalSlug = resolveUniversitySlugParam(lower)
    return uniIdBySlug.get(canonicalSlug) ?? uniIdBySlug.get(lower) ?? ''
  }, [uniIdBySlug, universityRaw])

  const campusRaw = searchParams.get('campus') ?? searchParams.get('campus_id') ?? ''
  const campus = useMemo(() => {
    const val = campusRaw.trim()
    if (!val) return ''
    if (looksLikeUuid(val)) return val
    const campusSlug = val.toLowerCase()
    const forUni = campuses.find((c) => {
      if (!c.university_id || c.university_id !== university) return false
      return campusUrlSlug(c).toLowerCase() === campusSlug
    })
    return forUni?.id ?? ''
  }, [campusRaw, campuses, university])

  const suburb = searchParams.get('suburb') ?? ''

  const state = (searchParams.get('state') ?? '').trim().toUpperCase()

  const roomType = searchParams.get('type') ?? ''
  const priceFilter = searchParams.get('price') ?? ''
  const furnished = searchParams.get('furnished') === 'true'
  const sort = searchParams.get('sort') ?? 'newest'

  const moveInRaw = searchParams.get('move_in')?.trim() ?? ''
  const moveIn = isIsoDateString(moveInRaw) ? moveInRaw : ''
  const moveOutRaw = searchParams.get('move_out')?.trim() ?? ''
  const moveOut = isIsoDateString(moveOutRaw) ? moveOutRaw : ''
  const lease = searchParams.get('lease')?.trim() ?? ''

  const effectiveAvailabilityMoveOut = useMemo(
    () => effectiveMoveOutForAvailability(moveIn || null, moveOut || null, lease || null),
    [moveIn, moveOut, lease],
  )

  useEffect(() => {
    setQInput(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    const uniRaw = universityRaw.trim()
    const campusParam = campusRaw.trim()
    const uniSlug = university ? uniSlugById.get(university) : null
    const campusSlug = campus
      ? (() => {
          const row = campuses.find((c) => c.id === campus)
          return row ? campusUrlSlug(row) : null
        })()
      : null

    const shouldFixUni = Boolean(uniRaw && looksLikeUuid(uniRaw) && uniSlug)
    const shouldFixCampus = Boolean(campusParam && looksLikeUuid(campusParam) && campusSlug)
    if (!shouldFixUni && !shouldFixCampus) return

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (shouldFixUni && uniSlug) {
          next.set('uni', uniSlug)
          next.delete('university_id')
        }
        if (shouldFixCampus && campusSlug) {
          next.set('campus', campusSlug)
          next.delete('campus_id')
        }
        return next
      },
      { replace: true },
    )
  }, [campus, campusRaw, campuses, setSearchParams, uniSlugById, university, universityRaw])

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

  const setUniversity = useCallback(
    (v: string) => {
      const uniSlug = uniSlugById.get(v) ?? null
      patch({
        uni: uniSlug,
        university_id: null,
        campus: null,
        campus_id: null,
      })
    },
    [patch, uniSlugById],
  )
  const setCampus = useCallback(
    (v: string) => {
      const selected = campuses.find((c) => c.id === v)
      patch({ campus: selected ? campusUrlSlug(selected) : null, campus_id: null })
    },
    [campuses, patch],
  )
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

  const setMoveIn = useCallback(
    (v: string) => {
      const t = v.trim()
      patch({ move_in: t && isIsoDateString(t) ? t : null })
    },
    [patch],
  )

  const setMoveOut = useCallback(
    (v: string) => {
      const t = v.trim()
      patch({
        move_out: t && isIsoDateString(t) ? t : null,
        lease: null,
      })
    },
    [patch],
  )

  const setLease = useCallback(
    (v: string) => {
      const t = v.trim()
      patch({
        lease: t || null,
        move_out: null,
      })
    },
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
      Boolean(campus) ||
      Boolean(suburb.trim()) ||
      Boolean(state) ||
      Boolean(roomType) ||
      Boolean(priceFilter) ||
      furnished ||
      Boolean(moveIn) ||
      Boolean(moveOut) ||
      Boolean(lease)
    )
  }, [qFromUrl, university, campus, suburb, state, roomType, priceFilter, furnished, moveIn, moveOut, lease])

  const querySignature = useMemo(() => searchParams.toString(), [searchParams])

  return {
    qInput,
    setQInput,
    qApplied: qFromUrl,
    university,
    setUniversity,
    campus,
    setCampus,
    suburb,
    state,
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
    moveIn,
    moveOut,
    lease,
    effectiveAvailabilityMoveOut,
    setMoveIn,
    setMoveOut,
    setLease,
  }
}
