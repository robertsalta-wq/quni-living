import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { AuthProfile, UserRole } from '../lib/authProfile'
import { openConversation } from '../lib/messaging/conversationsApi'
import { useState } from 'react'

type Props = {
  propertyId: string
  landlordId: string | null
  propertyTitle: string
  user: User | null
  profile: AuthProfile | null
  role: UserRole
  onSuccess?: () => void
  showIntro?: boolean
}

/**
 * @deprecated Legacy enquiry form — frozen at peer messaging cutover.
 * Renders sign-in / open-messages CTAs only (no `enquiries` insert or enquiry-email).
 */
export default function PropertyEnquiryForm({
  propertyId,
  propertyTitle,
  user,
  role,
  onSuccess,
  showIntro = true,
}: Props) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canMessage = Boolean(user) && role === 'student'
  const listingPath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : `/properties/${propertyId}`
  const encodedRedirect = encodeURIComponent(listingPath)

  async function openThread() {
    setError(null)
    setOpening(true)
    try {
      const { conversationId } = await openConversation(propertyId)
      onSuccess?.()
      window.location.assign(`/messages/${conversationId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open messages')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="space-y-4">
      {showIntro && (
        <>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Message the host</h2>
          <p className="text-xs text-gray-500 -mt-2">
            Ask about <span className="font-medium text-gray-700">{propertyTitle}</span> in your Messages inbox.
          </p>
        </>
      )}

      {canMessage ? (
        <>
          <p className="text-sm text-gray-600">
            Enquiry forms are retired. Use Messages to chat with the landlord before you book.
          </p>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
          )}
          <button
            type="button"
            disabled={opening}
            onClick={() => void openThread()}
            className="w-full rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {opening ? 'Opening…' : 'Open messages'}
          </button>
          <Link to="/messages" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Go to inbox
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Sign in to message the landlord about this listing.</p>
          <Link
            to={`/login?redirect=${encodedRedirect}`}
            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700"
          >
            Sign in to message
          </Link>
        </>
      )}
    </div>
  )
}
