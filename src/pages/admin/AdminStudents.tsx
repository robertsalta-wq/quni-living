import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { logProfileView } from '../../lib/profileAccessLog'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { AdminStudentVerificationDrawer } from '../../components/admin/AdminStudentVerificationDrawer'
import { DetailDrawer } from '../../components/admin/patterns'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate, studentDisplayName } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type StudentRow = Database['public']['Tables']['student_profiles']['Row'] & {
  universities: { name: string } | null
}

type RouteFilter = 'all' | 'student' | 'non_student'

function filterButtonClass(active: boolean): string {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active ? 'bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ].join(' ')
}

/** Intent axis: chosen onboarding route (null = not yet chosen). */
function routeIntentLabel(route: StudentRow['accommodation_verification_route']): string {
  if (route === 'student') return 'Student'
  if (isNonStudentAccommodationRoute(route)) return 'Non-student'
  return 'Route not chosen'
}

/** Proof axis: verification tier once fully complete (`none` = unverified). */
function verificationProofLabel(verificationType: StudentRow['verification_type']): string {
  if (verificationType === 'student') return 'Verified (student)'
  if (verificationType === 'identity') return 'Verified (identity)'
  return 'Unverified'
}

function proofStatusClass(verificationType: StudentRow['verification_type']): string {
  if (verificationType === 'none') return 'text-amber-800'
  return 'text-emerald-800'
}

function matchesRouteFilter(row: StudentRow, filter: RouteFilter): boolean {
  if (filter === 'all') return true
  const route = row.accommodation_verification_route
  if (filter === 'student') return route === 'student'
  if (filter === 'non_student') return isNonStudentAccommodationRoute(route)
  return true
}

function countByFilter(rows: StudentRow[], filter: RouteFilter): number {
  return rows.filter((row) => matchesRouteFilter(row, filter)).length
}

export default function AdminStudents() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProfileId = searchParams.get('profile')?.trim() || null
  const highlightRef = useRef<HTMLTableRowElement | null>(null)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')

  const setProfileParam = useCallback(
    (profileId: string | null) => {
      const next = new URLSearchParams(searchParams)
      if (profileId) next.set('profile', profileId)
      else next.delete('profile')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('student_profiles')
      .select(
        `
          *,
          universities ( name )
        `,
      )
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as StudentRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedProfileId || loading) return
    const t = window.setTimeout(() => highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100)
    return () => window.clearTimeout(t)
  }, [selectedProfileId, loading, rows])

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesRouteFilter(row, routeFilter)),
    [rows, routeFilter],
  )

  const selected = useMemo(() => {
    if (!selectedProfileId) return null
    return rows.find((row) => row.id === selectedProfileId) ?? null
  }, [selectedProfileId, rows])

  const handleProfileUpdated = useCallback(
    (profile: Database['public']['Tables']['student_profiles']['Row']) => {
      setRows((prev) =>
        prev.map((row) => (row.id === profile.id ? { ...row, ...profile } : row)),
      )
    },
    [],
  )

  useEffect(() => {
    const profileId = selected?.id
    if (!profileId) return
    void logProfileView(profileId)
  }, [selected?.id])

  const unchosenRouteCount = useMemo(
    () => rows.filter((row) => row.accommodation_verification_route == null).length,
    [rows],
  )

  const emptyDescription =
    rows.length === 0
      ? 'Renter profiles appear here once someone finishes signup.'
      : routeFilter === 'all'
        ? 'No profiles match this view.'
        : routeFilter === 'student'
          ? 'No profiles on the student route. Profiles without a chosen route appear under All only.'
          : 'No profiles on the non-student route. Profiles without a chosen route appear under All only.'

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <AdminPageHeader
          title="Renter profiles"
          subtitle="Students and non-students who signed up to rent. Click a row to view the full profile."
        />

        {error && (
          <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
            {error}
          </div>
        )}

        {!loading && rows.length > 0 ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={filterButtonClass(routeFilter === 'all')}
                onClick={() => setRouteFilter('all')}
              >
                All ({countByFilter(rows, 'all')})
              </button>
              <button
                type="button"
                className={filterButtonClass(routeFilter === 'student')}
                onClick={() => setRouteFilter('student')}
              >
                Students ({countByFilter(rows, 'student')})
              </button>
              <button
                type="button"
                className={filterButtonClass(routeFilter === 'non_student')}
                onClick={() => setRouteFilter('non_student')}
              >
                Non-students ({countByFilter(rows, 'non_student')})
              </button>
            </div>
            {unchosenRouteCount > 0 ? (
              <p className="mb-4 text-[13px] text-admin-ink-5">
                {unchosenRouteCount} profile{unchosenRouteCount === 1 ? '' : 's'} ha
                {unchosenRouteCount === 1 ? 's' : 've'} not chosen a route yet — visible under All only.
              </p>
            ) : null}
          </>
        ) : null}

        <div className={adminTableWrapClass}>
          {loading ? (
            <LoadingState label="Loading renter profiles…" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="graduation-cap"
              title="No renter profiles yet"
              description="Renter profiles appear here once someone finishes signup."
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState icon="graduation-cap" title="No matching profiles" description={emptyDescription} />
          ) : (
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className={adminThClass}>Name</th>
                  <th className={adminThClass}>Email</th>
                  <th className={adminThClass}>University</th>
                  <th className={adminThClass}>Course</th>
                  <th className={adminThClass}>Year</th>
                  <th className={adminThClass}>Route &amp; verification</th>
                  <th className={adminThClass}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isSelected = selected?.id === row.id
                  return (
                    <tr
                      key={row.id}
                      ref={selectedProfileId === row.id ? highlightRef : undefined}
                      onClick={() => setProfileParam(row.id)}
                      className={[
                        'cursor-pointer transition-colors hover:bg-admin-surface-2',
                        isSelected ? 'bg-indigo-50/80' : '',
                        selectedProfileId === row.id && !isSelected
                          ? 'bg-amber-50/80 outline outline-2 outline-amber-200 -outline-offset-2'
                          : '',
                      ].join(' ')}
                    >
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">{studentDisplayName(row)}</span>
                      </td>
                      <td className={adminTdClass}>{row.email?.trim() || '-'}</td>
                      <td className={adminTdClass}>{row.universities?.name ?? '-'}</td>
                      <td className={adminTdClass}>{row.course?.trim() || '-'}</td>
                      <td className={adminTdClass}>
                        {row.year_of_study != null ? String(row.year_of_study) : '-'}
                      </td>
                      <td className={adminTdClass}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900">
                            {routeIntentLabel(row.accommodation_verification_route)}
                          </span>
                          <span className={`text-[12px] ${proofStatusClass(row.verification_type)}`}>
                            {verificationProofLabel(row.verification_type)}
                          </span>
                        </div>
                      </td>
                      <td className={adminTdClass}>{formatDate(row.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <DetailDrawer
        open={!!selected}
        onClose={() => setProfileParam(null)}
        eyebrow={`Profile · ${selected?.id.slice(0, 8) ?? ''}`}
        title={selected ? studentDisplayName(selected) : ''}
        status={
          selected ? (
            <span className={`text-[13px] ${proofStatusClass(selected.verification_type)}`}>
              {verificationProofLabel(selected.verification_type)}
            </span>
          ) : null
        }
      >
        {selected ? (
          <AdminStudentVerificationDrawer row={selected} onProfileUpdated={handleProfileUpdated} />
        ) : null}
      </DetailDrawer>
    </div>
  )
}
