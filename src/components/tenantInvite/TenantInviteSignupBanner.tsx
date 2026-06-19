import { Link } from 'react-router-dom'
import type { TenantInviteSignupHints } from '../../lib/tenantInviteSignupContext'

type Props = {
  hints: TenantInviteSignupHints
  loginHref: string
}

export default function TenantInviteSignupBanner({ hints, loginHref }: Props) {
  if (!hints.isTenantInviteFlow) return null

  const greeting = hints.invitedName ? `Hi ${hints.invitedName.split(/\s+/)[0]}, ` : ''

  return (
    <div className="mb-8 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white p-5 sm:p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Landlord invitation</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900 leading-snug">
        {greeting}you&apos;re invited to book on Quni
      </h2>
      {hints.propertyTitle ? (
        <p className="mt-2 text-sm text-gray-700">
          Your landlord shared a link for{' '}
          <span className="font-medium text-gray-900">{hints.propertyTitle}</span>. Create a renter account to
          verify and complete the booking on-platform — same process as any other tenant on Quni.
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-700">
          Your landlord shared a private booking link. Create a renter account to verify and complete the booking
          on-platform.
        </p>
      )}
      {hints.studentOnly && (
        <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-gray-700">
          This room is for students only — you&apos;ll need to verify as a student during onboarding.
        </p>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Already have a Quni account?{' '}
        <Link to={loginHref} className="font-medium text-indigo-600 hover:text-indigo-800">
          Log in
        </Link>{' '}
        to continue to the booking.
      </p>
    </div>
  )
}
