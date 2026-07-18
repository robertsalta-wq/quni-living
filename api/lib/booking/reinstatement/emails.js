/**
 * Self-serve reinstatement transactional emails (best-effort).
 * Mirrors listingTransactionalEmails dual-party pattern.
 */
import { sendEmail } from '../../sendEmail.js'
import {
  listingReinstatementBlockedUnavailable,
  listingReinstatementCancelled,
  listingReinstatementConfirmed,
  listingReinstatementDeclined,
  listingReinstatementRequested,
  propertyAddressLine,
} from '../../emailTemplates.js'
import { siteBaseUrl } from '../listingTransactionalEmails.js'

/** PostgREST may return a nested row or a one-element array. */
export function unwrapRelation(value) {
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === 'object' && !Array.isArray(first) ? first : {}
  }
  if (value && typeof value === 'object') return value
  return {}
}

export function graceDaysRemaining(graceWindowExpiresAt, nowMs = Date.now()) {
  if (typeof graceWindowExpiresAt !== 'string' || !graceWindowExpiresAt.trim()) return null
  const end = new Date(graceWindowExpiresAt).getTime()
  if (!Number.isFinite(end)) return null
  const ms = end - nowMs
  if (ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

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

  if (error) {
    console.error('[reinstatement-emails] load booking', bookingId, error.message)
    return null
  }
  if (!booking) {
    console.error('[reinstatement-emails] booking not found', bookingId)
    return null
  }

  const prop = unwrapRelation(booking.properties)
  const st = unwrapRelation(booking.student_profiles)
  const lp = unwrapRelation(booking.landlord_profiles)

  const propertyAddress = propertyAddressLine(prop) || String(prop.title || '')
  const propertyTitle = typeof prop.title === 'string' ? prop.title : ''

  const studentName =
    [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
    (typeof st.full_name === 'string' && st.full_name.trim()) ||
    'Student'
  const landlordName =
    typeof lp.full_name === 'string' && lp.full_name.trim() ? lp.full_name.trim() : 'Host'

  const studentEmail = typeof st.email === 'string' ? st.email.trim() : ''
  const landlordEmail = typeof lp.email === 'string' ? lp.email.trim() : ''

  return {
    studentEmail,
    landlordEmail,
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
    const days = graceDaysRemaining(meta.graceWindowExpiresAt)
    const t = listingReinstatementRequested({
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      requester_label: requesterLabel,
      grace_days: days,
      grace_window_expires_at: meta.graceWindowExpiresAt,
      action_url: meta.otherPartyRole === 'landlord' ? urls.landlordUrl : urls.renterUrl,
    })
    const to = meta.otherPartyRole === 'landlord' ? ctx.landlordEmail : ctx.studentEmail
    if (!to) {
      console.error('[reinstatement-emails] request: missing recipient email', bookingId, meta.otherPartyRole)
      return
    }
    await sendEmail({ to, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[reinstatement-emails] sendReinstatementRequestEmails', bookingId, e)
  }
}

export async function sendReinstatementConfirmedEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)

    const sendOne = async (to, name, actionUrl, isLandlord) => {
      if (!to) {
        console.error(
          '[reinstatement-emails] confirmed: missing recipient email',
          bookingId,
          isLandlord ? 'landlord' : 'tenant',
        )
        return
      }
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
    console.error('[reinstatement-emails] sendReinstatementConfirmedEmails', bookingId, e)
  }
}

export async function sendReinstatementDeclinedEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadCtx(admin, bookingId)
    if (!ctx) return
    const base = siteBaseUrl()
    const urls = bookingUrls(base)
    const toRequester =
      meta.declinedByRole === 'landlord'
        ? { email: ctx.studentEmail, name: ctx.studentName, url: urls.renterUrl }
        : { email: ctx.landlordEmail, name: ctx.landlordName, url: urls.landlordUrl }
    if (!toRequester.email) {
      console.error('[reinstatement-emails] declined: missing requester email', bookingId)
      return
    }
    const t = listingReinstatementDeclined({
      recipient_name: toRequester.name,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: toRequester.url,
    })
    await sendEmail({ to: toRequester.email, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[reinstatement-emails] sendReinstatementDeclinedEmails', bookingId, e)
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
    if (!toOther.email) {
      console.error('[reinstatement-emails] cancelled: missing other-party email', bookingId)
      return
    }
    const t = listingReinstatementCancelled({
      recipient_name: toOther.name,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      action_url: toOther.url,
    })
    await sendEmail({ to: toOther.email, subject: t.subject, html: t.html })
  } catch (e) {
    console.error('[reinstatement-emails] sendReinstatementCancelledEmails', bookingId, e)
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
    console.error('[reinstatement-emails] sendReinstatementBlockedUnavailableEmails', bookingId, e)
  }
}
