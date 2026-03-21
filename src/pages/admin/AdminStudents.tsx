import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate, studentDisplayName } from './adminUi'

type StudentRow = Database['public']['Tables']['student_profiles']['Row'] & {
  universities: { name: string } | null
}

export default function AdminStudents() {
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Students</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Registered student profiles.</p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    No students yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className={adminTdClass}>
                      <span className="font-medium text-gray-900">{studentDisplayName(row)}</span>
                    </td>
                    <td className={adminTdClass}>{row.email?.trim() || '—'}</td>
                    <td className={adminTdClass}>{row.universities?.name ?? '—'}</td>
                    <td className={adminTdClass}>{row.course?.trim() || '—'}</td>
                    <td className={adminTdClass}>
                      {row.year_of_study != null ? String(row.year_of_study) : '—'}
                    </td>
                    <td className={adminTdClass}>{formatDate(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
