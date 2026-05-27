import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AiSparkleIcon from '../AiSparkleIcon'
import type { PersonaKey } from '../../lib/aiChat/chatTypes'

export const ASK_AI_BUTTON_LABEL = 'Ask AI'
export const ASK_AI_STREAMING_LABEL = 'Answering…'

type Props = {
  personaKey: PersonaKey
  /** Listings embed or property embed with listing IDs. */
  hasListingContext?: boolean
  compact?: boolean
  loginRedirect?: string
}

function titleForPersona(personaKey: PersonaKey): string {
  if (personaKey === 'landlord') return 'AI for landlords'
  if (personaKey === 'student_renter') return 'AI for renters'
  return 'Quni AI'
}

function hintForPersona(personaKey: PersonaKey, hasListingContext: boolean): ReactNode {
  const notLandlordNote = (
    <span className="block text-gray-500">Automated assistant — not a message to a landlord.</span>
  )

  if (personaKey === 'student_renter') {
    return (
      <>
        {notLandlordNote}
        <span className="block text-gray-500">
          {hasListingContext
            ? 'Answers use the listings on this page.'
            : 'Ask about listings, suburbs, or how Quni works.'}
        </span>
      </>
    )
  }

  if (personaKey === 'landlord') {
    return <span className="block text-gray-500">Automated assistant for your listings and enquiries.</span>
  }

  // visitor — works without account
  if (hasListingContext) {
    return (
      <>
        {notLandlordNote}
        <span className="block text-gray-500">
          General Quni help works without signing in.{' '}
          <span className="font-medium text-gray-600">Sign in as a student</span> for answers about these listings.
        </span>
      </>
    )
  }

  return (
    <>
      {notLandlordNote}
      <span className="block text-gray-500">Works without signing in. Sign in for personalised listing help.</span>
    </>
  )
}

export default function ChatAiChrome({ personaKey, hasListingContext = false, compact, loginRedirect }: Props) {
  const title = titleForPersona(personaKey)
  const showSignInLink = personaKey === 'visitor' && hasListingContext && loginRedirect

  return (
    <div
      className={[
        'flex shrink-0 items-start gap-2.5 border-b border-gray-100 bg-[#FFF8F0]/60',
        compact ? 'px-3 py-2' : 'px-4 py-3',
      ].join(' ')}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FF6F61]/25 bg-[#FF6F61]/10 text-[#FF6F61]"
        aria-hidden
      >
        <AiSparkleIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <img
            src="/quni-logo-ai-purple.png"
            srcSet="/quni-logo-ai-purple.png 1x, /quni-logo-ai-purple@2x.png 2x"
            alt=""
            width={56}
            height={20}
            className="h-5 w-auto object-contain opacity-90"
            aria-hidden
          />
        </div>
        <div className="mt-0.5 text-xs leading-relaxed">{hintForPersona(personaKey, hasListingContext)}</div>
        {showSignInLink ? (
          <Link
            to={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
            className="mt-1 inline-block text-xs font-semibold text-[#CC4A3C] hover:text-[#FF6F61] underline underline-offset-2"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </div>
  )
}
