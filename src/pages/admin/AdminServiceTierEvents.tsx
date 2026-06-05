import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'
import { AdminPageHeader, EmptyState, LoadingState } from '../../components/admin/primitives'

type TierEventRow = Database['public']['Tables']['service_tier_events']['Row']

const PAGE_SIZE = 50

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '-'
  }
}

function truncateJson(metadata: unknown, max = 160): string {
  try {
    const s = JSON.stringify(metadata ?? null)
    if (s.length <= max) return s
    return `${s.slice(0, max)}…`
  } catch {
    return '…'
  }
}

export default function AdminServiceTierEvents() {
  const [searchParams, setSearchParams] = useSearchParams()

  const bookingIdFilter = (searchParams.get('booking_id') ?? '').trim()
  const eventTypeFilter = (searchParams.get('event_type') ?? '').trim()
  const tierFilter = (searchParams.get('service_tier') ?? '').trim()
  const fromFilter = (searchParams.get('from') ?? '').trim()
  const toFilter = (searchParams.get('to') ?? '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)

  const [rows, setRows] = useState<TierEventRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value == null || value === '') next.delete(key)
          else next.set(key, value)
          if (key !== 'page') next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    void (async () => {
      const { data, error: fetchError } = await supabase.from('service_tier_events').select('event_type').limit(8000)
      if (cancelled) return
      if (fetchError) return
      const uniq = [...new Set((data ?? []).map((r) => r.event_type).filter(Boolean) as string[])].sort()
      setEventTypes(uniq)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const fromIdx = (page - 1) * PAGE_SIZE
    const toIdx = fromIdx + PAGE_SIZE - 1

    let q = supabase.from('service_tier_events').select('*', { count: 'exact' })

    if (bookingIdFilter) q = q.eq('booking_id', bookingIdFilter)
    if (eventTypeFilter) q = q.eq('event_type', eventTypeFilter)
    if (tierFilter === '__null__') q = q.is('service_tier', null)
    else if (tierFilter === 'listing' || tierFilter === 'managed') q = q.eq('service_tier', tierFilter)

    if (/^\d{4}-\d{2}-\d{2}$/.test(fromFilter)) {
      q = q.gte('created_at', `${fromFilter}T00:00:00.000Z`)
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(toFilter)) {
      q = q.lte('created_at', `${toFilter}T23:59:59.999Z`)
    }

    const { data, error: fetchError, count } = await q
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx)

    if (fetchError) {
      setError(fetchError.message)
      setRows([])
      setTotal(0)
    } else {
      setRows((data ?? []) as TierEventRow[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [bookingIdFilter, eventTypeFilter, tierFilter, fromFilter, toFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const tierLabel = useMemo(() => {
    if (tierFilter === '__null__') return 'null'
    if (tierFilter === 'listing' || tierFilter === 'managed') return tierFilter
    return 'All'
  }, [tierFilter])

  return (
    <div>
      <AdminPageHeader
        title="Service tier events"
        subtitle={`Read-only audit trail for booking tier transitions and related actions (${PAGE_SIZE} per page).`}
      />


      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="block text-xs font-semibold text-gray-600">
          Booking ID
          <input
            value={bookingIdFilter}
            onChange={(e) => setParam('booking_id', e.target.value.trim())}
            placeholder="Exact UUID"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-xs font-semibold text-gray-600">
          Event type
          <select
            value={eventTypeFilter}
            onChange={(e) => setParam('event_type', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-gray-600">
          Service tier
          <select
            value={tierFilter || ''}
            onChange={(e) => setParam('service_tier', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="listing">listing</option>
            <option value="managed">managed</option>
            <option value="__null__">null</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-gray-600">
          From (created_at)
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setParam('from', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-gray-600">
          To (created_at)
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setParam('to', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchParams(new URLSearchParams(), { replace: true })
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Showing tier filter: <span className="font-medium text-gray-700">{tierLabel}</span> · Page {page} of {totalPages}{' '}
        ({total} events)
      </p>

      {error && (
        <div className="mb-4 rounded-admin-md border border-admin-danger/20 bg-admin-danger-bg px-3.5 py-2.5 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <LoadingState label="Loading events…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="filter"
            title="No events match these filters"
            description="Clear filters or widen the date range to see more activity."
          />
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={adminThClass}>Created</th>
                <th className={adminThClass}>Event</th>
                <th className={adminThClass}>Tier</th>
                <th className={adminThClass}>Booking</th>
                <th className={adminThClass}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={`${adminTdClass} whitespace-nowrap`}>{formatDateTime(row.created_at)}</td>
                    <td className={adminTdClass}>
                      <span className="font-mono text-xs">{row.event_type}</span>
                    </td>
                    <td className={adminTdClass}>{row.service_tier ?? '-'}</td>
                    <td className={adminTdClass}>
                      {row.booking_id ? (
                        <Link
                          to={`/admin/bookings?highlight=${row.booking_id}`}
                          className="font-mono text-xs text-indigo-600 hover:underline break-all"
                        >
                          {row.booking_id}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={adminTdClass}>
                      <button
                        type="button"
                        className="text-left text-xs font-mono text-gray-700 hover:text-indigo-700 break-all"
                        onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                      >
                        {expandedId === row.id ? (
                          <pre className="whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-2 border border-gray-100">
                            {JSON.stringify(row.metadata ?? null, null, 2)}
                          </pre>
                        ) : (
                          truncateJson(row.metadata)
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParam('page', String(page - 1))}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setParam('page', String(page + 1))}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
