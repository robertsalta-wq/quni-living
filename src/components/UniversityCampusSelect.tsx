import { useEffect, useMemo, useState } from 'react'
import {
  AU_STATE_ORDER,
  fetchCampusesForUniversityId,
  groupUniversitiesByState,
  type CampusReferenceRow,
  type UniversityCampusReferenceScope,
} from '../lib/universityCampusReference'
import { useUniversityCampusReference } from '../hooks/useUniversityCampusReference'
import { isSupabaseConfigured } from '../lib/supabase'

export type UniversityCampusSelectProps = {
  universityId: string | null
  campusId: string | null
  onUniversityChange: (universityId: string) => void
  onCampusChange: (campusId: string) => void
  required?: boolean
  /** Group universities with <optgroup> by state */
  showState?: boolean
  disabled?: boolean
  /** Container (e.g. grid / flex) */
  className?: string
  universitySelectClassName: string
  campusSelectClassName: string
  labelClassName?: string
  /** When false, omit visible labels (parent should provide sr-only / aria). */
  showLabels?: boolean
  universityLabel?: string
  campusLabel?: string
  universityIdAttr?: string
  campusIdAttr?: string
  /** If set, overrides all campus first-option label logic below */
  campusPlaceholder?: string
  /** Campus dropdown empty value when no university is selected */
  campusPlaceholderNoUniversity?: string
  /** Campus dropdown empty value when a university is selected but no campus */
  campusPlaceholderWithUniversity?: string
  /** Extra classes on the university select wrapper (flex row variants) */
  universityCellClassName?: string
  /** Extra classes on the campus select wrapper (flex row variants) */
  campusCellClassName?: string
  /** stack: vertical; responsiveGrid: 2 cols sm+; flexRow: horizontal row sm+; flexRowLg: row lg+; pairRow: always side-by-side (hero row of two selects) */
  variant?: 'stack' | 'responsiveGrid' | 'flexRow' | 'flexRowLg' | 'pairRow'
  /**
   * `full`: all universities/campuses from reference data (e.g. home search).
   * `withListings`: only locations that currently have active listings (filters, landlord tools).
   */
  referenceScope?: UniversityCampusReferenceScope
}

export default function UniversityCampusSelect({
  universityId,
  campusId,
  onUniversityChange,
  onCampusChange,
  required = false,
  showState = false,
  disabled = false,
  className = '',
  universitySelectClassName,
  campusSelectClassName,
  labelClassName = 'block text-xs font-medium text-gray-700 mb-1.5',
  showLabels = true,
  universityLabel = 'University',
  campusLabel = 'Campus',
  universityIdAttr = 'uni-campus-uni',
  campusIdAttr = 'uni-campus-campus',
  campusPlaceholder,
  campusPlaceholderNoUniversity,
  campusPlaceholderWithUniversity,
  universityCellClassName,
  campusCellClassName,
  variant = 'stack',
  referenceScope = 'withListings',
}: UniversityCampusSelectProps) {
  const { universities, loading } = useUniversityCampusReference(referenceScope)
  const campusListingFilter = referenceScope === 'withListings'

  const uniKey = universityId?.trim() ?? ''
  const slugForUni = useMemo(
    () => universities.find((u) => u.id === uniKey)?.slug ?? null,
    [universities, uniKey],
  )
  const [campusRows, setCampusRows] = useState<CampusReferenceRow[]>([])
  const [loadingCampuses, setLoadingCampuses] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !uniKey) {
      setCampusRows([])
      setLoadingCampuses(false)
      return
    }
    let cancelled = false
    setLoadingCampuses(true)
    void fetchCampusesForUniversityId(uniKey, slugForUni, {
      onlyWithActiveListings: campusListingFilter,
    }).then((rows) => {
      if (!cancelled) {
        setCampusRows(rows)
        setLoadingCampuses(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [uniKey, slugForUni, campusListingFilter])

  const grouped = useMemo(() => {
    if (!showState) return null
    return groupUniversitiesByState(universities)
  }, [universities, showState])

  const noLocationsAvailable = !loading && universities.length === 0
  const universityDisabled = disabled || loading || noLocationsAvailable
  const campusDisabled = disabled || loading || !uniKey || loadingCampuses
  const campusHint = (() => {
    if (campusPlaceholder != null && campusPlaceholder !== '') return campusPlaceholder
    if (!uniKey) return campusPlaceholderNoUniversity ?? 'Select university first'
    if (loadingCampuses) return 'Loading campuses…'
    if (campusRows.length === 0) return 'No campuses available'
    return campusPlaceholderWithUniversity ?? 'Select campus'
  })()

  const rootClass =
    variant === 'responsiveGrid'
      ? `grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`.trim()
      : variant === 'flexRow'
        ? `flex flex-col sm:flex-row gap-3 flex-1 min-w-0 ${className}`.trim()
        : variant === 'flexRowLg'
          ? `flex flex-col lg:flex-row gap-3 flex-1 min-w-0 w-full ${className}`.trim()
          : variant === 'pairRow'
            ? `flex flex-row gap-3 w-full min-w-0 ${className}`.trim()
            : className
  const campusBlockMargin = showLabels && variant === 'stack' ? 'mt-3' : ''
  const defaultFlexCell =
    variant === 'flexRow' || variant === 'flexRowLg' || variant === 'pairRow'
      ? 'flex-1 min-w-0 w-full'
      : ''
  const uniCellClass =
    universityCellClassName != null && universityCellClassName !== ''
      ? universityCellClassName
      : defaultFlexCell
  const camCellClass =
    campusCellClassName != null && campusCellClassName !== ''
      ? campusCellClassName
      : defaultFlexCell

  return (
    <div className={rootClass}>
      <div className={uniCellClass}>
        {showLabels && (
          <label htmlFor={universityIdAttr} className={labelClassName}>
            {universityLabel}
            {required ? <span className="text-red-500"> *</span> : null}
          </label>
        )}
        <select
          id={universityIdAttr}
          value={uniKey}
          disabled={universityDisabled}
          required={required}
          onChange={(e) => onUniversityChange(e.target.value)}
          className={universitySelectClassName}
        >
          <option value="">
            {loading
              ? 'Loading…'
              : noLocationsAvailable
                ? 'No locations available yet'
                : required
                  ? 'Select university'
                  : 'All universities'}
          </option>
          {showState && grouped
            ? (() => {
                const orderSet = new Set<string>(AU_STATE_ORDER)
                const keys = [
                  ...AU_STATE_ORDER.filter((s) => grouped.has(s)),
                  ...[...grouped.keys()]
                    .filter((k) => !orderSet.has(k))
                    .sort((a, b) => a.localeCompare(b)),
                ]
                return keys.map((stateKey) => (
                  <optgroup key={stateKey} label={stateKey}>
                    {(grouped.get(stateKey) ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                ))
              })()
            : universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
        </select>
      </div>
      <div className={`${camCellClass} ${campusBlockMargin}`.trim()}>
        {showLabels && (
          <label htmlFor={campusIdAttr} className={labelClassName}>
            {campusLabel}
          </label>
        )}
        <select
          id={campusIdAttr}
          value={campusId?.trim() ?? ''}
          disabled={campusDisabled}
          onChange={(e) => onCampusChange(e.target.value)}
          className={campusSelectClassName}
          aria-disabled={campusDisabled}
        >
          <option value="">{campusHint}</option>
          {campusRows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.suburb?.trim() ? `${c.name} (${c.suburb})` : c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
