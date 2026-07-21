import { Link } from 'react-router-dom'
import type { TenantInviteSignupHints } from '../../lib/tenantInviteSignupContext'
import TenantInviteOfferBanner from './TenantInviteOfferBanner'

type Props = {
  hints: TenantInviteSignupHints
  loginHref: string
}

export default function TenantInviteSignupBanner({ hints, loginHref }: Props) {
  if (!hints.isTenantInviteFlow) return null

  const greeting = hints.invitedName ? `Hi ${hints.invitedName.split(/\s+/)[0]}, ` : ''

  return (
    <div className="quni-card mb-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Landlord invitation</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900 leading-snug">
        {greeting}you&apos;re invited to apply on Quni
      </h2>
      {hints.propertyTitle ? (
        <p className="mt-2 text-sm text-gray-700">
          Your landlord shared the official application link for{' '}
          <span className="font-medium text-gray-900">{hints.propertyTitle}</span> on quni.com.au. Create a renter
          account to continue — the same process used for other listings on the platform.
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-700">
          Your landlord shared the official application link for this room on quni.com.au. Create a renter account
          to continue.
        </p>
      )}
      {hints.studentOnly && (
        <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-gray-700">
          This room is for students only — you&apos;ll need to verify as a student during onboarding.
        </p>
      )}
      {hints.offeredWeeklyRentAud != null ? (
        <div className="mt-3">
          <TenantInviteOfferBanner
            offeredWeeklyRentAud={hints.offeredWeeklyRentAud}
            offerReason={hints.offerReason}
            compact
          />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-gray-500">
        Already have a Quni account?{' '}
        <Link to={loginHref} className="font-medium text-[var(--quni-trust)] hover:text-[var(--quni-trust-hover)]">
          Log in
        </Link>{' '}
        to continue to the booking.
      </p>
    </div>
  )
}
