import { Check, CheckCircle, Circle, X } from 'lucide-react'
import {
  buildBookingActivityItems,
  formatTimelineDate,
  type BookingActivityItem,
  type BookingActivityTone,
  type BookingEventRow,
} from '../../lib/booking/bookingActivityTimeline'
import { useBookingEvents } from '../../hooks/useBookingEvents'

export type BookingActivityTimelineProps = {
  bookingId: string
  /** internal = landlord/admin forensic view; renter = audience both + soft copy */
  mode: 'internal' | 'renter'
  /** Visual language: admin tokens vs student dashboard */
  variant?: 'admin' | 'student'
  className?: string
  /** Optional eyebrow override */
  title?: string
  /** Hide section chrome when embedding under an existing heading */
  embedded?: boolean
}

function toneIconClass(tone: BookingActivityTone, variant: 'admin' | 'student'): string {
  if (variant === 'student') {
    if (tone === 'success') return 'text-emerald-600'
    if (tone === 'warning') return 'text-amber-600'
    if (tone === 'danger') return 'text-red-600'
    return 'text-gray-400'
  }
  if (tone === 'success') return 'text-admin-success-fg'
  if (tone === 'warning') return 'text-admin-warning-fg'
  if (tone === 'danger') return 'text-admin-danger-fg'
  return 'text-admin-ink-5'
}

function ToneIcon({ tone, variant }: { tone: BookingActivityTone; variant: 'admin' | 'student' }) {
  const cls = `shrink-0 ${toneIconClass(tone, variant)}`
  if (tone === 'success') return <CheckCircle size={16} strokeWidth={1.75} className={cls} aria-hidden />
  if (tone === 'danger') return <X size={16} strokeWidth={1.75} className={cls} aria-hidden />
  if (tone === 'warning') return <Circle size={16} strokeWidth={1.75} className={cls} aria-hidden />
  return <Circle size={14} strokeWidth={1.75} className={cls} aria-hidden />
}

function TimelineList({
  items,
  variant,
}: {
  items: BookingActivityItem[]
  variant: 'admin' | 'student'
}) {
  const titleCls =
    variant === 'student' ? 'text-sm font-semibold text-gray-900' : 'text-[13px] font-semibold text-admin-ink-2'
  const detailCls =
    variant === 'student' ? 'text-sm text-gray-600' : 'text-[12px] leading-[1.5] text-admin-ink-3'
  const dateCls =
    variant === 'student' ? 'text-xs tabular-nums text-gray-500' : 'text-[11px] tabular-nums text-admin-ink-5'
  const surfaceCls = variant === 'student' ? 'bg-white' : 'bg-admin-surface-1'
  const linkCls =
    variant === 'student'
      ? 'font-medium text-indigo-700 hover:text-indigo-900 underline-offset-2 hover:underline'
      : 'font-medium text-admin-coral hover:text-admin-coral-active underline-offset-2 hover:underline'

  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {items.map((item) => (
        <li key={item.key} className="flex gap-3">
          <span className={`mt-0.5 shrink-0 ${surfaceCls}`}>
            {variant === 'student' && item.tone === 'success' ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check size={10} strokeWidth={2.5} aria-hidden />
              </span>
            ) : (
              <ToneIcon tone={item.tone} variant={variant} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className={`m-0 ${titleCls}`}>{item.title}</p>
              <time className={`shrink-0 ${dateCls}`} dateTime={item.occurredAt}>
                {formatTimelineDate(item.occurredAt)}
              </time>
            </div>
            {item.detail ? <p className={`m-0 mt-0.5 ${detailCls}`}>{item.detail}</p> : null}
            {item.links.length > 0 ? (
              <p className={`m-0 mt-1 ${detailCls}`}>
                {item.links.map((link, idx) => (
                  <span key={`${item.key}-${link.label}`}>
                    {idx > 0 ? ' · ' : null}
                    {link.href ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className={linkCls}>
                        {link.label}
                      </a>
                    ) : (
                      <span>{link.label}</span>
                    )}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function BookingActivityTimeline({
  bookingId,
  mode,
  variant = mode === 'renter' ? 'student' : 'admin',
  className = '',
  title,
  embedded = false,
}: BookingActivityTimelineProps) {
  const { events, loading, error } = useBookingEvents(bookingId, {
    audienceBothOnly: mode === 'renter',
  })
  const items = buildBookingActivityItems(events, mode)
  const heading = title ?? (mode === 'renter' ? 'Activity' : 'Activity')

  const body = (
    <>
      {loading && items.length === 0 ? (
        <p
          className={
            variant === 'student' ? 'text-sm text-gray-500' : 'text-[12px] text-admin-ink-4'
          }
        >
          Loading activity…
        </p>
      ) : null}
      {error ? (
        <p
          className={
            variant === 'student' ? 'text-sm text-red-700' : 'text-[12px] text-admin-danger-fg'
          }
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p
          className={
            variant === 'student' ? 'text-sm text-gray-500' : 'text-[12px] text-admin-ink-4'
          }
        >
          No activity yet.
        </p>
      ) : null}
      {items.length > 0 ? <TimelineList items={items} variant={variant} /> : null}
    </>
  )

  if (embedded) {
    return <div className={className}>{body}</div>
  }

  if (variant === 'student') {
    return (
      <section className={className} aria-label={heading}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{heading}</h3>
        {body}
      </section>
    )
  }

  return (
    <section className={className} aria-label={heading}>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">{heading}</p>
      {body}
    </section>
  )
}

/** Presentational-only export for tests / story fixtures */
export function BookingActivityTimelineView({
  events,
  mode,
  variant = mode === 'renter' ? 'student' : 'admin',
}: {
  events: BookingEventRow[]
  mode: 'internal' | 'renter'
  variant?: 'admin' | 'student'
}) {
  const items = buildBookingActivityItems(events, mode)
  return <TimelineList items={items} variant={variant} />
}
