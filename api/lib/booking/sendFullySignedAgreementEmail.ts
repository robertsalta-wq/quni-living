import type { SupabaseClient } from '@supabase/supabase-js'
import { listingEmailAttemptExists } from './listingEmailAttempt.js'
import { sendBookingEmail } from './sendBookingEmail.js'
import type { BookingEventActorType } from './events/types.js'

export type FullySignedParty = 'landlord' | 'renter' | 'co_tenant'

/** One template key per party. The submission id lives in metadata so a later submission can still send. */
export const FULLY_SIGNED_TEMPLATE_KEYS: Record<FullySignedParty, string> = {
  landlord: 'agreement_fully_signed_landlord',
  renter: 'agreement_fully_signed_renter',
  co_tenant: 'agreement_fully_signed_co_tenant',
}

export type FullySignedAgreementSubjectInput = {
  isResidentialTenancyPackage: boolean
  isVicResidentialPackage: boolean
  isQldResidentialPackage: boolean
}

export function fullySignedAgreementSubject(input: FullySignedAgreementSubjectInput): string {
  if (!input.isResidentialTenancyPackage) return 'Your lease is signed - Quni Living'
  if (input.isVicResidentialPackage) return 'Your VIC tenancy agreement is signed - Quni Living'
  if (input.isQldResidentialPackage) return 'Your QLD tenancy agreement is signed - Quni Living'
  return 'Your NSW tenancy agreement is signed - Quni Living'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function fullySignedAgreementHtml(name: string, downloadUrl: string, downloadLabel: string): string {
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your residential tenancy agreement has been fully signed. You can download a copy here:</p>
    <p><a href="${escapeHtml(downloadUrl)}">${escapeHtml(downloadLabel)}</a></p>
    <p>- Quni Living</p>
  `
}

export type SendFullySignedAgreementEmailsArgs = {
  bookingId: string
  submissionId: string
  downloadUrl: string
  subject: string
  downloadLabel: string
  landlord: { email: string; name: string }
  renter: { email: string; name: string }
  coTenant?: { email: string; name: string } | null
  landlordId?: string | null
  studentId?: string | null
  actorType?: BookingEventActorType
  actorLabel?: string | null
}

export type FullySignedEmailResult = {
  sent: FullySignedParty[]
  skipped: FullySignedParty[]
}

/**
 * Sends the repaired-file copy once per party per DocuSeal submission.
 * An existing booking_events email.attempt for that party and submission skips the send,
 * including webhook retries, reconcile re-entry, and a second --resend.
 * A lookup error throws and does not record an attempt, so a later retry can still send once.
 */
export async function sendFullySignedAgreementEmails(
  admin: SupabaseClient,
  args: SendFullySignedAgreementEmailsArgs,
): Promise<FullySignedEmailResult> {
  const bookingId = String(args.bookingId || '').trim()
  const submissionId = String(args.submissionId || '').trim()
  const downloadUrl = String(args.downloadUrl || '').trim()
  if (!bookingId) throw new Error('sendFullySignedAgreementEmails: bookingId required')
  if (!submissionId) throw new Error('sendFullySignedAgreementEmails: submissionId required')
  if (!downloadUrl) throw new Error('sendFullySignedAgreementEmails: downloadUrl required')

  const parties: Array<{ party: FullySignedParty; email: string; name: string }> = []
  const landlordEmail = args.landlord.email.trim()
  const renterEmail = args.renter.email.trim()
  const coEmail = args.coTenant?.email?.trim() ?? ''
  if (landlordEmail) parties.push({ party: 'landlord', email: landlordEmail, name: args.landlord.name })
  if (renterEmail) parties.push({ party: 'renter', email: renterEmail, name: args.renter.name })
  if (coEmail) parties.push({ party: 'co_tenant', email: coEmail, name: args.coTenant?.name || 'Co-tenant' })

  const sent: FullySignedParty[] = []
  const skipped: FullySignedParty[] = []
  for (const party of parties) {
    const templateKey = FULLY_SIGNED_TEMPLATE_KEYS[party.party]
    const already = await listingEmailAttemptExists(admin, bookingId, templateKey, {
      metadata: { docuseal_submission_id: submissionId },
      failClosed: true,
    })
    if (already) {
      skipped.push(party.party)
      continue
    }
    await sendBookingEmail(admin, {
      bookingId,
      templateKey,
      to: party.email,
      subject: args.subject,
      html: fullySignedAgreementHtml(party.name, downloadUrl, args.downloadLabel),
      landlordId: args.landlordId,
      studentId: args.studentId,
      actorType: args.actorType ?? 'system',
      actorLabel: args.actorLabel,
      metadata: { docuseal_submission_id: submissionId },
    })
    sent.push(party.party)
  }
  return { sent, skipped }
}
