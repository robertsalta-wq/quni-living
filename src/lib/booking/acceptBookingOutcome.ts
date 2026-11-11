import { formatUserFacingRequestError, isBrowserNetworkFailure } from '../supabaseErrorMessage'

export const ACCEPT_NETWORK_RETRY_MESSAGE =
  "That didn't go through. Check your connection and try again."

export const ACCEPT_UNKNOWN_MESSAGE =
  'We lost the connection. Refresh this page before trying again.'

export function bookingStatusMeansAccepted(status: string | null | undefined): boolean {
  return status === 'bond_pending' || status === 'confirmed' || status === 'active'
}

/**
 * After the accept request throws. A lost connection refetches the booking first.
 * The raw browser message (for example "Load failed") is never returned.
 */
export function acceptFailureOutcome(args: {
  error: unknown
  refetchedStatus: string | null
  refetchFailed: boolean
}): { kind: 'accepted' } | { kind: 'message'; message: string } {
  if (isBrowserNetworkFailure(args.error)) {
    if (bookingStatusMeansAccepted(args.refetchedStatus)) return { kind: 'accepted' }
    if (args.refetchFailed || args.refetchedStatus == null) {
      return { kind: 'message', message: ACCEPT_UNKNOWN_MESSAGE }
    }
    return { kind: 'message', message: ACCEPT_NETWORK_RETRY_MESSAGE }
  }
  return {
    kind: 'message',
    message: formatUserFacingRequestError(args.error, 'Could not accept this booking. Try again.'),
  }
}
