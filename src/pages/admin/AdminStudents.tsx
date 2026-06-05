import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate, studentDisplayName } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type StudentRow = Database['public']['Tables']['student_profiles']['Row'] & {
  universities: { name: string } | null
}

export default function AdminStudents() {
  const [searchParams] = useSearchParams()
  const highlightProfileId = searchParams.get('profile')?.trim() || null
  const highlightRef = useRef<HTMLTableRowElement | null>(null)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    if (!highlightProfileId || loading) return
    const t = window.setTimeout(() => highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100)
    return () => window.clearTimeout(t)
  }, [highlightProfileId, loading, rows])

  return (
    <div>
      <AdminPageHeader title="Students" subtitle="Registered student profiles." />

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading students…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="graduation-cap"
            title="No students yet"
            description="Student profiles appear here once they finish signup."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Name</th>
                <th className={adminThClass}>Email</th>
                <th className={adminThClass}>University</th>
                <th className={adminThClass}>Course</th>
                <th className={adminThClass}>Year</th>
                <th className={adminThClass}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                  <tr
                    key={row.id}
                    ref={highlightProfileId === row.id ? highlightRef : undefined}
                    className={
                      highlightProfileId === row.id ? 'bg-amber-50/80 outline outline-2 outline-amber-200 -outline-offset-2' : ''
                    }
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
                    <td className={adminTdClass}>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
