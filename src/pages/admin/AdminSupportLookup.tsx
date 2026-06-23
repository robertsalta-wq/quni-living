import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fetchUserTimeline, type JourneyEvent, type UserTimelineAccount } from '../../lib/adminUserTimeline'
import { isRenterRole } from '../../lib/authProfile'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { adminCardClass } from './adminUi'
import { AdminPageHeader, Button, EmptyState, ErrorState, LoadingState } from '../../components/admin/primitives'
import { Icon } from '../../components/admin/Icon'

const BOOKING_EVENT_TYPES = new Set([
  'booking_page_opened',
  'booking_submit_attempt',
  'booking_completed',
  'booking_rejected',
  'booking_landlord_notified',
  'booking_confirmed',
])

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '-'
  }
}

function eventTypeLabel(eventType: string): string {
  switch (eventType) {
    case 'booking_page_opened':
      return 'Page opened'
    case 'booking_submit_attempt':
      return 'Submit attempted'
    case 'booking_completed':
      return 'Completed'
    case 'booking_rejected':
      return 'Rejected'
    case 'booking_landlord_notified':
      return 'Landlord notified'
    case 'booking_confirmed':
      return 'Confirmed'
    default:
      return eventType.replace(/_/g, ' ')
  }
}

function routeLabel(route: string | null): string {
  if (route === 'student') return 'Student'
  if (isNonStudentAccommodationRoute(route)) return 'Non-student'
  if (route == null) return 'Not chosen'
  return route
}

function verificationLabel(type: string | null): string {
  if (type === 'student') return 'Verified (student)'
  if (type === 'identity') return 'Verified (identity)'
  if (type === 'none') return 'Unverified'
  if (type == null) return '-'
  return type
}

function roleLabel(role: UserTimelineAccount['role']): string {
  if (isRenterRole(role)) return 'Renter (student profile)'
  if (role === 'landlord') return 'Landlord'
  if (role === 'admin') return 'Platform staff'
  return 'Unknown'
}

function funnelStepOrder(eventType: string): number {
  switch (eventType) {
    case 'booking_page_opened':
      return 0
    case 'booking_submit_attempt':
      return 1
    case 'booking_rejected':
      return 2
    case 'booking_completed':
      return 2
    case 'booking_landlord_notified':
      return 3
    case 'booking_confirmed':
      return 4
    default:
      return 5
  }
}

type AttemptGroup = {
  kind: 'attempt'
  attemptId: string
  newestAt: string
  events: JourneyEvent[]
  isWalkAway: boolean
}

type StandaloneEntry = {
  kind: 'standalone'
  newestAt: string
  event: JourneyEvent
}

type TimelineItem = AttemptGroup | StandaloneEntry

