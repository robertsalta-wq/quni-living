// @ts-nocheck - imports the untyped DocuSeal helper, same as the other send-for-signing modules.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '../../../src/lib/database.types.js'
import { sendCorrectedAddendumSignEmails } from '../booking/sendCorrectedAddendumEmails.js'
import { createDocusealSubmissionFromPdf } from '../docuseal.shared.js'
import { wrapSubmissionSubmitters, type DocusealSubmitterLinkSource } from '../docuseal/signLinkWrap.js'

type Submitter = DocusealSubmitterLinkSource & { email?: string; name?: string }

function roleOf(submitter: Submitter): string {
  return typeof submitter.role === 'string' ? submitter.role.toLowerCase() : ''
}

export function submitterSignUrl(submitters: Submitter[] | undefined, party: 'landlord' | 'renter' | 'co_tenant'): string {
  const match = (submitters ?? []).find((row) => {
    const role = roleOf(row)
    if (party === 'landlord') return role.includes('landlord') || role.includes('first party')
    if (party === 'co_tenant') return role.includes('co-tenant') || role.includes('co tenant')
    return (
      (role.includes('tenant') || role.includes('second party') || role.includes('renter')) &&
      !role.includes('co-tenant') &&
      !role.includes('co tenant')
    )
  })
  const url = typeof match?.embed_src === 'string' ? match.embed_src.trim() : ''
  if (!url.includes('/api/sign/')) {
    throw new Error(`Missing /api/sign link for the ${party}`)
  }
  return url
}

export async function sendCorrectedPayeeAddendum(
  admin: SupabaseClient,
  args: {
    bookingId: string
    tenancyId: string
    unsignedPath: string
    pdfBase64: string
    bookingReference: string
    generatedBy: string | null
    propertyAddress: string
    landlord: { id: string; name: string; email: string }
    renter: { id: string; name: string; email: string }
    coTenant: { name: string; email: string } | null
  },
): Promise<{ submissionId: string }> {
  const submissionRaw = await createDocusealSubmissionFromPdf({
    name: `Corrected addendum ${args.bookingReference}`,
    documentPdfName: 'Corrected addendum.pdf',
    pdfBase64: args.pdfBase64,
    sendEmail: false,
    order: 'random',
    landlordRole: 'First Party',
    tenantRole: 'Second Party',
    coTenantRole: 'Co-tenant',
    landlord: { name: args.landlord.name, email: args.landlord.email },
    tenant: { name: args.renter.name, email: args.renter.email },
    coTenant: args.coTenant,
  })
  const submission = wrapSubmissionSubmitters(submissionRaw, false)
  const submissionId = submission?.id != null ? String(submission.id) : ''
  if (!submissionId) throw new Error('DocuSeal response missing submission id')

  const submitters = submission.submitters as Submitter[] | undefined
  const landlordSignUrl = submitterSignUrl(submitters, 'landlord')
  const renterSignUrl = submitterSignUrl(submitters, 'renter')
  const coTenantSignUrl = args.coTenant ? submitterSignUrl(submitters, 'co_tenant') : ''

  const { error: docErr } = await admin.from('tenancy_documents').insert({
    tenancy_id: args.tenancyId,
    document_type: 'other',
    status: 'sent_for_signing',
    file_path: args.unsignedPath,
    docuseal_submission_id: submissionId,
    generated_by: args.generatedBy,
    metadata: {
      document_kind: 'corrected_payee_addendum',
      booking_id: args.bookingId,
    } as Json,
  })
  if (docErr) throw new Error('Could not store the addendum record.')

  try {
    await sendCorrectedAddendumSignEmails(admin, {
      bookingId: args.bookingId,
      submissionId,
      propertyAddress: args.propertyAddress,
      landlord: { email: args.landlord.email, name: args.landlord.name, signUrl: landlordSignUrl },
      renter: { email: args.renter.email, name: args.renter.name, signUrl: renterSignUrl },
      coTenant: args.coTenant
        ? { email: args.coTenant.email, name: args.coTenant.name, signUrl: coTenantSignUrl }
        : null,
      landlordId: args.landlord.id,
      studentId: args.renter.id,
      actorType: 'admin',
      actorId: args.generatedBy,
    })
  } catch (emailErr) {
    console.error('[corrected-addendum] sign email', emailErr)
    throw new Error(
      `The addendum was created in DocuSeal (submission ${submissionId}) but the signing email did not send. Do not send again until that submission is checked.`,
    )
  }

  return { submissionId }
}
