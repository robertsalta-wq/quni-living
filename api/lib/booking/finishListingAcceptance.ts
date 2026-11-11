import type { SupabaseClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import type { Database } from '../../../src/lib/database.types.js'
import type { BookingEventDeviceContext } from './events/recordBookingEvent.js'
import { listingEmailAttemptExists } from './listingEmailAttempt.js'
import { setListingAgreementStatus } from './listingAgreementStatus.js'
import {
  sendListingAgreementReadyEmails,
  sendListingBookingAcceptedEmails,
} from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'

/** Written into listing_agreement_error while one worker owns the finish. Not a new column. */
export const ACCEPT_FINISH_CLAIM_PREFIX = 'accept-finish:'

/** Longer than confirm-booking maxDuration (60s) so a live worker is not started twice. */
export const ACCEPT_FINISH_CLAIM_TTL_MS = 90_000

const AGREEMENT_DOC_TYPES = ['residential_tenancy', 'lease'] as const

export type ListingAcceptanceSnapshot = {
  agreementStatus: string | null
  submissionId: string | null
  claim: string | null
  acceptanceEmailAttempted: boolean
  agreementReadyEmailAttempted: boolean
}

export type ListingAcceptanceStore = {
  read: () => Promise<ListingAcceptanceSnapshot>
  /** Compare-and-swap the previous claim. False when another worker owns it. */
  claim: (previousClaim: string | null) => Promise<boolean>
  markReady: () => Promise<void>
  markFailed: (message: string) => Promise<void>
  generate: () => Promise<{ ok: true; submissionId: string | null } | { ok: false; error: string }>
  sendAcceptanceEmails: () => Promise<void>
  sendAgreementReadyEmails: () => Promise<void>
}

export type FinishListingAcceptanceResult = {
  outcome: 'ready' | 'failed' | 'busy' | 'done'
  createdSubmission: boolean
}

export function parseAcceptFinishClaim(value: string | null | undefined): number | null {
  if (!value?.startsWith(ACCEPT_FINISH_CLAIM_PREFIX)) return null
  const ts = Number(value.slice(ACCEPT_FINISH_CLAIM_PREFIX.length))
  return Number.isFinite(ts) ? ts : null
}

export function acceptFinishClaimIsFresh(
  value: string | null | undefined,
  now: number,
  ttlMs = ACCEPT_FINISH_CLAIM_TTL_MS,
): boolean {
  const ts = parseAcceptFinishClaim(value)
  if (ts == null) return false
  return now - ts >= 0 && now - ts < ttlMs
}

/** Ready or voided with a submission needs nothing. A live claim means another worker is in it. */
export function decideListingAcceptance(
  snapshot: ListingAcceptanceSnapshot,
  now: number,
): 'done' | 'busy' | 'run' {
  if (snapshot.agreementStatus === 'voided' || snapshot.agreementStatus === 'ready') return 'done'
  if (acceptFinishClaimIsFresh(snapshot.claim, now)) return 'busy'
  return 'run'
}

export function listingAgreementFinishPending(status: string | null | undefined): boolean {
  return status !== 'ready' && status !== 'voided'
}

/**
 * One DocuSeal submission and one pass of the accept emails.
 * A second call that finds the submission does not generate again.
 */
export async function executeListingAcceptance(
  store: ListingAcceptanceStore,
  now = Date.now(),
): Promise<FinishListingAcceptanceResult> {
  const before = await store.read()
  const decision = decideListingAcceptance(before, now)
  if (decision === 'done') return { outcome: 'done', createdSubmission: false }
  if (decision === 'busy') return { outcome: 'busy', createdSubmission: false }

  const claimed = await store.claim(before.claim)
  if (!claimed) {
    const again = await store.read()
    if (again.agreementStatus === 'ready' && again.submissionId) {
      return { outcome: 'done', createdSubmission: false }
    }
    return { outcome: 'busy', createdSubmission: false }
  }

  let createdSubmission = false
  try {
    if (!before.submissionId) {
      const gen = await store.generate()
      if (!gen.ok) {
        await store.markFailed(gen.error)
        if (!before.acceptanceEmailAttempted) {
          try {
            await store.sendAcceptanceEmails()
          } catch (emailErr) {
            console.error('[listing-accept] acceptance emails after failed agreement', emailErr)
          }
        }
        return { outcome: 'failed', createdSubmission: false }
      }
      createdSubmission = true
    }

    if (!before.agreementReadyEmailAttempted && (before.submissionId || createdSubmission)) {
      try {
        await store.sendAgreementReadyEmails()
      } catch (emailErr) {
        console.error('[listing-accept] agreement-ready emails', emailErr)
      }
    }
    if (!before.acceptanceEmailAttempted) {
      try {
        await store.sendAcceptanceEmails()
      } catch (emailErr) {
        console.error('[listing-accept] acceptance emails', emailErr)
      }
    }
    await store.markReady()
    return { outcome: 'ready', createdSubmission }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    try {
      await store.markFailed(message)
    } catch (markErr) {
      console.error('[listing-accept] mark failed', markErr)
    }
    return { outcome: 'failed', createdSubmission }
  }
}

type Admin = SupabaseClient<Database>

async function readSnapshot(admin: Admin, bookingId: string): Promise<ListingAcceptanceSnapshot> {
  const { data: booking, error } = await admin
    .from('bookings')
    .select('listing_agreement_status, listing_agreement_error')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) throw error

  const { data: tenancy, error: tenancyErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()
  if (tenancyErr) throw tenancyErr

  let submissionId: string | null = null
  if (tenancy?.id) {
    const { data: docs, error: docErr } = await admin
      .from('tenancy_documents')
      .select('docuseal_submission_id, document_type')
      .eq('tenancy_id', tenancy.id)
      .in('document_type', [...AGREEMENT_DOC_TYPES])
    if (docErr) throw docErr
    const withSubmission = (docs ?? []).find((row) => {
      const id = row.docuseal_submission_id
      return typeof id === 'string' && id.trim().length > 0
    })
    submissionId =
      typeof withSubmission?.docuseal_submission_id === 'string'
        ? withSubmission.docuseal_submission_id
        : null
  }

  const [acceptanceEmailAttempted, agreementReadyEmailAttempted] = await Promise.all([
    listingEmailAttemptExists(admin, bookingId, 'listing_booking_accepted_renter'),
    listingEmailAttemptExists(admin, bookingId, 'listing_agreement_ready_renter'),
  ])

  return {
    agreementStatus: booking?.listing_agreement_status ?? null,
    submissionId,
    claim: booking?.listing_agreement_error ?? null,
    acceptanceEmailAttempted,
    agreementReadyEmailAttempted,
  }
}

async function casClaim(
  admin: Admin,
  bookingId: string,
  previousClaim: string | null,
  now: number,
): Promise<boolean> {
  const claim = `${ACCEPT_FINISH_CLAIM_PREFIX}${now}`
  let query = admin
    .from('bookings')
    .update({
      listing_agreement_status: 'pending',
      listing_agreement_error: claim,
    })
    .eq('id', bookingId)
    .or('listing_agreement_status.eq.pending,listing_agreement_status.eq.failed,listing_agreement_status.is.null')

  query = previousClaim == null ? query.is('listing_agreement_error', null) : query.eq('listing_agreement_error', previousClaim)

  const { data, error } = await query.select('id')
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}

export async function runFinishListingAcceptance(
  admin: Admin,
  args: {
    bookingId: string
    deviceCtx?: BookingEventDeviceContext | null
    now?: number
  },
): Promise<FinishListingAcceptanceResult> {
  const bookingId = args.bookingId.trim()
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, status, service_tier_final, bond_window_expires_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) throw error
  if (!booking) return { outcome: 'done', createdSubmission: false }
  if (booking.service_tier_final && booking.service_tier_final !== 'listing') {
    return { outcome: 'done', createdSubmission: false }
  }
  if (booking.status !== 'bond_pending' && booking.status !== 'confirmed' && booking.status !== 'active') {
    return { outcome: 'done', createdSubmission: false }
  }

  const bondWindow =
    typeof booking.bond_window_expires_at === 'string' && booking.bond_window_expires_at.trim()
      ? booking.bond_window_expires_at
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const store: ListingAcceptanceStore = {
    read: () => readSnapshot(admin, bookingId),
    claim: (previousClaim) => casClaim(admin, bookingId, previousClaim, args.now ?? Date.now()),
    markReady: () => setListingAgreementStatus(admin, bookingId, 'ready', null),
    markFailed: (message) => setListingAgreementStatus(admin, bookingId, 'failed', message),
    generate: async () => {
      const gen = await triggerListingDocumentGeneration({
        admin,
        bookingId,
        deferSigning: false,
      })
      if (!gen.ok) {
        return { ok: false, error: [gen.error, gen.detail].filter(Boolean).join(': ') }
      }
      if (gen.skipped) {
        return { ok: false, error: `Skipped: ${gen.reason ?? 'unknown'}` }
      }
      const submissionId = gen.docusealSubmissionId ?? null
      if (!submissionId && !gen.documentId) {
        return { ok: false, error: 'Agreement PDF created but signing was not dispatched' }
      }
      return { ok: true, submissionId }
    },
    sendAcceptanceEmails: () =>
      sendListingBookingAcceptedEmails(admin, bookingId, {
        bond_window_expires_at: bondWindow,
        deviceCtx: args.deviceCtx ?? null,
      }),
    sendAgreementReadyEmails: () => sendListingAgreementReadyEmails(admin, bookingId),
  }

  return executeListingAcceptance(store, args.now ?? Date.now())
}

/**
 * Registers the finish on the Vercel invocation so the HTTP response can return first.
 * waitUntil is from @vercel/functions, which this app already uses on the Node runtime.
 * The work still shares this function's maxDuration. If the invocation dies, the booking
 * review page (and the renter's agreement panel) calls the finish endpoint on load.
 */
export function scheduleListingAcceptanceFinish(
  start: () => Promise<unknown>,
  waitUntilFn: (promise: Promise<unknown>) => void = waitUntil,
): void {
  const work = Promise.resolve()
    .then(start)
    .catch((err) => {
      console.error('[listing-accept] background finish', err)
    })
  try {
    waitUntilFn(work)
  } catch (err) {
    console.error('[listing-accept] waitUntil unavailable', err)
  }
}
