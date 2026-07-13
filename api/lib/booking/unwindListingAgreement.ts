import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '../../../src/lib/database.types.js'
import { archiveDocusealSubmission } from '../docusealArchive.js'
import { stripDocusealEmbedSrcFromMetadata } from './listingAgreementMetadata.js'
import { setListingAgreementStatus } from './listingAgreementStatus.js'

const TENANCY_DOC_TYPES = ['residential_tenancy', 'lease'] as const

export type UnwindListingAgreementContext = {
  bookingId: string
  propertyId?: string | null
  landlordId?: string | null
  studentId?: string | null
  serviceTier?: string | null
  unwindReason: 'cancelled' | 'expired' | 'regenerate'
}

async function emitDocusealArchiveAnomaly(
  admin: SupabaseClient,
  ctx: UnwindListingAgreementContext,
  submissionId: string,
  error: string,
  status?: number,
): Promise<void> {
  try {
    const { emitDocumentArchiveFailed } = await import('./events/emitDocusealDocumentEvents.js')
    await emitDocumentArchiveFailed(admin, {
      bookingId: ctx.bookingId,
      landlordId: ctx.landlordId,
      studentId: ctx.studentId,
      submissionId,
      error,
      httpStatus: status,
      unwindReason: ctx.unwindReason,
      actorType: 'system',
    })
  } catch (evErr) {
    console.error('[unwind-listing-agreement] document.archive_failed telemetry', evErr)
  }
}

/**
 * Best-effort remote archive for one submission id. Never throws.
 */
export async function tryArchiveDocusealSubmissionBestEffort(
  admin: SupabaseClient,
  submissionId: string | null | undefined,
  ctx: UnwindListingAgreementContext,
): Promise<void> {
  const id = typeof submissionId === 'string' ? submissionId.trim() : ''
  if (!id) return

  const result = await archiveDocusealSubmission(id)
  if (result.ok) return

  console.error('[unwind-listing-agreement] DocuSeal archive failed', {
    bookingId: ctx.bookingId,
    submissionId: id,
    status: result.status,
    message: result.message,
  })
  await emitDocusealArchiveAnomaly(admin, ctx, id, result.message, result.status)
}

/**
 * After a Listing booking unwind (cancel / bond-window expiry): archive DocuSeal
 * submissions when present, then local cleanup (void agreement, archive docs, end tenancy).
 * Best-effort throughout — never throws and never rolls back the booking transition.
 */
export async function runUnwindListingAgreementCleanup(
  admin: SupabaseClient,
  ctx: UnwindListingAgreementContext,
): Promise<void> {
  try {
    const { data: tenancy, error: tErr } = await admin
      .from('tenancies')
      .select('id, status')
      .eq('booking_id', ctx.bookingId)
      .maybeSingle()

    if (tErr) {
      console.error('[unwind-listing-agreement] tenancy load', tErr)
      return
    }

    if (tenancy?.id) {
      const { data: docs, error: dErr } = await admin
        .from('tenancy_documents')
        .select('id, status, metadata, document_type, docuseal_submission_id')
        .eq('tenancy_id', tenancy.id)
        .in('document_type', [...TENANCY_DOC_TYPES])

      if (dErr) {
        console.error('[unwind-listing-agreement] documents load', dErr)
      } else {
        for (const doc of docs ?? []) {
          const submissionId =
            typeof doc.docuseal_submission_id === 'string' ? doc.docuseal_submission_id.trim() : ''
          if (submissionId) {
            await tryArchiveDocusealSubmissionBestEffort(admin, submissionId, ctx)
          }

          const nextMeta = stripDocusealEmbedSrcFromMetadata(doc.metadata)
          const { error: docUpErr } = await admin
            .from('tenancy_documents')
            .update({
              status: 'archived',
              metadata: nextMeta as Json,
            })
            .eq('id', doc.id)

          if (docUpErr) {
            console.error('[unwind-listing-agreement] document archive update', doc.id, docUpErr)
          } else if (ctx.unwindReason !== 'regenerate') {
            try {
              const { emitDocumentVoided } = await import('./events/emitDocusealDocumentEvents.js')
              await emitDocumentVoided(admin, {
                bookingId: ctx.bookingId,
                landlordId: ctx.landlordId,
                studentId: ctx.studentId,
                documentId: doc.id,
                submissionId: submissionId || null,
                reason: ctx.unwindReason,
                actorType: 'system',
              })
            } catch (evErr) {
              console.error('[unwind-listing-agreement] document.voided', doc.id, evErr)
            }
          }
        }
      }

      if (tenancy.status === 'active') {
        const { error: tenancyUpErr } = await admin
          .from('tenancies')
          .update({ status: 'ended' })
          .eq('id', tenancy.id)
          .eq('status', 'active')

        if (tenancyUpErr) {
          console.error('[unwind-listing-agreement] tenancy end', tenancyUpErr)
        }
      }
    }

    if (ctx.unwindReason !== 'regenerate') {
      await setListingAgreementStatus(admin, ctx.bookingId, 'voided', null)
    }
  } catch (e) {
    console.error('[unwind-listing-agreement] unexpected', ctx.bookingId, e)
  }
}
