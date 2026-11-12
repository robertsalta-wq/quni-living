import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingEventActorType } from './events/types.js'
import { listingEmailAttemptExists } from './listingEmailAttempt.js'
import { sendBookingEmail } from './sendBookingEmail.js'

export type CorrectedAddendumParty = 'landlord' | 'renter' | 'co_tenant'

export const CORRECTED_ADDENDUM_SIGN_KEYS: Record<CorrectedAddendumParty, string> = {
  landlord: 'corrected_addendum_sign_landlord',
  renter: 'corrected_addendum_sign_renter',
  co_tenant: 'corrected_addendum_sign_co_tenant',
}

export const CORRECTED_ADDENDUM_SIGNED_KEYS: Record<CorrectedAddendumParty, string> = {
  landlord: 'corrected_addendum_signed_landlord',
  renter: 'corrected_addendum_signed_renter',
  co_tenant: 'corrected_addendum_signed_co_tenant',
}

export const CORRECTED_ADDENDUM_SENTENCE =
  'This corrects the payee details on their existing agreement and changes nothing else.'

const SIGN_SUBJECT_PREFIX = 'Sign the addendum for '
export const CORRECTED_ADDENDUM_SIGNED_SUBJECT = 'Your signed addendum'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">${escapeHtml(label)}</a></p>`
}

export function correctedAddendumSignHtml(name: string, propertyAddress: string, signUrl: string): string {
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>${escapeHtml(propertyAddress)}</p>
    <p>${escapeHtml(CORRECTED_ADDENDUM_SENTENCE)}</p>
    ${button(signUrl, 'Sign the addendum')}
    <p>- Quni Living</p>
  `
}

export function correctedAddendumSignedHtml(name: string, propertyAddress: string, downloadUrl: string): string {
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your signed addendum for ${escapeHtml(propertyAddress)} is ready.</p>
    <p>${escapeHtml(CORRECTED_ADDENDUM_SENTENCE)}</p>
    ${button(downloadUrl, 'Download the addendum')}
    <p>- Quni Living</p>
  `
}

type PartyTarget = { party: CorrectedAddendumParty; email: string; name: string }

export type CorrectedAddendumEmailResult = {
  sent: CorrectedAddendumParty[]
  skipped: CorrectedAddendumParty[]
}

function partyTargets(args: {
  landlord: { email: string; name: string }
  renter: { email: string; name: string }
  coTenant?: { email: string; name: string } | null
}): PartyTarget[] {
  const parties: PartyTarget[] = []
  const seen = new Set<string>()
  const push = (party: CorrectedAddendumParty, email: string, name: string) => {
    const trimmed = email.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) return
    seen.add(key)
    parties.push({ party, email: trimmed, name: name.trim() || party })
  }
  push('landlord', args.landlord.email, args.landlord.name)
  push('renter', args.renter.email, args.renter.name)
  if (args.coTenant) push('co_tenant', args.coTenant.email, args.coTenant.name)
  return parties
}

async function sendOnce(
  admin: SupabaseClient,
  args: {
    bookingId: string
    submissionId: string
    parties: PartyTarget[]
    keys: Record<CorrectedAddendumParty, string>
    subjectFor: (party: PartyTarget) => string
    htmlFor: (party: PartyTarget) => string
    textFor: (party: PartyTarget) => string
    landlordId?: string | null
    studentId?: string | null
    actorType?: BookingEventActorType
    actorId?: string | null
  },
): Promise<CorrectedAddendumEmailResult> {
  const bookingId = args.bookingId.trim()
  const submissionId = args.submissionId.trim()
  if (!bookingId) throw new Error('corrected addendum email: bookingId required')
  if (!submissionId) throw new Error('corrected addendum email: submissionId required')

  const sent: CorrectedAddendumParty[] = []
  const skipped: CorrectedAddendumParty[] = []
  for (const party of args.parties) {
    const templateKey = args.keys[party.party]
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
      subject: args.subjectFor(party),
      html: args.htmlFor(party),
      text: args.textFor(party),
      landlordId: args.landlordId,
      studentId: args.studentId,
      actorType: args.actorType ?? 'system',
      actorId: args.actorId,
      metadata: { docuseal_submission_id: submissionId },
    })
    sent.push(party.party)
  }
  return { sent, skipped }
}

export async function sendCorrectedAddendumSignEmails(
  admin: SupabaseClient,
  args: {
    bookingId: string
    submissionId: string
    propertyAddress: string
    landlord: { email: string; name: string; signUrl: string }
    renter: { email: string; name: string; signUrl: string }
    coTenant?: { email: string; name: string; signUrl: string } | null
    landlordId?: string | null
    studentId?: string | null
    actorType?: BookingEventActorType
    actorId?: string | null
  },
): Promise<CorrectedAddendumEmailResult> {
  const address = args.propertyAddress.trim() || 'the property'
  const urlFor = (party: PartyTarget) => {
    if (party.party === 'landlord') return args.landlord.signUrl.trim()
    if (party.party === 'renter') return args.renter.signUrl.trim()
    return args.coTenant?.signUrl.trim() || ''
  }
  const parties = partyTargets(args).filter((party) => urlFor(party))
  return sendOnce(admin, {
    bookingId: args.bookingId,
    submissionId: args.submissionId,
    parties,
    keys: CORRECTED_ADDENDUM_SIGN_KEYS,
    landlordId: args.landlordId,
    studentId: args.studentId,
    actorType: args.actorType ?? 'admin',
    actorId: args.actorId,
    subjectFor: () => `${SIGN_SUBJECT_PREFIX}${address}`,
    htmlFor: (party) => correctedAddendumSignHtml(party.name, address, urlFor(party)),
    textFor: (party) =>
      [
        `Hi ${party.name},`,
        '',
        address,
        '',
        CORRECTED_ADDENDUM_SENTENCE,
        '',
        `Sign the addendum: ${urlFor(party)}`,
      ].join('\n'),
  })
}

export async function sendCorrectedAddendumSignedEmails(
  admin: SupabaseClient,
  args: {
    bookingId: string
    submissionId: string
    propertyAddress: string
    downloadUrl: string
    landlord: { email: string; name: string }
    renter: { email: string; name: string }
    coTenant?: { email: string; name: string } | null
    landlordId?: string | null
    studentId?: string | null
    actorType?: BookingEventActorType
  },
): Promise<CorrectedAddendumEmailResult> {
  const address = args.propertyAddress.trim() || 'the property'
  const downloadUrl = args.downloadUrl.trim()
  if (!downloadUrl) throw new Error('corrected addendum email: downloadUrl required')
  return sendOnce(admin, {
    bookingId: args.bookingId,
    submissionId: args.submissionId,
    parties: partyTargets(args),
    keys: CORRECTED_ADDENDUM_SIGNED_KEYS,
    landlordId: args.landlordId,
    studentId: args.studentId,
    actorType: args.actorType ?? 'webhook',
    subjectFor: () => CORRECTED_ADDENDUM_SIGNED_SUBJECT,
    htmlFor: (party) => correctedAddendumSignedHtml(party.name, address, downloadUrl),
    textFor: (party) =>
      [
        `Hi ${party.name},`,
        '',
        `Your signed addendum for ${address} is ready.`,
        '',
        CORRECTED_ADDENDUM_SENTENCE,
        '',
        `Download the addendum: ${downloadUrl}`,
      ].join('\n'),
  })
}
