/**
 * Auto-decline sibling booking requests when a property is taken.
 * Managed: called at confirm (capture deposit). Listing: at bond-received → confirmed.
 */
import { sendEmail } from '../sendEmail.js'
import { bookingAutoDeclinedPropertyTakenStudent, propertyAddressLine } from '../emailTemplates.js'
import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'
import { bookingHasStudentDepositAuthorization } from './listingBookingApply.js'

const COMPETITOR_PIPELINE_STATUSES = ['pending_confirmation', 'awaiting_info']

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').default | null | undefined} stripe When omitted, no deposit PI cancel/refund
 * @param {object} args
 * @param {string} args.propertyId
 * @param {string} args.winningBookingId
 * @param {string} [args.siteBase]
 */
export async function declineCompetingBookings(admin, stripe, args) {
  const propertyId = typeof args.propertyId === 'string' ? args.propertyId.trim() : ''
  const winningBookingId = typeof args.winningBookingId === 'string' ? args.winningBookingId.trim() : ''
  if (!propertyId || !winningBookingId) {
    return { declined: 0 }
  }

  const siteBase =
    (typeof args.siteBase === 'string' && args.siteBase.trim()) ||
    (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni.com.au').replace(
      /\/$/,
      '',
    )

  const { data: propRow } = await admin
    .from('properties')
    .select('title, address, suburb, state, postcode')
    .eq('id', propertyId)
    .maybeSingle()

  const addr = propertyAddressLine(propRow && typeof propRow === 'object' ? propRow : {})
  const title =
    propRow && typeof propRow === 'object' && typeof propRow.title === 'string' && propRow.title.trim()
      ? propRow.title.trim()
      : 'Property'

  const { data: competitors, error: compErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      stripe_payment_intent_id,
      service_tier_at_request,
      student_profiles ( email, full_name, first_name, last_name )
    `,
    )
    .eq('property_id', propertyId)
    .neq('id', winningBookingId)
    .in('status', COMPETITOR_PIPELINE_STATUSES)

  if (compErr) {
    console.error('[decline-competing] load competitors', compErr)
    return { declined: 0, error: compErr.message }
  }

  let declined = 0
  for (const row of competitors ?? []) {
    const nowDecline = new Date().toISOString()
    const { error: decErr } = await admin
      .from('bookings')
      .update({
        status: 'declined',
        declined_at: nowDecline,
        decline_reason: 'property_taken',
      })
      .eq('id', row.id)

    if (decErr) {
      console.error('[decline-competing] update', row.id, decErr)
      continue
    }

    declined += 1

    const piRow = typeof row.stripe_payment_intent_id === 'string' ? row.stripe_payment_intent_id.trim() : ''
    if (stripe && piRow && bookingHasStudentDepositAuthorization(row)) {
      try {
        const opi = await stripe.paymentIntents.retrieve(piRow)
        if (opi.status === 'requires_capture' || opi.status === 'requires_confirmation') {
          await stripe.paymentIntents.cancel(piRow)
        } else if (opi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: piRow })
        }
      } catch (stripeEx) {
        console.error('[decline-competing] stripe', row.id, stripeEx)
        const errText = stripeEx instanceof Error ? stripeEx.message : String(stripeEx)
        await captureSentryMessageEdge('Auto-decline refund/cancel failed after property taken', {
          declinedBookingId: row.id,
          propertyId,
          paymentIntentId: piRow,
          err: errText,
        })
        try {
          await sendEmail({
            to: 'hello@quni.com.au',
            subject: `Urgent: auto-decline refund failed - booking ${row.id}`,
            html: `<p>Refund/cancel failed for booking <code>${row.id}</code> after another booking was confirmed for the same property.</p>
<p>Property id: <code>${propertyId}</code></p>
<p>PaymentIntent: <code>${piRow}</code></p>
<p>Error: ${errText.replace(/</g, '&lt;')}</p>`,
          })
        } catch (mailEx) {
          console.error('[decline-competing] alert email', mailEx)
        }
      }
    }

    const stRow = row.student_profiles && typeof row.student_profiles === 'object' ? row.student_profiles : {}
    const compEmail = typeof stRow.email === 'string' ? stRow.email.trim() : ''
    const compName =
      [stRow.first_name, stRow.last_name].filter(Boolean).join(' ').trim() ||
      (typeof stRow.full_name === 'string' && stRow.full_name.trim()) ||
      'there'

    if (compEmail) {
      try {
        const t = bookingAutoDeclinedPropertyTakenStudent({
          student_name: compName,
          property_address: addr || title,
          property_title: title,
          listings_url: `${siteBase}/listings`,
        })
        await sendEmail({ to: compEmail, subject: t.subject, html: t.html })
      } catch (mailEx) {
        console.error('[decline-competing] student email', row.id, mailEx)
      }
    }
  }

  return { declined }
}
