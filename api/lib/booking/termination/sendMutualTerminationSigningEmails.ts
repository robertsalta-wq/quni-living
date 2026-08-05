// @ts-nocheck - Quni/Resend signing emails for mutual termination (same rail as lease).
import { sendEmail } from '../../sendEmail.js'
import { mutualTerminationReadyToSign } from '../../emailTemplates.js'

export async function sendMutualTerminationSigningEmails(args: {
  landlordName: string
  landlordEmail: string
  landlordSigningUrl: string | null | undefined
  tenantName: string
  tenantEmail: string
  tenantSigningUrl: string | null | undefined
  premisesLine: string
  terminationEffectiveDate: string
}): Promise<{ landlordSent: boolean; tenantSent: boolean }> {
  const landlordUrl =
    typeof args.landlordSigningUrl === 'string' ? args.landlordSigningUrl.trim() : ''
  const tenantUrl = typeof args.tenantSigningUrl === 'string' ? args.tenantSigningUrl.trim() : ''

  const landlordTpl = mutualTerminationReadyToSign({
    recipient_name: args.landlordName,
    property_address: args.premisesLine,
    sign_url: landlordUrl,
    effective_date: args.terminationEffectiveDate,
    role_label: 'landlord',
  })
  const tenantTpl = mutualTerminationReadyToSign({
    recipient_name: args.tenantName,
    property_address: args.premisesLine,
    sign_url: tenantUrl,
    effective_date: args.terminationEffectiveDate,
    role_label: 'tenant',
  })

  const results = await Promise.allSettled([
    landlordUrl
      ? sendEmail({
          to: args.landlordEmail,
          subject: landlordTpl.subject,
          html: landlordTpl.html,
        })
      : Promise.resolve(null),
    tenantUrl
      ? sendEmail({
          to: args.tenantEmail,
          subject: tenantTpl.subject,
          html: tenantTpl.html,
        })
      : Promise.resolve(null),
  ])

  if (results[0].status === 'rejected') {
    console.error('[mutual-termination] landlord sign email', results[0].reason)
  }
  if (results[1].status === 'rejected') {
    console.error('[mutual-termination] tenant sign email', results[1].reason)
  }

  return {
    landlordSent: Boolean(landlordUrl) && results[0].status === 'fulfilled',
    tenantSent: Boolean(tenantUrl) && results[1].status === 'fulfilled',
  }
}
