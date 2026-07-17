import { useCallback, useEffect, useState } from 'react'
import {
  cancelReinstatement,
  confirmReinstatement,
  declineReinstatement,
  getReinstatement,
  ReinstatementApiError,
  requestReinstatement,
  type ReinstatementState,
} from '../../lib/booking/reinstatementApi'
import { bookingReviewGhostButtonClass, bookingReviewPrimaryButtonClass } from './review'

type Props = {
  bookingId: string
  bookingStatus: string
  onChanged?: () => void
}

type Action = 'request' | 'confirm' | 'decline' | 'cancel' | null

function formatGraceRemaining(ms: number | null): string | null {
  if (ms == null || ms <= 0) return null
  const totalHours = Math.ceil(ms / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours}h` : ''} remaining`
  return `${Math.max(1, hours)}h remaining`
}

function stateMessage(state: ReinstatementState): string | null {
  if (state.request?.status === 'blocked_unavailable' || state.eligibilityCode === 'blocked_unavailable') {
    return 'The room was taken while this reinstatement was pending. This booking cannot be reinstated.'
  }
  if (state.eligibilityCode === 'grace_elapsed' || state.request?.status === 'window_expired') {
    return 'The self-serve reinstatement window has closed. Contact support if you need help.'
  }
  if (!state.eligible && state.eligibilityCode === 'not_listing') {
    return 'Self-serve reinstatement is available only for Quni Listing bookings.'
  }
  return null
}

function errorMessage(error: unknown): string {
  if (error instanceof ReinstatementApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.'
    if (error.status === 403) return 'You do not have permission to change this reinstatement request.'
    if (error.code === 'blocked_unavailable') {
      return 'The room was taken while this reinstatement was pending. This booking cannot be reinstated.'
    }
    if (error.code === 'signing_resend_failed') {
      return 'The booking was reinstated, but we could not resend signing links. Please contact support.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export default function BookingReinstatementPanel({ bookingId, bookingStatus, onChanged }: Props) {
  const [state, setState] = useState<ReinstatementState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setState(await getReinstatement(bookingId))
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void load()
  }, [load, bookingStatus])

  const runAction = useCallback(
    async (action: Exclude<Action, null>) => {
      const requestId = state?.request?.id
      setBusy(action)
      setError(null)
      setNotice(null)
      try {
        if (action === 'request') {
          await requestReinstatement(
            bookingId,
            state?.viewerRole === 'landlord' ? 'reinstate_free_flagged' : undefined,
          )
          setNotice('Reinstatement requested. We’re waiting for the other party to respond.')
        } else if (!requestId) {
          throw new Error('Reinstatement request not found. Refresh and try again.')
        } else if (action === 'confirm') {
          const result = await confirmReinstatement(
            requestId,
            state?.viewerRole === 'landlord' ? 'reinstate_free_flagged' : undefined,
          )
          if (result.signing_resend_failed) {
            setNotice('Booking reinstated, but we could not resend signing links. Please contact support.')
          } else {
            setNotice(
              result.signing_needs_resend
                ? 'Booking reinstated. New signing links have been sent.'
                : 'Booking reinstated.',
            )
          }
        } else if (action === 'decline') {
          await declineReinstatement(requestId)
          setNotice('Reinstatement request declined.')
        } else {
          await cancelReinstatement(requestId)
          setNotice('Reinstatement request cancelled.')
        }
        await load()
        onChanged?.()
      } catch (caught) {
        setError(errorMessage(caught))
      } finally {
        setBusy(null)
      }
    },
    [bookingId, load, onChanged, state?.request?.id, state?.viewerRole],
  )

  if (loading) return <p className="text-sm text-admin-ink-4">Checking reinstatement options…</p>
  if (!state) return error ? <p className="text-sm text-admin-danger-fg">{error}</p> : null

  const pending = state.request?.status === 'pending_confirmation'
  const graceLabel = formatGraceRemaining(state.graceRemainingMs)
  const message = error ?? stateMessage(state)

  return (
    <div className="space-y-3">
      {message ? (
        <p className="rounded-admin-sm border border-admin-danger/30 bg-admin-danger-bg px-3 py-2.5 text-sm text-admin-danger-fg" role="alert">
          {message}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-admin-sm border border-admin-line bg-admin-surface-2 px-3 py-2.5 text-sm text-admin-ink-2" role="status">
          {notice}
        </p>
      ) : null}

      {state.eligible && !stateMessage(state) ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runAction('request')}
            className={bookingReviewPrimaryButtonClass()}
          >
            {busy === 'request' ? 'Requesting…' : 'Request reinstatement'}
          </button>
          {graceLabel ? <p className="px-0.5 text-xs leading-relaxed text-admin-ink-5">{graceLabel}</p> : null}
        </div>
      ) : null}

      {pending && state.canConfirm ? (
        <div className="space-y-2.5">
          {state.viewerRole === 'landlord' ? (
            <p className="text-xs leading-relaxed text-admin-ink-4">
              Listing fee was refunded when this booking expired. Confirming reinstates without
              re-charging — payment will be reconciled separately.
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-admin-ink-4">
            Confirming moves this booking to bond pending. It does not reserve the property until bond is marked received;
            signing will be re-sent if needed.
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runAction('confirm')}
            className={bookingReviewPrimaryButtonClass()}
          >
            {busy === 'confirm' ? 'Confirming…' : 'Confirm reinstatement'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runAction('decline')}
            className={bookingReviewGhostButtonClass()}
          >
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </div>
      ) : null}

      {pending && state.canCancel ? (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-admin-ink-4">
            Waiting for the other party to confirm this reinstatement request.
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runAction('cancel')}
            className={bookingReviewGhostButtonClass()}
          >
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel request'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
