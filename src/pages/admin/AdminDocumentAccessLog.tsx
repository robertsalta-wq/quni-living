import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { verificationDocumentTypeLabel, type VerificationDocumentType } from '../../lib/documentAccessLog'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate, studentDisplayName } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type AccessLogRow = Database['public']['Tables']['document_access_log']['Row']

type StudentProfileSlice = Pick<
  Database['public']['Tables']['student_profiles']['Row'],
  'id' | 'preferred_name' | 'full_name' | 'first_name' | 'last_name' | 'email'
>

type DisplayRow = AccessLogRow & {
  studentProfile: StudentProfileSlice | null
}

const ROW_LIMIT = 500

export default function AdminDocumentAccessLog() {
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)

    const { data: logRows, error: logError } = await supabase
      .from('document_access_log')
      .select('*')
      .order('viewed_at', { ascending: false })
      .limit(ROW_LIMIT)

    if (logError) {
      setError(logError.message)
      setRows([])
      setLoading(false)
      return
    }

    const logs = (logRows ?? []) as AccessLogRow[]
    const profileIds = [...new Set(logs.map((row) => row.student_profile_id))]

    let profileMap = new Map<string, StudentProfileSlice>()
    if (profileIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('student_profiles')
        .select('id, preferred_name, full_name, first_name, last_name, email')
        .in('id', profileIds)

      if (profileError) {
        setError(profileError.message)
        setRows([])
        setLoading(false)
        return
      }

      profileMap = new Map(
        ((profiles ?? []) as StudentProfileSlice[]).map((profile) => [profile.id, profile]),
      )
    }

    setRows(
      logs.map((row) => ({
        ...row,
        studentProfile: profileMap.get(row.student_profile_id) ?? null,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const truncated = useMemo(() => rows.length >= ROW_LIMIT, [rows.length])

  return (
    <div>
      <AdminPageHeader
        title="Document access log"
        subtitle="Audit trail when platform admins open renter verification documents from Renters. Most recent first."
      />

      {truncated ? (
        <p className="mb-4 text-[13px] text-admin-ink-5">
          Showing the latest {ROW_LIMIT} events. Older entries are not shown in this view.
        </p>
      ) : null}

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading access log…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No document access events yet"
            description="When an admin opens a verification document from Renters, an entry appears here."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>When</th>
                <th className={adminThClass}>Admin</th>
                <th className={adminThClass}>Renter</th>
                <th className={adminThClass}>Document</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={adminTdClass}>{formatDate(row.viewed_at)}</td>
                  <td className={adminTdClass}>{row.admin_email}</td>
                  <td className={adminTdClass}>
                    {row.studentProfile ? (
                      <div className="flex flex-col gap-0.5">
                        <Link
                          to={`/admin/students?profile=${row.student_profile_id}`}
                          className="font-medium text-indigo-800 hover:text-indigo-950 hover:underline"
                        >
                          {studentDisplayName(row.studentProfile)}
                        </Link>
                        {row.studentProfile.email?.trim() ? (
                          <span className="text-[12px] text-admin-ink-5">{row.studentProfile.email.trim()}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-admin-ink-5">
                        Profile {row.student_profile_id.slice(0, 8)}… (deleted or missing)
                      </span>
                    )}
                  </td>
                  <td className={adminTdClass}>
                    {verificationDocumentTypeLabel(row.document_type as VerificationDocumentType)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
