// @ts-nocheck - Vercel isolated API TS pass; mirrors listing occupancy generators.
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import { MutualTerminationAcknowledgment } from '../../../../src/lib/documents/MutualTerminationAcknowledgment.js'
import { createDocusealSubmissionFromPdf } from '../../docuseal.shared.js'
import { wrapSubmissionSubmitters } from '../../docuseal/signLinkWrap.js'
import { assertStudentLegalNameForSigning } from '../assertStudentLegalNameForSigning.js'
import {
  legacyStudentNameFromProfile,
  tenantLegalNameForDocuments,
} from '../tenantLegalNameForDocuments.js'
import type { BondOutcome } from './types.js'

function bondOutcomeLabel(outcome: BondOutcome | null | undefined, newPremises: string | null): string {
  switch (outcome) {
    case 'refunded':
      return 'refunded to the Tenant'
    case 'transferred':
      return newPremises
        ? `transferred/carried over to the Tenant's new tenancy of ${newPremises} via Rental Bonds Online`
        : "transferred/carried over to the Tenant's new tenancy via Rental Bonds Online"
    case 'retained_by_agreement':
      return 'retained by agreement (as documented between the parties)'
    case 'never_lodged':
      return 'no bond was lodged with Rental Bonds Online for this tenancy (never lodged)'
    case 'na':
      return 'not applicable'
    case 'pending':
    default:
      return 'to be confirmed between the parties and recorded on the platform bond-outcome checklist'
  }
}

export type GenerateMutualTerminationResult =
  | { ok: true; documentId: string; submissionId: string | null }
  | { ok: false; status: number; code: string; message: string }

