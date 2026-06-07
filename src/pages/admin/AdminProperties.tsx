import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PropertyFeeSnapshotsModal } from './PropertyFeeSnapshotsModal'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { ROOM_TYPE_LABELS, type RoomType } from '../../lib/listings'
import { adminTableWrapClass, adminTdClass, adminThClass, formatMoney } from './adminUi'
import { withSentryMonitoring } from '../../lib/supabaseErrorMonitor'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'
import { firstPropertyImageUrl } from '../../lib/propertyImages'

type PropertyStatus = Database['public']['Tables']['properties']['Row']['status']
type AdminPropertyStatus = PropertyStatus | 'suspended'

type PropertyRow = Omit<Database['public']['Tables']['properties']['Row'], 'status'> & { status: AdminPropertyStatus }

type ListerRoleFilter = 'all' | 'head_tenant'

function authorityToLetBadgeClass(attested: boolean) {
  return attested ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
}

function listerRoleBadgeClass(role: PropertyRow['lister_role']) {
  return role === 'head_tenant' ? 'bg-[#FF6F61]/15 text-[#1B2A4A]' : 'bg-slate-100 text-slate-700'
}

function listerRoleLabel(role: PropertyRow['lister_role']) {
  return role === 'head_tenant' ? 'Head-tenant' : 'Owner'
}

function statusBadgeClass(s: AdminPropertyStatus) {
  switch (s) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-600'
    case 'suspended':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function roomLabel(rt: string | null) {
  if (!rt) return '-'
  return ROOM_TYPE_LABELS[rt as RoomType] ?? rt
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function AdminProperties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const feesParam = searchParams.get('fees')
  const feesPropertyId = useMemo(() => (feesParam && UUID_RE.test(feesParam) ? feesParam : null), [feesParam])
  const listerRoleFilter = (searchParams.get('lister_role') ?? 'all') as ListerRoleFilter

  const setListerRoleFilter = useCallback(
    (next: ListerRoleFilter) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'all') params.delete('lister_role')
          else params.set('lister_role', next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const openFeesModal = useCallback(
    (propertyId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('fees', propertyId)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const closeFeesModal = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('fees')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const [rows, setRows] = useState<PropertyRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredRows = useMemo(() => {
    if (listerRoleFilter !== 'head_tenant') return rows
    return rows.filter((row) => row.lister_role === 'head_tenant')
  }, [rows, listerRoleFilter])

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

  async function updateStatus(id: string, status: AdminPropertyStatus) {
    const prev = rows.find((r) => r.id === id)?.status ?? 'inactive'
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)))
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await withSentryMonitoring('AdminProperties/update-property-status', () =>
      supabase
        .from('properties')
        .update({
          status: status as Database['public']['Tables']['properties']['Update']['status'],
        })
        .eq('id', id),
    )
    if (upErr) {
      setError(upErr.message)
      setRows((r) => r.map((row) => (row.id === id ? { ...row, status: prev } : row)))
    }
    setUpdatingId(null)
  }

  return (
    <div>
      <PropertyFeeSnapshotsModal open={Boolean(feesPropertyId)} propertyId={feesPropertyId} onClose={closeFeesModal} />

      <AdminPageHeader title="Properties" subtitle="All listings across every status." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Lister role:</span>
        <button
          type="button"
          onClick={() => setListerRoleFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            listerRoleFilter === 'all'
              ? 'bg-[#1B2A4A] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setListerRoleFilter('head_tenant')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            listerRoleFilter === 'head_tenant'
              ? 'bg-[#FF6F61] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Head-tenant
        </button>
        {listerRoleFilter === 'head_tenant' ? (
          <span className="text-xs text-gray-500">
            {filteredRows.length} listing{filteredRows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading properties…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="building-2"
            title="No properties yet"
            description="Listings appear here as soon as landlords publish them."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon="filter"
            title="No head-tenant listings"
            description="No listings match the head-tenant filter."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Listing</th>
                <th className={adminThClass}>Price / week</th>
                <th className={adminThClass}>Room type</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Authority to let</th>
                <th className={adminThClass}>Lister role</th>
                <th className={adminThClass}>Featured</th>
                <th className={adminThClass}>Fees</th>
                <th className={adminThClass}>View</th>
                <th className={adminThClass}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                  const thumb = firstPropertyImageUrl(row.images)?.trim()
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
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                          <select
                            value={row.status}
                            disabled={updatingId === row.id}
                            onChange={(e) => void updateStatus(row.id, e.target.value as AdminPropertyStatus)}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="suspended">suspended</option>
                          </select>
                        </div>
                      </td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${authorityToLetBadgeClass(Boolean(row.authority_to_let_attested_at))}`}
                        >
                          {row.authority_to_let_attested_at ? 'Attested' : 'Not attested'}
                        </span>
                      </td>
                      <td className={adminTdClass}>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${listerRoleBadgeClass(row.lister_role ?? 'owner')}`}
                        >
                          {listerRoleLabel(row.lister_role ?? 'owner')}
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
                        <button
                          type="button"
                          onClick={() => openFeesModal(row.id)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Fees
                        </button>
                      </td>
                      <td className={adminTdClass}>
                        {row.slug?.trim() ? (
                          <a
                            href={`/properties/${encodeURIComponent(row.slug.trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className={adminTdClass}>
                        <Link
                          to={`/landlord/property/edit/${row.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
