import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'
import type { Database } from '../../lib/database.types'
import { Button, Card, Eyebrow, EmptyState, ErrorState, LoadingState, Pill, type PillTone } from '../../components/admin/primitives'
import { Icon, type IconName } from '../../components/admin/Icon'
import { ChipFilter, DetailDrawer, type ChipFilterOption } from '../../components/admin/patterns'
import { formatDate, formatMoney, studentDisplayName } from './adminUi'
import BookingActivityTimeline from '../../components/booking/BookingActivityTimeline'

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

interface BookingRow {
  id: string
  status: BookingStatus
  start_date: string
  end_date: string | null
  weekly_rent: number | null
  service_tier_at_request: 'listing' | 'managed' | null
  service_tier_final: 'listing' | 'managed' | null
  created_at: string
  confirmed_at: string | null
  declined_at: string | null
  cancelled_at: string | null
  expired_at: string | null
  bond_received_by_landlord_at: string | null
  rent_payment_method: 'bank_transfer' | 'quni_platform' | null
  student_id: string | null
  property_id: string | null
  student_profiles: {
    preferred_name: string | null
    full_name: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    university_id: string | null
    universities: { id: string; name: string; short_name: string | null } | null
  } | null
  properties: { id: string; title: string; suburb: string | null } | null
}

const STATUS_OPTIONS: ReadonlyArray<ChipFilterOption<BookingStatus | 'all'>> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'pending_confirmation', label: 'Pending confirmation' },
  { value: 'awaiting_info', label: 'Awaiting info' },
  { value: 'bond_pending', label: 'Bond pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'payment_failed', label: 'Payment failed' },
]

const TIER_OPTIONS: ReadonlyArray<ChipFilterOption<'all' | 'listing' | 'managed'>> = [
  { value: 'all', label: 'All' },
  { value: 'listing', label: 'Listing' },
  { value: 'managed', label: 'Managed' },
]

const MOVEIN_OPTIONS: ReadonlyArray<ChipFilterOption<'all' | 'upcoming' | 'this_month' | 'past'>> = [
  { value: 'all', label: 'All dates' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'this_month', label: 'This month' },
  { value: 'past', label: 'Past' },
]

const PER_PAGE_OPTIONS = [12, 25, 50] as const
const DEFAULT_PER_PAGE = 12

/** Decision G1-ish: deterministic property thumbnail color from the property id. */
const THUMB_COLORS = [
  '#C4A574',
  '#8FAEC4',
  '#A6907A',
  '#7BA09A',
  '#9B7FB0',
  '#B5856B',
  '#79938C',
  '#A89178',
  '#8DA5C0',
  '#C49E80',
  '#92A88E',
  '#A38FAE',
]

function thumbColor(id: string | null | undefined): string {
  if (!id) return THUMB_COLORS[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return THUMB_COLORS[h % THUMB_COLORS.length]
}

const STATUS_META: Record<BookingStatus, { tone: PillTone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  pending_payment: { tone: 'warning', label: 'Pending payment' },
  pending_confirmation: { tone: 'warning', label: 'Pending confirmation' },
  awaiting_info: { tone: 'info', label: 'Awaiting info' },
  bond_pending: { tone: 'warning', label: 'Bond pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  active: { tone: 'success', label: 'Active' },
  completed: { tone: 'navy', label: 'Completed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  declined: { tone: 'danger', label: 'Declined' },
  expired: { tone: 'danger', label: 'Expired' },
  payment_failed: { tone: 'danger', label: 'Payment failed' },
}

function StatusPill({ status }: { status: BookingStatus }) {
  const m = STATUS_META[status]
  return <Pill tone={m.tone}>{m.label}</Pill>
}

function TierBadge({ tier }: { tier: 'listing' | 'managed' | null }) {
  if (!tier) return <span className="text-admin-ink-5">-</span>
  return (
    <Pill tone={tier === 'managed' ? 'coral' : 'navy'} className="!text-[10px]">
      {tier === 'managed' ? 'Managed' : 'Listing'}
    </Pill>
  )
}

function PropertyThumb({ id, title, suburb }: { id: string | null; title: string | null; suburb: string | null }) {
  const color = thumbColor(id)
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        aria-hidden
        className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-admin-sm"
        style={{ background: color }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.18), rgba(0,0,0,.12))' }} />
        <Icon name="home" size={14} className="absolute left-2.5 top-2.5 text-white/85" />
      </div>
      <div className="min-w-0">
        <p className="m-0 truncate text-[13px] font-medium text-admin-ink-2">{title ?? '-'}</p>
        <p className="m-0 text-[11px] text-admin-ink-4">{suburb ?? '-'}</p>
      </div>
    </div>
  )
}

function StudentCell({ row }: { row: BookingRow }) {
  const sp = row.student_profiles
  const name = sp ? studentDisplayName(sp) : '-'
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '-'
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-admin-surface-3 text-[11px] font-semibold text-admin-ink-2">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="m-0 truncate text-[13px] font-medium text-admin-ink">{name}</p>
        <p className="m-0 truncate text-[11px] text-admin-ink-5">{sp?.email ?? '-'}</p>
      </div>
    </div>
  )
}

