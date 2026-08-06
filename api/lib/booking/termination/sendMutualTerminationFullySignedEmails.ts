// @ts-nocheck - Quni/Resend confirmation when mutual termination is fully signed.
import { sendEmail } from '../../sendEmail.js'
import { mutualTerminationFullySigned } from '../../emailTemplates.js'

export async function sendMutualTerminationFullySignedEmails(args: {
  landlordName: string
  landlordEmail: string
  tenantName: string
  tenantEmail: string
  premisesLine: string
  terminationEffectiveDate: string
  downloadUrl?: string | null
  landlordReviewUrl?: string | null
  tenantReviewUrl?: string | null
}): Promise<{ landlordSent: boolean; tenantSent: boolean }> {
  const landlordEmail = typeof args.landlordEmail === 'string' ? args.landlordEmail.trim() : ''
  const tenantEmail = typeof args.tenantEmail === 'string' ? args.tenantEmail.trim() : ''
  const downloadUrl = typeof args.downloadUrl === 'string' ? args.downloadUrl.trim() : ''

  const landlordTpl = mutualTerminationFullySigned({
    recipient_name: args.landlordName,
    property_address: args.premisesLine,
    effective_date: args.terminationEffectiveDate,
    download_url: downloadUrl || null,
    review_url: args.landlordReviewUrl || null,
  })
  const tenantTpl = mutualTerminationFullySigned({
    recipient_name: args.tenantName,
    property_address: args.premisesLine,
    effective_date: args.terminationEffectiveDate,
    download_url: downloadUrl || null,
    review_url: args.tenantReviewUrl || null,
  })

  const results = await Promise.allSettled([
    landlordEmail
      ? sendEmail({ to: landlordEmail, subject: landlordTpl.subject, html: landlordTpl.html })
      : Promise.resolve(null),
    tenantEmail
      ? sendEmail({ to: tenantEmail, subject: tenantTpl.subject, html: tenantTpl.html })
      : Promise.resolve(null),
  ])

  if (results[0].status === 'rejected') {
    console.error('[mutual-termination] landlord fully-signed email', results[0].reason)
  }
  if (results[1].status === 'rejected') {
    console.error('[mutual-termination] tenant fully-signed email', results[1].reason)
  }

  return {
    landlordSent: Boolean(landlordEmail) && results[0].status === 'fulfilled',
    tenantSent: Boolean(tenantEmail) && results[1].status === 'fulfilled',
  }
}
