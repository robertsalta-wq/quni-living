import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function landlordDisplayName(row: LandlordRow) {
  const fn = row.first_name?.trim() ?? ''
  const ln = row.last_name?.trim() ?? ''
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  if (row.full_name?.trim()) return row.full_name.trim()
  if (row.company_name?.trim()) return row.company_name.trim()
  return '—'
}

export default function AdminLandlords() {
  const [searchParams] = useSearchParams()
  const highlightProfileId = searchParams.get('profile')?.trim() || null
  const highlightRef = useRef<HTMLTableRowElement | null>(null)
  const [rows, setRows] = useState<LandlordRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('landlord_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as LandlordRow[])
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

  async function setVerified(id: string, verified: boolean) {
    const prev = rows.find((r) => r.id === id)?.verified ?? false
    setRows((r) => r.map((row) => (row.id === id ? { ...row, verified } : row)))
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await supabase.from('landlord_profiles').update({ verified }).eq('id', id)
    if (upErr) {
      setError(upErr.message)
      setRows((r) => r.map((row) => (row.id === id ? { ...row, verified: prev } : row)))
    }
    setUpdatingId(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Landlords</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Landlord accounts and verification.</p>

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
                <th className={adminThClass}>Phone</th>
                <th className={adminThClass}>Verified</th>
                <th className={adminThClass}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    No landlords yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    ref={highlightProfileId === row.id ? highlightRef : undefined}
                    className={
                      highlightProfileId === row.id ? 'bg-amber-50/80 outline outline-2 outline-amber-200 -outline-offset-2' : ''
                    }
                  >
                    <td className={adminTdClass}>
                      <span className="font-medium text-gray-900">{landlordDisplayName(row)}</span>
                    </td>
                    <td className={adminTdClass}>{row.email?.trim() || '—'}</td>
                    <td className={adminTdClass}>{row.phone?.trim() || '—'}</td>
                    <td className={adminTdClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.verified ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                            Unverified
                          </span>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={Boolean(row.verified)}
                            disabled={updatingId === row.id}
                            onChange={(e) => void setVerified(row.id, e.target.checked)}
                          />
                          <span className="text-xs text-gray-500">Toggle</span>
                        </label>
                      </div>
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