function getSearchValue(sp: URLSearchParams, key: string, fallback: string): string {
  const v = sp.get(key)
  return v ?? fallback
}

function trustChecklist(b: BookingRow): Array<{ label: string; done: boolean; stub?: boolean }> {
  return [
    { label: 'Identity verified', done: false, stub: true },
    {
      label: `Student enrolment confirmed${b.student_profiles?.universities?.short_name ? ` (${b.student_profiles.universities.short_name})` : ''}`,
      done: false,
      stub: true,
    },
    {
      label: 'Tenancy agreement signed',
      done: b.status === 'confirmed' || b.status === 'active' || b.status === 'completed',
    },
    { label: 'Bond lodged with RBO', done: !!b.bond_received_by_landlord_at },
  ]
}

export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<BookingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('q') ?? '')

  const q = getSearchValue(searchParams, 'q', '').toLowerCase().trim()
  const statusFilter = getSearchValue(searchParams, 'status', 'all') as BookingStatus | 'all'
  const tierFilter = getSearchValue(searchParams, 'tier', 'all') as 'all' | 'listing' | 'managed'
  const moveinFilter = getSearchValue(searchParams, 'movein', 'all') as 'all' | 'upcoming' | 'this_month' | 'past'
  const uniFilter = getSearchValue(searchParams, 'uni', 'all')
  const perPage = (() => {
    const n = Number(searchParams.get('per'))
    return PER_PAGE_OPTIONS.includes(n as 12 | 25 | 50) ? (n as number) : DEFAULT_PER_PAGE
  })()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const selectedId = searchParams.get('selected') ?? null
  const highlightId = searchParams.get('highlight') ?? null

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
          id, status, start_date, end_date, weekly_rent,
          service_tier_at_request, service_tier_final,
          created_at, confirmed_at, declined_at, cancelled_at, expired_at,
          bond_received_by_landlord_at, rent_payment_method,
          student_id, property_id,
          student_profiles (
            preferred_name, full_name, first_name, last_name, email, university_id,
            universities ( id, name, short_name )
          ),
          properties ( id, title, suburb )
        `,
      )
      .order('start_date', { ascending: true })
      .limit(500)
    if (fetchError) {
      setError(fetchError.message)
      setRows([])
    } else {
      setRows((data ?? []) as unknown as BookingRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = searchInput.trim()
      const current = searchParams.get('q') ?? ''
      if (trimmed === current) return
      const next = new URLSearchParams(searchParams)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      next.delete('page')
      setSearchParams(next, { replace: true })
    }, 200)
    return () => window.clearTimeout(t)
  }, [searchInput, searchParams, setSearchParams])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    if (key !== 'selected') next.delete('page')
    setSearchParams(next, { replace: key === 'selected' || key === 'q' })
  }

  const universities = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      const u = r.student_profiles?.universities
      if (u?.id) map.set(u.id, u.short_name ?? u.name)
    }
    return Array.from(map, ([id, label]) => ({ value: id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const uniOptions: ReadonlyArray<ChipFilterOption<string>> = useMemo(
    () => [{ value: 'all', label: 'All' }, ...universities],
    [universities],
  )

  const filtered = useMemo(() => {
    const now = Date.now()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (tierFilter !== 'all') {
        const tier = r.service_tier_final ?? r.service_tier_at_request
        if (tier !== tierFilter) return false
      }
      if (uniFilter !== 'all' && r.student_profiles?.university_id !== uniFilter) return false
      if (moveinFilter !== 'all') {
        const t = new Date(r.start_date).getTime()
        if (moveinFilter === 'upcoming' && t < now) return false
        if (moveinFilter === 'past' && t >= now) return false
        if (moveinFilter === 'this_month' && (t < startOfMonth.getTime() || t >= endOfMonth.getTime())) return false
      }
      if (q) {
        const sp = r.student_profiles
        const studentName = sp ? studentDisplayName(sp).toLowerCase() : ''
        const haystack = [
          studentName,
          sp?.email?.toLowerCase() ?? '',
          r.properties?.title?.toLowerCase() ?? '',
          r.properties?.suburb?.toLowerCase() ?? '',
          r.id.toLowerCase(),
        ].join(' ')
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [rows, q, statusFilter, tierFilter, uniFilter, moveinFilter])

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * perPage
  const pageRows = filtered.slice(pageStart, pageStart + perPage)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return rows.find((r) => r.id === selectedId) ?? null
  }, [selectedId, rows])

  async function approveBooking(id: string) {
    setUpdatingId(id)
    setError(null)
    const { error: upErr } = await supabase.from('bookings').update({ status: 'confirmed' as BookingStatus }).eq('id', id)
    if (upErr) {
      setError(upErr.message)
    } else {
      const nowIso = new Date().toISOString()
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'confirmed', confirmed_at: r.confirmed_at ?? nowIso } : r)),
      )
    }
    setUpdatingId(null)
  }

  function clearFilters() {
    setSearchInput('')
    const next = new URLSearchParams()
    if (selectedId) next.set('selected', selectedId)
    setSearchParams(next, { replace: true })
  }

  const hasFilters = !!(q || statusFilter !== 'all' || tierFilter !== 'all' || uniFilter !== 'all' || moveinFilter !== 'all')

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-admin-ink">Bookings</h1>
            <p className="m-0 mt-1 text-[14px] text-admin-ink-4">All booking requests and their status.</p>
          </div>
          <div className="flex gap-2.5">
            <Button kind="ghost" size="md" icon="filter">
              Export
            </Button>
            <Button kind="primary" size="md" icon="plus" disabled>
              New booking
            </Button>
          </div>
        </div>

        <Card className="mb-3" padding={12}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex min-w-[240px] max-w-[320px] flex-1 items-center gap-1.5 rounded-admin-sm border border-admin-line bg-admin-surface-2 px-2.5 py-1.5">
              <Icon name="search" size={13} className="text-admin-ink-5" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, property, ID"
                className="flex-1 border-0 bg-transparent text-[13px] text-admin-ink-2 outline-none placeholder:text-admin-ink-5"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="rounded p-0.5 text-admin-ink-5 hover:bg-admin-line hover:text-admin-ink-3"
                >
                  <Icon name="x" size={12} />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ChipFilter
                label="Status"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={(v) => setParam('status', v)}
              />
              <ChipFilter
                label="Tier"
                value={tierFilter}
                options={TIER_OPTIONS}
                onChange={(v) => setParam('tier', v)}
              />
              <ChipFilter
                label="University"
                value={uniFilter}
                options={uniOptions}
                onChange={(v) => setParam('uni', v)}
                disabled={universities.length === 0}
                disabledHint="No linked students yet"
              />
              <ChipFilter
                label="Move-in"
                value={moveinFilter}
                options={MOVEIN_OPTIONS}
                onChange={(v) => setParam('movein', v)}
              />
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-admin-pill border border-transparent px-2 py-1 text-[12px] text-admin-ink-4 hover:text-admin-ink-2"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex-1" />
            <span className="text-[12px] text-admin-ink-4">
              <strong className="text-admin-ink-2">{totalCount}</strong> result{totalCount === 1 ? '' : 's'} · sorted by <strong className="text-admin-ink-2">Move-in ↑</strong>
            </span>
          </div>
        </Card>

        <Card className="overflow-hidden" padding={0}>
          {loading ? (
            <div className="p-10">
              <LoadingState label="Loading bookings…" />
            </div>
          ) : error ? (
            <div className="p-10">
              <ErrorState title="Couldn't load bookings" description={error} onRetry={() => void load()} />
            </div>
          ) : totalCount === 0 ? (
            <div className="p-10">
              <EmptyState
                icon="calendar-check"
                title={hasFilters ? 'No bookings match these filters' : 'No bookings yet'}
                description={hasFilters ? 'Try clearing one or more filters.' : 'Once a student requests a property, it will appear here.'}
                action={
                  hasFilters ? (
                    <Button kind="secondary" size="md" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto" style={{ maxHeight: 720, overflowY: 'auto' }}>
                <table className="w-full border-collapse" style={{ minWidth: 940 }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-admin-surface-2">
                      {['Student', 'Property', 'University', 'Tier', 'Move-in', 'Status', 'Weekly rent', ''].map((h, i) => (
                        <th
                          key={i}
                          className={
                            'whitespace-nowrap border-b border-admin-line px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5 ' +
                            (i === 6 ? 'text-right' : 'text-left')
                          }
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((b, i) => {
                      const isSelected = selected?.id === b.id
                      const isHighlight = highlightId === b.id
                      const isUpdating = updatingId === b.id
                      const baseBg = i % 2 === 1 ? 'bg-admin-surface-2' : 'bg-white'
                      const bg = isSelected
                        ? 'bg-admin-cream'
                        : isHighlight
                          ? 'bg-admin-coral-tint-15'
                          : baseBg
                      const tier = b.service_tier_final ?? b.service_tier_at_request
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setParam('selected', b.id)}
                          className={
                            'cursor-pointer transition-colors hover:bg-admin-surface-3 ' +
                            bg +
                            (isUpdating ? ' opacity-60' : '') +
                            (isSelected ? ' border-l-2 !border-l-admin-coral' : ' border-l-2 border-l-transparent')
                          }
                        >
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle">
                            <StudentCell row={b} />
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle">
                            <PropertyThumb id={b.properties?.id ?? null} title={b.properties?.title ?? null} suburb={b.properties?.suburb ?? null} />
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle text-[13px] text-admin-ink-2">
                            {b.student_profiles?.universities?.short_name ?? b.student_profiles?.universities?.name ?? '-'}
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle">
                            <TierBadge tier={tier} />
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle text-[13px] text-admin-ink-2 tabular-nums">
                            {formatDate(b.start_date)}
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle">
                            <StatusPill status={b.status} />
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle text-right">
                            <span className="text-[14px] font-semibold text-admin-ink tabular-nums">{formatMoney(b.weekly_rent)}</span>
                            <span className="text-[11px] text-admin-ink-5"> /wk</span>
                          </td>
                          <td className="whitespace-nowrap border-b border-admin-line-soft px-3.5 py-3.5 align-middle text-right">
                            <button
                              type="button"
                              aria-label="More options"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md p-1 text-admin-ink-4 hover:bg-admin-surface-3 hover:text-admin-ink-2"
                            >
                              <Icon name="more-horizontal" size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={safePage}
                totalPages={totalPages}
                perPage={perPage}
                totalCount={totalCount}
                pageStart={pageStart}
                pageRows={pageRows.length}
                onPage={(p) => setParam('page', String(p))}
                onPerPage={(n) => setParam('per', String(n))}
              />
            </>
          )}
        </Card>
      </div>

      <DetailDrawer
        open={!!selected}
        onClose={() => setParam('selected', null)}
        eyebrow={`Booking · ${selected?.id.slice(0, 8) ?? ''}`}
        title={
          selected
            ? `${selected.student_profiles ? studentDisplayName(selected.student_profiles) : 'Student'} → ${selected.properties?.suburb ?? selected.properties?.title ?? 'Property'}`
            : ''
        }
        status={selected ? <StatusPill status={selected.status} /> : null}
        actions={
          selected ? (
            <>
              <Button
                kind="primary"
                size="md"
                className="flex-1 justify-center"
                disabled={
                  updatingId === selected.id ||
                  selected.status === 'confirmed' ||
                  selected.status === 'active' ||
                  selected.status === 'completed'
                }
                onClick={() => void approveBooking(selected.id)}
              >
                {selected.status === 'confirmed' || selected.status === 'active' || selected.status === 'completed'
                  ? 'Approved'
                  : 'Approve booking'}
              </Button>
              <Button kind="ghost" size="md" disabled>
                Message
              </Button>
            </>
          ) : null
        }
      >
        {selected ? <DrawerBody booking={selected} onBookingUpdated={() => void load()} /> : null}
      </DetailDrawer>
    </div>
  )
}

function DrawerBody({ booking, onBookingUpdated }: { booking: BookingRow; onBookingUpdated: () => void }) {
  const tier = booking.service_tier_final ?? booking.service_tier_at_request
  const checklist = trustChecklist(booking)
  return (
    <div className="flex flex-col gap-5">
      <KV
        rows={[
          [
            'Student',
            <span key="s">
              {booking.student_profiles ? studentDisplayName(booking.student_profiles) : '-'}
              {booking.student_profiles?.universities ? (
                <span className="text-admin-ink-4">
                  {' · '}
                  {booking.student_profiles.universities.short_name ?? booking.student_profiles.universities.name}
                </span>
              ) : null}
            </span>,
          ],
          ['Property', booking.properties ? `${booking.properties.title}${booking.properties.suburb ? `, ${booking.properties.suburb}` : ''}` : '-'],
          ['Tier', <TierBadge key="t" tier={tier} />],
          ['Move-in date', formatDate(booking.start_date)],
          ['Lease ends', formatDate(booking.end_date)],
          ['Weekly rent', booking.weekly_rent ? `${formatMoney(booking.weekly_rent)} AUD` : '-'],
          ['Rent via', booking.rent_payment_method === 'quni_platform' ? 'Quni platform' : booking.rent_payment_method === 'bank_transfer' ? 'Bank transfer' : '-'],
        ]}
      />

      <DocuSealReconcileSection bookingId={booking.id} onReconciled={onBookingUpdated} />

      <div>
        <Eyebrow>Trust checklist</Eyebrow>
        <ul className="mt-2.5 flex list-none flex-col gap-2 p-0">
          {checklist.map((c, i) => (
            <li key={i} className={'flex items-center gap-2.5 text-[13px] ' + (c.done ? 'text-admin-ink-2' : 'text-admin-ink-4')}>
              <span
                className={
                  'grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border ' +
                  (c.done ? 'border-admin-success/30 bg-admin-success-bg' : 'border-admin-line bg-white')
                }
              >
                {c.done ? <Icon name="check" size={10} className="text-admin-success-fg" /> : null}
              </span>
              <span>{c.label}</span>
              {c.stub ? <span className="ml-auto text-[10px] uppercase tracking-wide text-admin-ink-5">Stub</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Eyebrow>Activity</Eyebrow>
        <div className="mt-2.5">
          <BookingActivityTimeline bookingId={booking.id} mode="internal" embedded />
        </div>
      </div>

      <div>
        <Link
          to={`/admin/service-tier-events?booking_id=${booking.id}`}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-admin-coral hover:text-admin-coral-active"
        >
          View tier events
          <Icon name="arrow-right" size={12} />
        </Link>
      </div>
    </div>
  )
}

function KV({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-[12px] font-medium text-admin-ink-5">{k}</dt>
          <dd className="m-0 text-[13px] text-admin-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

interface LeaseDocSummary {
  id: string
  status: string
  docuseal_submission_id: string
  landlord_signed_at: string | null
  student_signed_at: string | null
}

interface ReconcileApiResponse {
  ok?: boolean
  message?: string
  error?: string
  warning?: string
  changes?: string[]
  submitters?: Array<{
    name: string | null
    role: string | null
    status: string | null
    completed_at: string | null
  }>
}

function DocuSealReconcileSection({
  bookingId,
  onReconciled,
}: {
  bookingId: string
  onReconciled: () => void
}) {
  const [leaseDoc, setLeaseDoc] = useState<LeaseDocSummary | null>(null)
  const [docLoading, setDocLoading] = useState(true)
  const [docError, setDocError] = useState<string | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadLeaseDoc = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setDocError('Supabase is not configured.')
      setDocLoading(false)
      return
    }
    setDocLoading(true)
    setDocError(null)
    try {
      const { data: tenancy, error: tenancyErr } = await supabase
        .from('tenancies')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle()

      if (tenancyErr) throw tenancyErr
      if (!tenancy?.id) {
        setLeaseDoc(null)
        return
      }

      const { data: docs, error: docsErr } = await supabase
        .from('tenancy_documents')
        .select('id, status, docuseal_submission_id, landlord_signed_at, student_signed_at, created_at')
        .eq('tenancy_id', tenancy.id)
        .in('document_type', ['lease', 'residential_tenancy'])
        .not('docuseal_submission_id', 'is', null)
        .order('created_at', { ascending: false })

      if (docsErr) throw docsErr

      const row =
        (docs ?? []).find((d) => {
          const sid = typeof d.docuseal_submission_id === 'string' ? d.docuseal_submission_id.trim() : ''
          return Boolean(sid)
        }) ?? null

      if (!row?.docuseal_submission_id) {
        setLeaseDoc(null)
        return
      }

      setLeaseDoc({
        id: row.id,
        status: row.status,
        docuseal_submission_id: row.docuseal_submission_id.trim(),
        landlord_signed_at: row.landlord_signed_at,
        student_signed_at: row.student_signed_at,
      })
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'Could not load lease document.')
      setLeaseDoc(null)
    } finally {
      setDocLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void loadLeaseDoc()
  }, [loadLeaseDoc])

  async function reconcileFromDocuseal() {
    const confirmed = window.confirm(
      'Reconcile this booking from DocuSeal?\n\n' +
        'This can change booking status, tenancy status, and signature timestamps to match DocuSeal. ' +
        'Withdrawn bookings (cancelled/declined) are blocked server-side.',
    )
    if (!confirmed) return

    setReconciling(true)
    setActionError(null)
    setSummary(null)
    setWarning(null)

    const auth = await getValidAccessTokenForFunctions()
    if ('error' in auth) {
      setActionError(auth.error)
      setReconciling(false)
      return
    }

    try {
      const res = await fetch('/api/admin/reconcile-docuseal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ bookingId }),
      })

      const body = (await res.json().catch(() => ({}))) as ReconcileApiResponse

      if (res.status === 401 || res.status === 403) {
        setActionError(body.error ?? `Admin access required (${res.status}).`)
        return
      }

      if (!res.ok) {
        setActionError(body.error ?? `Reconcile failed (${res.status}).`)
        return
      }

      const changeLines = Array.isArray(body.changes) ? body.changes.filter(Boolean) : []
      const parts = [body.message ?? 'Done.']
      if (changeLines.length > 0) {
        parts.push(changeLines.join('; '))
      }
      if (Array.isArray(body.submitters) && body.submitters.length > 0 && body.ok === false) {
        const submitterSummary = body.submitters
          .map((s) => `${s.role ?? 'Party'}: ${s.status ?? 'unknown'}`)
          .join(', ')
        parts.push(submitterSummary)
      }
      setSummary(parts.join(' '))

      if (typeof body.warning === 'string' && body.warning.trim()) {
        setWarning(body.warning.trim())
      }

      await loadLeaseDoc()
      onReconciled()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setReconciling(false)
    }
  }

  if (docLoading) {
    return (
      <div>
        <Eyebrow>DocuSeal</Eyebrow>
        <p className="m-0 mt-2 text-[12px] text-admin-ink-4">Loading signing document…</p>
      </div>
    )
  }

  if (docError) {
    return (
      <div>
        <Eyebrow>DocuSeal</Eyebrow>
        <p className="m-0 mt-2 text-[12px] text-admin-danger">{docError}</p>
      </div>
    )
  }

  if (!leaseDoc) return null

  return (
    <div className="rounded-admin-md border border-admin-line bg-admin-surface-1 p-3.5">
      <Eyebrow>DocuSeal</Eyebrow>
      <p className="m-0 mt-2 text-[12px] text-admin-ink-3">
        Submission <span className="font-mono text-admin-ink-2">{leaseDoc.docuseal_submission_id}</span>
        {' · '}
        Doc <span className="text-admin-ink-2">{leaseDoc.status}</span>
      </p>
      <div className="mt-3">
        <Button
          kind="primary"
          size="md"
          className="w-full justify-center"
          disabled={reconciling}
          onClick={() => void reconcileFromDocuseal()}
        >
          {reconciling ? 'Reconciling…' : 'Reconcile from DocuSeal'}
        </Button>
      </div>
      {summary ? <p className="m-0 mt-2.5 text-[12px] text-admin-success-fg">{summary}</p> : null}
      {warning ? <p className="m-0 mt-2 text-[12px] font-medium text-admin-warning-fg">{warning}</p> : null}
      {actionError ? <p className="m-0 mt-2 text-[12px] text-admin-danger">{actionError}</p> : null}
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  perPage: number
  totalCount: number
  pageStart: number
  pageRows: number
  onPage: (p: number) => void
  onPerPage: (n: number) => void
}

function Pagination({ page, totalPages, perPage, totalCount, pageStart, pageRows, onPage, onPerPage }: PaginationProps) {
  const pages = compactPages(page, totalPages)
  const endRow = pageStart + pageRows
  return (
    <div className="flex items-center justify-between border-t border-admin-line bg-white px-4 py-2.5">
      <span className="text-[12px] text-admin-ink-4">
        Showing <strong className="text-admin-ink-2">{totalCount === 0 ? 0 : pageStart + 1}</strong>–
        <strong className="text-admin-ink-2">{endRow}</strong> of <strong className="text-admin-ink-2">{totalCount}</strong>
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[12px] text-admin-ink-4">
          Rows:
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="rounded-admin-sm border border-admin-line bg-white px-1.5 py-0.5 text-[12px] text-admin-ink-2"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1">
          <PageBtn label="Previous" icon="chevron-left" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="grid h-7 min-w-[28px] place-items-center px-2 text-[12px] text-admin-ink-5">
                …
              </span>
            ) : (
              <PageBtn key={p} active={p === page} onClick={() => onPage(p)}>
                {p}
              </PageBtn>
            ),
          )}
          <PageBtn label="Next" icon="chevron-right" disabled={page >= totalPages} onClick={() => onPage(page + 1)} />
        </div>
      </div>
    </div>
  )
}

interface PageBtnProps {
  children?: React.ReactNode
  icon?: IconName
  label?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

function PageBtn({ children, icon, label, active, disabled, onClick }: PageBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={
        'grid h-7 min-w-[28px] place-items-center rounded-admin-sm border px-2 text-[12px] font-semibold transition-colors ' +
        (active
          ? 'border-transparent bg-admin-ink text-white'
          : 'border-admin-line bg-white text-admin-ink-3 hover:bg-admin-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white')
      }
    >
      {icon ? <Icon name={icon} size={13} /> : children}
    </button>
  )
}

function compactPages(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: Array<number | '…'> = []
  const add = (n: number | '…') => out.push(n)
  add(1)
  if (page > 3) add('…')
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) add(i)
  if (page < total - 2) add('…')
  add(total)
  return out
}
