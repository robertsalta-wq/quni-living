import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { landlordDashboardProfilePath } from '../../lib/landlordDashboardProfilePaths'

type AccountDeskProps = {
  className?: string
  mobileRail?: boolean
  railExpanded?: boolean
  onRailExpandChange?: (open: boolean) => void
  trayOpen?: boolean
  onTrayOpenChange?: (open: boolean) => void
}

export default function AccountDesk({
  className = '',
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  trayOpen,
  onTrayOpenChange,
}: AccountDeskProps) {
  const { user, profile, role } = useAuthContext()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const panelId = useId()
  const open = trayOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (onTrayOpenChange) onTrayOpenChange(next)
    else setUncontrolledOpen(next)
  }
  const loggedIn = Boolean(user)
  const rawName =
    profile && 'full_name' in profile && typeof profile.full_name === 'string'
      ? profile.full_name.trim()
      : ''
  const name = rawName.split(/\s+/)[0] || user?.email?.split('@')[0] || 'there'
  const dashboardTo =
    role === 'landlord' || role === 'admin'
      ? landlordDashboardProfilePath()
      : '/student-dashboard'

  const body = loggedIn ? (
    <>
      <p className="m-0 text-[15px] font-semibold text-[var(--quni-ink)]">Welcome back, {name}.</p>
      <Link
        to={dashboardTo}
        className="w-fit text-[13px] font-semibold text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
      >
        Your dashboard →
      </Link>
    </>
  ) : (
    <>
      <div className="flex flex-col gap-0.5">
        <p className="m-0 text-[12.5px] leading-snug text-[var(--quni-ink-3)]">
          <span className="font-semibold text-[var(--quni-ink)]">Renters</span> — saved places,
          enquiries & bookings.
        </p>
        <p className="m-0 text-[12.5px] leading-snug text-[var(--quni-ink-3)]">
          <span className="font-semibold text-[var(--quni-ink)]">Landlords</span> — your listings &
          payouts.
        </p>
      </div>
      <Link
        to="/login"
        className="mt-0.5 inline-flex w-fit rounded-[10px] border border-[var(--quni-line)] bg-white px-4 py-1.5 text-[12.5px] font-semibold text-[var(--quni-ink)] hover:border-[var(--quni-coral-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
      >
        Log in
      </Link>
    </>
  )

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-settle overflow-hidden rounded-[14px] border border-[var(--quni-line)] bg-white shadow-[var(--shadow-1)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          aria-expanded={railExpanded}
          onClick={() => onRailExpandChange?.(!railExpanded)}
          className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
            Account
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--quni-ink)]">
            {loggedIn ? `Hi, ${name}` : 'Renters & landlords'}
          </span>
          <span aria-hidden>{railExpanded ? '⊖' : '⊕'}</span>
        </button>
        {railExpanded ? <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">{body}</div> : null}
      </article>
    )
  }

  return (
    <article
      className={[
        'desk-shell desk-settle flex min-h-0 w-full flex-col overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[var(--quni-line)] bg-white shadow-[var(--shadow-1)]',
        'transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--shadow-2)] [animation-delay:450ms]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
          Account — renters & landlords
        </span>
        {body}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="w-fit rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--quni-ink-3)] hover:bg-[var(--quni-surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        >
          {open ? '⊖ Close' : '⊕ When you’re signed in'}
        </button>
        {open ? (
          <div id={panelId} className="mt-0.5 border-t border-[var(--quni-line)] pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
              {loggedIn ? 'Your next step' : 'What you’ll find'}
            </span>
            <p className="m-0 text-[12.5px] leading-snug text-[var(--quni-ink-3)]">
              {loggedIn
                ? 'Messages, bookings, and profile live in your dashboard — same account on every device.'
                : 'Sign in to save places, enquire, and manage bookings or listings. Sign up is free for renters.'}
            </p>
            <Link
              to={loggedIn ? dashboardTo : '/signup'}
              className="text-[12px] font-semibold text-[var(--quni-ink-3)] hover:text-[var(--quni-ink)]"
            >
              {loggedIn ? 'Open dashboard →' : 'Create an account →'}
            </Link>
          </div>
        ) : null}
        <span className="mt-auto" />
      </div>
    </article>
  )
}