export async function generateAndSendMutualTerminationDoc(args: {
  admin: SupabaseClient<Database>
  bookingId: string
  terminationEffectiveDate: string
  bondOutcome: BondOutcome | null
  bondOutcomeNote?: string | null
  newPremisesLine?: string | null
  continueInSamePremises?: boolean
}): Promise<GenerateMutualTerminationResult> {
  const { admin, bookingId, terminationEffectiveDate, bondOutcome } = args
  const continueInSamePremises = Boolean(args.continueInSamePremises)
  const newPremisesLine =
    typeof args.newPremisesLine === 'string' && args.newPremisesLine.trim()
      ? args.newPremisesLine.trim()
      : null

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id, landlord_id, student_id, property_id, start_date, move_in_date, confirmed_at, created_at,
      properties ( address, suburb, state, postcode )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  }

  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (tErr || !tenancy?.id) {
    return {
      ok: false,
      status: 409,
      code: 'no_tenancy',
      message: 'No tenancy record for this booking. Cannot generate mutual termination.',
    }
  }

  const { data: lp, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('full_name, first_name, last_name, email, user_id')
    .eq('id', booking.landlord_id!)
    .maybeSingle()

  const { data: sp, error: spErr } = await admin
    .from('student_profiles')
    .select('full_name, first_name, last_name, email, verification_type, legal_name_locked_at')
    .eq('id', booking.student_id!)
    .maybeSingle()

  if (lpErr || spErr || !lp || !sp) {
    return { ok: false, status: 500, code: 'profile_error', message: 'Could not load party profiles.' }
  }

  try {
    await assertStudentLegalNameForSigning(admin, sp)
  } catch (e) {
    return {
      ok: false,
      status: 409,
      code: 'legal_name',
      message: e instanceof Error ? e.message : 'Tenant legal name not ready for signing.',
    }
  }

  const landlordName =
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name.trim() : '') ||
    'Landlord'
  const tenantName = tenantLegalNameForDocuments(sp, 'Tenant')
  const prop = booking.properties as {
    address?: string | null
    suburb?: string | null
    state?: string | null
    postcode?: string | null
  } | null
  const premisesLine = [prop?.address, prop?.suburb, prop?.state, prop?.postcode]
    .filter(Boolean)
    .join(', ')

  const agreementCommenced =
    (typeof booking.move_in_date === 'string' && booking.move_in_date) ||
    (typeof booking.start_date === 'string' && booking.start_date) ||
    'as per agreement'
  const agreementDated =
    (typeof booking.confirmed_at === 'string' && booking.confirmed_at.slice(0, 10)) ||
    (typeof booking.created_at === 'string' && booking.created_at.slice(0, 10)) ||
    agreementCommenced

  const { data: existing } = await admin
    .from('tenancy_documents')
    .select('id, status, docuseal_submission_id')
    .eq('tenancy_id', tenancy.id)
    .eq('document_type', 'mutual_termination')
    .maybeSingle()

  if (existing?.status === 'signed') {
    return { ok: true, documentId: existing.id, submissionId: existing.docuseal_submission_id }
  }

  let documentId = existing?.id
  if (!documentId) {
    const { data: ins, error: insErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancy.id,
        document_type: 'mutual_termination',
        status: 'draft',
        generated_by: typeof lp.user_id === 'string' ? lp.user_id : null,
        metadata: { kind: 'mutual_surrender' } as Json,
      })
      .select('id')
      .single()
    if (insErr || !ins) {
      console.error('[mutual-termination] insert doc', insErr)
      return { ok: false, status: 500, code: 'doc_insert', message: 'Could not create document row.' }
    }
    documentId = ins.id
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(MutualTerminationAcknowledgment, {
        landlordName,
        tenantName,
        premisesLine: premisesLine || 'the Premises',
        agreementDated,
        agreementCommenced,
        terminationDate: terminationEffectiveDate,
        bondOutcomeLabel: bondOutcomeLabel(bondOutcome, newPremisesLine),
        newPremisesLine,
        continueInSamePremises,
        draftBanner: true,
      }),
    )
  } catch (e) {
    console.error('[mutual-termination] pdf', e)
    return { ok: false, status: 500, code: 'pdf_failed', message: 'Could not build PDF.' }
  }

  const storagePath = `${tenancy.id}/mutual_termination/mutual_termination_draft.pdf`
  const { error: upErr } = await admin.storage
    .from('tenancy-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    console.error('[mutual-termination] upload', upErr)
    return { ok: false, status: 500, code: 'upload_failed', message: 'Could not upload PDF.' }
  }

  await admin
    .from('tenancy_documents')
    .update({
      file_path: storagePath,
      status: 'draft',
      metadata: {
        kind: 'mutual_surrender',
        bond_outcome: bondOutcome,
        bond_outcome_note: args.bondOutcomeNote ?? null,
        continue_in_same_premises: continueInSamePremises,
      } as Json,
    })
    .eq('id', documentId)

  const hasDocuseal =
    (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()

  if (!hasDocuseal) {
    return { ok: true, documentId, submissionId: null }
  }

  const landlordEmail = typeof lp.email === 'string' ? lp.email.trim() : ''
  const tenantEmail = typeof sp.email === 'string' ? sp.email.trim() : ''
  if (!landlordEmail || !tenantEmail) {
    return { ok: false, status: 409, code: 'missing_email', message: 'Landlord or tenant email missing.' }
  }

  try {
    const pdfBase64 = pdfBuffer.toString('base64')
    const submissionRaw = await createDocusealSubmissionFromPdf({
      name: `Mutual termination - ${landlordName} / ${legacyStudentNameFromProfile(sp, 'Tenant')}`,
      pdfBase64,
      documentPdfName: 'Mutual Termination of Residential Tenancy.pdf',
      removeTags: true,
      landlordRole: 'First Party',
      tenantRole: 'Second Party',
      landlord: { name: landlordName, email: landlordEmail },
      tenant: { name: tenantName, email: tenantEmail },
    })
    const submission = wrapSubmissionSubmitters(submissionRaw, false)
    const submissionId = submission.id != null ? String(submission.id) : null
    if (!submissionId) {
      return { ok: false, status: 500, code: 'docuseal', message: 'DocuSeal missing submission id.' }
    }

    await admin
      .from('tenancy_documents')
      .update({
        docuseal_submission_id: submissionId,
        status: 'sent_for_signing',
        metadata: {
          kind: 'mutual_surrender',
          bond_outcome: bondOutcome,
          docuseal_response: submission as unknown as Json,
        } as Json,
      })
      .eq('id', documentId)

    try {
      const { emitDocumentSentForSigning, loadBookingIdsForTenancy } = await import(
        '../events/emitDocusealDocumentEvents.js'
      )
      const bookingIds = await loadBookingIdsForTenancy(admin, tenancy.id)
      if (bookingIds) {
        await emitDocumentSentForSigning(admin, {
          ...bookingIds,
          documentId,
          submissionId,
          actorType: 'system',
          source: 'send',
        })
      }
    } catch (evErr) {
      console.error('[mutual-termination] sent_for_signing event', evErr)
    }

    return { ok: true, documentId, submissionId }
  } catch (e) {
    console.error('[mutual-termination] docuseal', e)
    return {
      ok: false,
      status: 500,
      code: 'docuseal',
      message: e instanceof Error ? e.message : 'Could not send for signing.',
    }
  }
}