function buildTimelineItems(events: JourneyEvent[]): TimelineItem[] {
  const attemptMap = new Map<string, JourneyEvent[]>()
  const standalone: StandaloneEntry[] = []

  for (const event of events) {
    if (event.attempt_id && BOOKING_EVENT_TYPES.has(event.event_type)) {
      const list = attemptMap.get(event.attempt_id) ?? []
      list.push(event)
      attemptMap.set(event.attempt_id, list)
    } else {
      standalone.push({ kind: 'standalone', newestAt: event.created_at, event })
    }
  }

  const attempts: AttemptGroup[] = [...attemptMap.entries()].map(([attemptId, groupEvents]) => {
    const sorted = [...groupEvents].sort((a, b) => {
      const orderDiff = funnelStepOrder(a.event_type) - funnelStepOrder(b.event_type)
      if (orderDiff !== 0) return orderDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    const hasSubmit = sorted.some((e) => e.event_type === 'booking_submit_attempt')
    const hasPageOpen = sorted.some((e) => e.event_type === 'booking_page_opened')
    const newestAt = sorted.reduce(
      (max, e) => (new Date(e.created_at) > new Date(max) ? e.created_at : max),
      sorted[0]?.created_at ?? '',
    )
    return {
      kind: 'attempt',
      attemptId,
      newestAt,
      events: sorted,
      isWalkAway: hasPageOpen && !hasSubmit,
    }
  })

  return [...attempts, ...standalone].sort(
    (a, b) => new Date(b.newestAt).getTime() - new Date(a.newestAt).getTime(),
  )
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  if (value == null) return null
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return null
}

function deviceContextFromMetadata(
  metadata: Record<string, unknown>,
): { userAgent: string; isMobile: boolean } | null {
  const rawUa = metadata.user_agent
  if (typeof rawUa !== 'string') return null
  const userAgent = rawUa.trim()
  if (!userAgent) return null

  const rawMobile = metadata.is_mobile
  let isMobile = false
  if (typeof rawMobile === 'boolean') {
    isMobile = rawMobile
  } else if (typeof rawMobile === 'string') {
    isMobile = rawMobile.toLowerCase() === 'true'
  }

  return { userAgent, isMobile }
}

function DeviceIndicator({ metadata }: { metadata: Record<string, unknown> }) {
  const device = deviceContextFromMetadata(metadata)
  if (!device) return null

  return (
    <span
      className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600"
      title={device.userAgent}
    >
      {device.isMobile ? 'Mobile' : 'Desktop'}
    </span>
  )
}

function RejectionDetails({ event }: { event: JourneyEvent }) {
  const meta = event.metadata ?? {}
  const verificationType = metadataString(meta, 'verification_type')
  const route = metadataString(meta, 'accommodation_verification_route')
  const openToNonStudents = metadataString(meta, 'open_to_non_students')

  return (
    <div className="mt-2 rounded-admin-md border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[13px] text-amber-950">
      <p className="font-semibold">
        {event.error_code ?? 'rejected'}
        {event.http_status != null ? ` · HTTP ${event.http_status}` : ''}
      </p>
      <dl className="mt-1.5 grid gap-1 sm:grid-cols-2">
        {verificationType ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-amber-800/80">Verification</dt>
            <dd>{verificationLabel(verificationType === 'none' ? 'none' : verificationType)}</dd>
          </div>
        ) : null}
        {route ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-amber-800/80">Accommodation route</dt>
            <dd>{routeLabel(route)}</dd>
          </div>
        ) : null}
        {openToNonStudents ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-amber-800/80">Listing open to non-students</dt>
            <dd>{openToNonStudents}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function AttemptCard({ group }: { group: AttemptGroup }) {
  const propertyId = group.events.find((e) => e.property_id)?.property_id

  return (
    <article className={`${adminCardClass} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
            Booking attempt
          </p>
          <p className="mt-0.5 font-mono text-[12px] text-admin-ink-4">{group.attemptId.slice(0, 8)}…</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {group.isWalkAway ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[12px] font-medium text-stone-700">
              Walk-away
            </span>
          ) : null}
          <span className="text-[12px] text-admin-ink-5">{formatDateTime(group.newestAt)}</span>
        </div>
      </div>

      {propertyId ? (
        <p className="text-[13px] text-admin-ink-4">
          Property{' '}
          <Link to={`/admin/properties`} className="font-mono text-indigo-800 hover:underline">
            {propertyId.slice(0, 8)}…
          </Link>
        </p>
      ) : null}

      <ol className="space-y-2 border-l-2 border-admin-line-soft pl-4">
        {group.events.map((event) => (
          <li key={event.id} className="relative">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-admin-ink-2">{eventTypeLabel(event.event_type)}</span>
                <DeviceIndicator metadata={event.metadata ?? {}} />
              </div>
              <span className="text-[12px] text-admin-ink-5">{formatDateTime(event.created_at)}</span>
            </div>
            {event.step ? (
              <p className="text-[12px] text-admin-ink-5">Step: {event.step.replace(/_/g, ' ')}</p>
            ) : null}
            {event.service_tier ? (
              <p className="text-[12px] text-admin-ink-5">Tier: {event.service_tier}</p>
            ) : null}
            {event.event_type === 'booking_rejected' ? <RejectionDetails event={event} /> : null}
            {event.event_type === 'booking_completed' ? (
              <p className="mt-1 text-[13px]">
                Booking{' '}
                <Link
                  to={`/admin/bookings?selected=${metadataString(event.metadata, 'booking_id') ?? ''}`}
                  className="font-mono font-medium text-indigo-800 hover:underline"
                >
                  {metadataString(event.metadata, 'booking_id')?.slice(0, 8) ?? '-'}…
                </Link>
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </article>
  )
}

function StandaloneCard({ event }: { event: JourneyEvent }) {
  return (
    <article className={`${adminCardClass} space-y-1`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-admin-ink-2">{eventTypeLabel(event.event_type)}</span>
          {BOOKING_EVENT_TYPES.has(event.event_type) ? (
            <DeviceIndicator metadata={event.metadata ?? {}} />
          ) : null}
        </div>
        <span className="text-[12px] text-admin-ink-5">{formatDateTime(event.created_at)}</span>
      </div>
      {event.step ? <p className="text-[12px] text-admin-ink-5">Step: {event.step}</p> : null}
      {event.error_code ? (
        <p className="text-[13px] text-amber-900">
          {event.error_code}
          {event.http_status != null ? ` · HTTP ${event.http_status}` : ''}
        </p>
      ) : null}
    </article>
  )
}

function AccountHeader({ account, queryQ }: { account: UserTimelineAccount; queryQ: string }) {
  return (
    <section className={`${adminCardClass} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
            Current state
          </p>
          {!account.resolved ? (
            <p className="mt-1 text-[15px] font-medium text-amber-900">
              No account resolved for &ldquo;{queryQ}&rdquo;
            </p>
          ) : (
            <p className="mt-1 text-[15px] font-medium text-admin-ink-1">{account.email ?? queryQ}</p>
          )}
        </div>
        {account.student_profile_id ? (
          <Link
            to={`/admin/students?profile=${account.student_profile_id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-800 hover:text-indigo-950 hover:underline"
          >
            Renter profile
            <Icon name="arrow-up-right" size={14} />
          </Link>
        ) : null}
      </div>

      {account.resolved ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">Role</dt>
            <dd className="mt-0.5 text-[13px] text-admin-ink-2">{roleLabel(account.role)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
              Accommodation route
            </dt>
            <dd className="mt-0.5 text-[13px] text-admin-ink-2">
              {routeLabel(account.accommodation_verification_route)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
              Verification
            </dt>
            <dd className="mt-0.5 text-[13px] text-admin-ink-2">
              {verificationLabel(account.verification_type)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
              Onboarding complete
            </dt>
            <dd className="mt-0.5 text-[13px] text-admin-ink-2">
              {account.onboarding_complete == null ? '-' : account.onboarding_complete ? 'Yes' : 'No'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
              Account created
            </dt>
            <dd className="mt-0.5 text-[13px] text-admin-ink-2">{formatDateTime(account.created_at)}</dd>
          </div>
          {account.user_id ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">User ID</dt>
              <dd className="mt-0.5 font-mono text-[12px] text-admin-ink-4">{account.user_id}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-[13px] text-admin-ink-5">
          Journey events below may still match this email if the person browsed before signing up.
        </p>
      )}
    </section>
  )
}

export default function AdminSupportLookup() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q')?.trim() ?? ''

  const [searchInput, setSearchInput] = useState(queryFromUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<UserTimelineAccount | null>(null)
  const [events, setEvents] = useState<JourneyEvent[]>([])
  const [eventsTruncated, setEventsTruncated] = useState(false)
  const [activeQuery, setActiveQuery] = useState('')

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setActiveQuery(trimmed)

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        setError('Sign in required')
        setLoading(false)
        return
      }

      const result = await fetchUserTimeline(`Bearer ${token}`, trimmed)
      setAccount(result.account)
      setEvents(result.events)
      setEventsTruncated(Boolean(result.events_truncated))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setAccount(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSearchInput(queryFromUrl)
    if (queryFromUrl) {
      void runSearch(queryFromUrl)
    }
  }, [queryFromUrl, runSearch])

  const timelineItems = useMemo(() => buildTimelineItems(events), [events])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchInput.trim()
    if (!trimmed) return
    const next = new URLSearchParams(searchParams)
    next.set('q', trimmed)
    setSearchParams(next, { replace: true })
  }

  const hasSearched = Boolean(activeQuery)

  return (
    <div>
      <AdminPageHeader
        title="Support lookup"
        subtitle="Search by email or user ID to see account state and the full journey timeline."
      />

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="min-w-[min(100%,20rem)] flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-admin-ink-3">Email or user ID</span>
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-ink-5"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="renter@example.com or UUID"
              className="w-full rounded-admin-md border border-admin-line bg-white py-2.5 pl-9 pr-3 text-[13px] text-admin-ink-2 shadow-admin-card placeholder:text-admin-ink-5 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoComplete="off"
            />
          </div>
        </label>
        <Button type="submit" kind="primary" disabled={loading || !searchInput.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {error ? (
        <div className="mb-4">
          <ErrorState title="Lookup failed" description={error} />
        </div>
      ) : null}

      {loading && !account ? <LoadingState label="Loading timeline…" /> : null}

      {hasSearched && !loading && account ? (
        <div className="space-y-6">
          <AccountHeader account={account} queryQ={activeQuery} />

          {eventsTruncated ? (
            <p className="text-[13px] text-admin-ink-5">
              Showing the latest 500 events. Older entries are not included.
            </p>
          ) : null}

          {timelineItems.length === 0 ? (
            <EmptyState
              icon="life-buoy"
              title="No journey events"
              description="No captured events for this person yet. Booking page opens and submits appear here once Phase 1 capture runs."
            />
          ) : (
            <div className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">Timeline</h2>
              {timelineItems.map((item) =>
                item.kind === 'attempt' ? (
                  <AttemptCard key={item.attemptId} group={item} />
                ) : (
                  <StandaloneCard key={item.event.id} event={item.event} />
                ),
              )}
            </div>
          )}
        </div>
      ) : null}

      {!hasSearched && !loading ? (
        <EmptyState
          icon="search"
          title="Look up a person"
          description="Enter an email address or auth user ID to view their current account state and journey events."
        />
      ) : null}
    </div>
  )
}
