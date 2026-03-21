import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { ROOM_TYPE_LABELS, type RoomType } from '../../lib/listings'
import { adminTableWrapClass, adminTdClass, adminThClass, formatMoney } from './adminUi'

type PropertyStatus = Database['public']['Tables']['properties']['Row']['status']

type PropertyRow = Database['public']['Tables']['properties']['Row']

function statusBadgeClass(s: PropertyStatus) {
  switch (s) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function roomLabel(rt: string | null) {
  if (!rt) return '—'
  return ROOM_TYPE_LABELS[rt as RoomType] ?? rt
}

export default function AdminProperties() {
  const [rows, setRows] = useState<PropertyRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as PropertyRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setFeatured(id: string, featured: boolean) {
    const prev = rows.find((r) => r.id === id)?.featured ?? false
    setRows((r) => r.map((row) => (row.id === id ? { ...row, featured } : row)))
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await supabase.from('properties').update({ featured }).eq('id', id)
    if (upErr) {
      setError(upErr.message)
      setRows((r) => r.map((row) => (row.id === id ? { ...row, featured: prev } : row)))
    }
    setUpdatingId(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Properties</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">All listings across every status.</p>

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
                <th className={adminThClass}>Listing</th>
                <th className={adminThClass}>Price / week</th>
                <th className={adminThClass}>Room type</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Featured</th>
                <th className={adminThClass}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${adminTdClass} text-gray-500 text-center py-10`}>
                    No properties yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const thumb = row.images?.[0]?.trim()
                  return (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-100">
                            {thumb ? (
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{row.title}</span>
                            {row.suburb ? (
                              <span className="block text-xs text-gray-500">{row.suburb}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={adminTdClass}>{formatMoney(row.rent_per_week)}</td>
                      <td className={adminTdClass}>{roomLabel(row.room_type)}</td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className={adminTdClass}>
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={Boolean(row.featured)}
                            disabled={updatingId === row.id}
                            onChange={(e) => void setFeatured(row.id, e.target.checked)}
                          />
                          <span className="text-xs text-gray-500">Featured</span>
                        </label>
                      </td>
                      <td className={adminTdClass}>
                        <Link
                          to={`/properties/${row.slug}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </Link>
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
