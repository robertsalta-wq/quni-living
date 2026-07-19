import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, FileText } from 'lucide-react'
import type { LandlordProfileRow } from '../../lib/authProfile'
import {
  buildNext7Days,
  next7DotClass,
  next7TagClass,
  type SchedulingBooking,
} from '../../lib/landlordBookingsScheduling'
import { landlordOverviewFunnel } from '../../lib/landlordOverviewFunnel'
import {
  landlordBookingsPath,
  landlordDashboardTabPath,
} from '../../lib/userDashboardNav'
import { LandlordStripePayoutsCard } from './LandlordStripePayoutsCard'

const cardHover =
  'transition-[transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]'

const whiteCard = [
  'rounded-[var(--radius-lg)] border border-[var(--quni-line)] bg-white shadow-[var(--shadow-1)]',
  cardHover,
].join(' ')

type Props = {
  profile: LandlordProfileRow
  activeListings: number
  bookingsCount: number
  pendingBookings: number
  unreadMessageCount: number
  conversationsCount: number
  schedulingBookings: SchedulingBooking[]
  firstActiveListingSlug: string | null
  finishProfileHref: string
  onRefresh: () => Promise<void>
  onOpenSupport: () => void
  onGoListings: () => void
  onGoBookings: () => void
  connectSetupError?: string | null
  mixedServiceNote?: string | null
}

