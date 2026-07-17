/**
 * Self-serve reinstatement transactional emails (best-effort).
 */
import { sendEmail } from '../../sendEmail.js'
import {
  listingReinstatementBlockedUnavailable,
  listingReinstatementCancelled,
  listingReinstatementConfirmed,
  listingReinstatementDeclined,
  listingReinstatementRequested,
} from '../../emailTemplates.js'
import { siteBaseUrl } from '../listingTransactionalEmails.js'

async function loadCtx(admin, bookingId) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      properties ( title, address, suburb, state, postcode ),
      student_profiles ( email, full_name, first_name, last_name ),
      landlord_profiles ( email, full_name )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()
  if (error || !booking) return null

  const prop = booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
  const st =
    booking.student_profiles && typeof booking.student_profiles === 'object'
      ? booking.student_profiles
      : {}
  const lp =
    booking.landlord_profiles && typeof booking.landlord_profiles === 'object'
      ? booking.landlord_profiles
      : {}

  const addrParts = [prop.address, prop.suburb, prop.state, prop.postcode].filter(Boolean)
  const propertyAddress = addrParts.join(', ') || String(prop.title || '')
  const propertyTitle = typeof prop.title === 'string' ? prop.title : ''

  const studentName =
    [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
    (typeof st.full_name === 'string' && st.full_name.trim()) ||
    'Student'
  const landlordName =
    typeof lp.full_name === 'string' && lp.full_name.trim() ? lp.full_name.trim() : 'Host'

  return {
    studentEmail: typeof st.email === 'string' ? st.email.trim() : '',
    landlordEmail: typeof lp.email === 'string' ? lp.email.trim() : '',
    studentName,
    landlordName,
    propertyAddress,
    propertyTitle,
  }
}

function bookingUrls(base) {
  return {
    renterUrl: `${base}/student/dashboard`,
    landlordUrl: `${base}/landlord/dashboard?tab=bookings`,
  }
}

export async function sendReinstatementRequestEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)
    const requesterLabel = meta.requesterRole === 'landlord' ? 'Your host' : 'The renter'
    const t = listingReinstatementRequested({
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      requester_label: requesterLabel,
      grace_window_expires_at: meta.graceWindowExpiresAt,
      action_url: meta.otherPartyRole === 'landlord' ? urls.landlordUrl : urls.renterUrl,
    })
    const to = meta.otherPartyRole === 'landlord' ? ctx.landlordEmail : ctx.studentEmail
    if (!to) return
    await sendEmail({ to, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[listing-emails] sendReinstatementRequestEmails', bookingId, e)
  }
}

export async function sendReinstatementConfirmedEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)

    const sendOne = async (to, name, actionUrl, isLandlord) => {
      if (!to) return
      const t = listingReinstatementConfirmed({
        recipient_name: name,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        booking_status: meta.bookingStatusAfter,
        signing_resent: Boolean(meta.signingResent),
        signing_resend_failed: Boolean(meta.signingResendFailed),
        listing_fee_refunded: Boolean(meta.listingFeeRefunded) && isLandlord,
        action_url: actionUrl,
      })
      await sendEmail({ to, subject: t.subject, html: t.html })
    }

    await Promise.all([
      sendOne(ctx.studentEmail, ctx.studentName, urls.renterUrl, false),
      sendOne(ctx.landlordEmail, ctx.landlordName, urls.landlordUrl, true),
    ])
  } catch (e) {
    console.error('[listing-emails] sendReinstatementConfirmedEmails', bookingId, e)
  }
}

export async function sendReinstatementDeclinedEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)
    // Notify requester — we don't know requester role from meta.declinedByRole alone:
    // if landlord declined, tenant was requester; if tenant declined, landlord requested.
    const toRequester =
      meta.declinedByRole === 'landlord'
        ? { email: ctx.studentEmail, name: ctx.studentName, url: urls.renterUrl }
        : { email: ctx.landlordEmail, name: ctx.landlordName, url: urls.landlordUrl }
    if (!toRequester.email) return
    const t = listingReinstatementDeclined({
      recipient_name: toRequester.name,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: toRequester.url,
    })
    await sendEmail({ to: toRequester.email, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[listing-emails] sendReinstatementDeclinedEmails', bookingId, e)
  }
}

export async function sendReinstatementCancelledEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)
    const toOther =
      meta.cancelledByRole === 'landlord'
        ? { email: ctx.studentEmail, name: ctx.studentName, url: urls.renterUrl }
        : { email: ctx.landlordEmail, name: ctx.landlordName, url: urls.landlordUrl }
    if (!toOther.email) return
    const t = listingReinstatementCancelled({
      recipient_name: toOther.name,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: toOther.url,
    })
    await sendEmail({ to: toOther.email, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[listing-emails] sendReinstatementCancelledEmails', bookingId, e)
  }
}

export async function sendReinstatementBlockedUnavailableEmails(admin, bookingId) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)
    const tR = listingReinstatementBlockedUnavailable({
      recipient_name: ctx.studentName,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: `${base}/listings`,
    })
    const tL = listingReinstatementBlockedUnavailable({
      recipient_name: ctx.landlordName,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: urls.landlordUrl,
    })
    await Promise.all([
      ctx.studentEmail
        ? sendEmail({ to: ctx.studentEmail, subject: tR.subject, html: tR.html })
        : Promise.resolve(),
      ctx.landlordEmail
        ? sendEmail({ to: ctx.landlordEmail, subject: tL.subject, html: tL.html })
        : Promise.resolve(),
    ])
  } catch (e) {
    console.error('[listing-emails] sendReinstatementBlockedUnavailableEmails', bookingId, e)
  }
}
