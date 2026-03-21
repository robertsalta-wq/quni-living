import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import {
  adminTableWrapClass,
  adminTdClass,
  adminThClass,
  formatDate,
  formatMoney,
  studentDisplayName,
} from './adminUi'

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

type BookingRow = Database['public']['Tables']['bookings']['Row'] & {
  student_profiles: {
    full_name: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  properties: { title: string; suburb: string | null } | null
}

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed']

function statusBadgeClass(s: BookingStatus) {
  switch (s) {
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    case 'completed':
      return 'bg-indigo-100 text-indigo-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function AdminBookings() {
  const [rows, setRows] = useState<BookingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
          *,
          student_profiles ( full_name, first_name, last_name, email ),
          properties ( title, suburb )
        `,
      )
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as BookingRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: BookingStatus) {
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (upErr) {
      setError(upErr.message)
    } else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    }
    setUpdatingId(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bookings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">All booking requests and their status.</p>

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
                <th className={adminThClass}>Student</th>
                <th className={adminThClass}>Property</th>
                <th className={adminThClass}>Stay</th>
                <th className={adminThClass}>Weekly rent</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const sp = row.student_profiles
                  const studentName = sp ? studentDisplayName(sp) : '—'
                  const studentEmail = sp?.email?.trim() || '—'
                  const prop = row.properties
                  const propLine = prop ? (
                    <>
                      {prop.title}
                      {prop.suburb ? (
                        <span className="block text-xs text-gray-500">{prop.suburb}</span>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )
                  return (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <span className="font-medium text-gray-900">{studentName}</span>
                        <span className="block text-xs text-gray-500">{studentEmail}</span>
                      </td>
                      <td className={adminTdClass}>{propLine}</td>
                      <td className={adminTdClass}>
                        {formatDate(row.start_date)}
                        <span className="text-gray-400 mx-1">→</span>
                        {formatDate(row.end_date)}
                      </td>
                      <td className={adminTdClass}>{formatMoney(row.weekly_rent)}</td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className={adminTdClass}>
                        <select
                          aria-label="Change booking status"
                          disabled={updatingId === row.id}
                          value={row.status}
                          onChange={(e) => void setStatus(row.id, e.target.value as BookingStatus)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