function FunnelStepper({
  steps,
}: {
  steps: ReturnType<typeof landlordOverviewFunnel>['steps']
}) {
  return (
    <div className="flex items-start px-1.5">
      {steps.map((step, i) => {
        const next = steps[i + 1]
        const connectorDone =
          step.state === 'done' && next != null && (next.state === 'done' || next.state === 'current')
        return (
          <div key={step.id} className="flex flex-1 flex-col items-center">
            <div className="relative flex h-[22px] w-full items-center justify-center">
              {i < steps.length - 1 ? (
                <span
                  className="absolute left-1/2 top-[9.5px] z-0 h-[3px] w-full"
                  style={{
                    background: connectorDone
                      ? 'var(--quni-success)'
                      : 'rgba(8, 6, 13, 0.12)',
                  }}
                  aria-hidden
                />
              ) : null}
              <span
                className={[
                  'relative z-[1] inline-flex h-[22px] w-[22px] items-center justify-center rounded-full box-border',
                  step.state === 'done'
                    ? 'bg-[var(--quni-success)]'
                    : step.state === 'current'
                      ? 'border-[3px] border-[var(--quni-coral)] bg-white'
                      : 'border-[2.5px] border-[#D8D2C6] bg-white',
                ].join(' ')}
                aria-current={step.state === 'current' ? 'step' : undefined}
              >
                {step.state === 'done' ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </span>
            </div>
            <span
              className={[
                'mt-1.5 text-[11px]',
                step.state === 'current'
                  ? 'font-bold text-[var(--quni-coral-active)]'
                  : step.state === 'todo'
                    ? 'font-medium text-[var(--quni-ink-5)]'
                    : 'font-semibold text-[var(--quni-ink)]',
              ].join(' ')}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Desktop (md+) landlord overview — wider expression of the mobile dashboard.
 * Mobile overview markup stays in LandlordDashboard and must not change.
 */
export default function LandlordDashboardOverviewDesktop({
  profile,
  activeListings,
  bookingsCount,
  pendingBookings,
  unreadMessageCount,
  conversationsCount,
  schedulingBookings,
  firstActiveListingSlug,
  finishProfileHref,
  onRefresh,
  onOpenSupport,
  onGoListings,
  onGoBookings,
  connectSetupError,
  mixedServiceNote,
}: Props) {
  const funnel = useMemo(
    () => landlordOverviewFunnel(profile, activeListings),
    [profile, activeListings],
  )
  const agenda = useMemo(() => buildNext7Days(schedulingBookings), [schedulingBookings])
  const calendarHref = landlordBookingsPath('calendar')
  const viewListingHref = firstActiveListingSlug
    ? `/listings/${firstActiveListingSlug}`
    : landlordDashboardTabPath('listings')

  return (
    <div className="hidden sm:block">
      {connectSetupError ? (
        <div
          className="mb-4 rounded-xl border border-[var(--quni-danger-bg)] bg-[var(--quni-danger-bg)] px-4 py-3 text-sm text-[var(--quni-danger-fg)]"
          role="alert"
        >
          {connectSetupError}
        </div>
      ) : null}

      {mixedServiceNote ? (
        <p className="mb-5 text-sm text-[var(--quni-ink-4)]">{mixedServiceNote}</p>
      ) : null}

      {/* Row 1 — profile + payouts */}
      <div className="mb-5 flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[2_1_540px]">
          {funnel.profileComplete ? (
            <div
              className={[
                whiteCard,
                'flex w-full items-center gap-3 px-5 py-[15px]',
                'border-[rgba(29,158,117,0.30)] bg-[var(--quni-success-bg)]',
              ].join(' ')}
            >
              <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--quni-success)]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14.5px] font-bold text-[var(--quni-success-strong)]">
                  Profile complete
                </p>
                <p className="m-0 mt-0.5 text-[12.5px] text-[var(--quni-success-strong)] opacity-90">
                  Your listing is live and visible to students.
                </p>
              </div>
              <Link
                to={viewListingHref}
                className="shrink-0 text-[13px] font-semibold text-[var(--quni-success-strong)] transition-colors hover:text-[var(--quni-coral-active)]"
              >
                View your listing →
              </Link>
            </div>
          ) : (
            <div
              className={[
                whiteCard,
                'flex w-full flex-col justify-center px-5 py-[15px]',
                'border-[rgba(255,111,97,0.40)] bg-[rgba(255,111,97,0.06)]',
              ].join(' ')}
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="m-0 text-[15px] font-bold tracking-[-0.01em] text-[var(--quni-ink)]">
                  Finish your profile{' '}
                  <span className="text-xs font-medium text-[var(--quni-ink-4)]">
                    · {funnel.stepOfTwoLabel}
                  </span>
                </p>
                <Link
                  to={finishProfileHref}
                  className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[var(--quni-coral)] transition-colors hover:text-[var(--quni-coral-active)]"
                >
                  Finish to publish
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
              <FunnelStepper steps={funnel.steps} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_300px]">
          <LandlordStripePayoutsCard
            profile={profile}
            onRefresh={onRefresh}
            presentation="status"
          />
        </div>
      </div>

      {/* Row 2 — stats + need help */}
      <div className="mb-4 flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[2_1_540px]">
          <div className="grid w-full flex-1 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            <button
              type="button"
              onClick={onGoListings}
              className={[whiteCard, 'flex flex-col justify-center p-[18px] text-left'].join(' ')}
            >
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Active listings
              </p>
              <p className="my-2 text-[28px] font-bold tabular-nums text-[var(--quni-ink)]">
                {activeListings}
              </p>
              <p className="m-0 text-xs text-[var(--quni-ink-4)]">
                {activeListings > 0 ? 'Published as active' : 'None published yet'}
              </p>
            </button>

            <Link
              to="/messages"
              className={[whiteCard, 'flex flex-col justify-center p-[18px]'].join(' ')}
            >
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Messages
              </p>
              <p className="my-2 text-[28px] font-bold tabular-nums text-[var(--quni-ink)]">
                {conversationsCount}
              </p>
              <p
                className={[
                  'm-0 text-xs',
                  unreadMessageCount > 0
                    ? 'font-semibold text-[var(--quni-coral-active)]'
                    : 'text-[var(--quni-ink-4)]',
                ].join(' ')}
              >
                {unreadMessageCount > 0 ? `${unreadMessageCount} unread` : 'All read'}
              </p>
            </Link>

            <button
              type="button"
              onClick={onGoBookings}
              className={[whiteCard, 'flex flex-col justify-center p-[18px] text-left'].join(' ')}
            >
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
                Bookings
              </p>
              <p className="my-2 text-[28px] font-bold tabular-nums text-[var(--quni-ink)]">
                {bookingsCount}
              </p>
              <p className="m-0 text-xs text-[var(--quni-ink-4)]">
                {pendingBookings > 0 ? (
                  <span className="font-semibold text-[var(--quni-coral-active)]">
                    {pendingBookings} pending
                  </span>
                ) : (
                  'Nothing pending'
                )}
              </p>
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px]">
          <button
            type="button"
            onClick={onOpenSupport}
            className={[whiteCard, 'flex w-full flex-col px-5 py-[18px] text-left'].join(' ')}
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--quni-surface-3)] text-[var(--quni-ink-4)]">
                <CircleHelp className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
              </span>
              <p className="m-0 text-[15px] font-bold text-[var(--quni-ink)]">Need help?</p>
            </div>
            <p className="m-0 mb-2.5 text-[12.5px] leading-normal text-[var(--quni-ink-4)]">
              Our team replies within one business day — tenancy setup, bonds and payouts.
            </p>
            <span className="mt-auto text-[13px] font-semibold text-[var(--quni-coral)] transition-colors hover:text-[var(--quni-coral-active)]">
              Contact support →
            </span>
          </button>
        </div>
      </div>

      {/* Row 3 — agenda + secondary */}
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[2_1_540px]">
          <section className={[whiteCard, 'px-[22px] py-[18px]'].join(' ')}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h2 className="m-0 text-[15px] font-bold text-[var(--quni-ink)]">Next 7 days</h2>
              <Link
                to={calendarHref}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--quni-coral)] transition-colors hover:text-[var(--quni-coral-active)]"
              >
                Bookings calendar
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            {agenda.length === 0 ? (
              <p className="m-0 py-3 text-[12.5px] leading-normal text-[var(--quni-ink-4)]">
                Nothing scheduled in the next 7 days.
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {agenda.map((item, index) => (
                  <li
                    key={item.id}
                    className={[
                      'flex items-center gap-3 py-[11px]',
                      index > 0 ? 'border-t border-[var(--quni-surface-3)]' : '',
                    ].join(' ')}
                  >
                    <span
                      className={`h-[9px] w-[9px] shrink-0 rounded-full ${next7DotClass(item.tag)}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13.5px] font-semibold text-[var(--quni-ink)]">
                        {item.title}
                      </span>
                      {item.subtitle ? (
                        <span className="text-[12.5px] text-[var(--quni-ink-5)]">
                          {' '}
                          · {item.subtitle}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${next7TagClass(item.tag)}`}
                    >
                      {item.tag}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <div className={[whiteCard, 'px-5 py-[18px]'].join(' ')}>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--quni-surface-3)] text-[var(--quni-ink-4)]">
                <FileText className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
              </span>
              <p className="m-0 text-[15px] font-bold text-[var(--quni-ink)]">Sample agreements</p>
            </div>
            <p className="m-0 mb-2.5 text-[12.5px] leading-normal text-[var(--quni-ink-4)]">
              Preview the tenancy and rooming-house templates before you publish a listing.
            </p>
            <Link
              to="/sample-agreements"
              className="text-[13px] font-semibold text-[var(--quni-coral)] transition-colors hover:text-[var(--quni-coral-active)]"
            >
              View sample agreements →
            </Link>
          </div>

          <div className={[whiteCard, 'px-5 py-[18px]'].join(' ')}>
            <p className="m-0 mb-1.5 text-[15px] font-bold text-[var(--quni-ink)]">Recent activity</p>
            <p className="m-0 text-[12.5px] leading-normal text-[var(--quni-ink-4)]">
              No activity recorded yet. Publish your first listing to start receiving enquiries.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
