/**
 * Listing-tier transactional emails (Resend). Failures are logged; callers treat email as best-effort.
 */
import { sendEmail } from '../sendEmail.js'
import { resolveTenancyPackage } from '../resolveTenancyPackage.js'
import { resolveBookingBondAmountAud } from './bookingBondAmount.js'
import {
  listingBondPaymentEmailHtmlForLandlord,
  listingBondPaymentEmailHtmlForTenant,
} from '../tenancy/listingBondPaymentCopy.js'
import {
  listingAgreementReadyLandlord,
  listingAgreementReadyRenter,
  listingBookingAcceptedLandlord,
  listingBookingAcceptedRenter,
  listingBondPendingExpiredLandlord,
  listingBondPendingExpiredRenter,
  listingBondReceivedLandlord,
  listingBondReceivedRenter,
  listingCancelledByLandlordLandlord,
  listingCancelledByLandlordRenter,
  propertyAddressLine,
} from '../emailTemplates.js'

export function siteBaseUrl() {
  const explicit = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
    return explicit
  }
  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '')
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '')
    return `https://${host}`
  }
  return 'https://quni.com.au'
}

function bookingReferenceLabel(bookingId) {
  return String(bookingId || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()
}

function formatAuLongDate(iso) {
  const d = new Date(typeof iso === 'string' ? iso : '')
  if (!Number.isFinite(d.getTime())) return '-'
  return d.toLocaleDateString('en-AU', { dateStyle: 'long', timeZone: 'Australia/Sydney' })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 */
async function loadListingEmailContext(admin, bookingId) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      weekly_rent,
      bond_amount,
      move_in_date,
      start_date,
      lease_length,
      bond_window_expires_at,
      properties ( title, address, suburb, state, postcode, property_type, is_registered_rooming_house, qld_bond_remittance_preference, bond, bond_weeks, bond_is_fixed, bond_fixed_amount ),
      student_profiles ( email, full_name, first_name, last_name ),
      landlord_profiles ( email, full_name, phone )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    console.error('[listing-emails] load booking', error)
    return null
  }
  if (!booking) return null

  const prop = booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
  const addr = propertyAddressLine(prop)
  const title = 'title' in prop ? String(prop.title ?? '') : ''
  const sp =
    booking.student_profiles && typeof booking.student_profiles === 'object'
      ? booking.student_profiles
      : {}
  const lp =
    booking.landlord_profiles && typeof booking.landlord_profiles === 'object'
      ? booking.landlord_profiles
      : {}

  const studentName =
    [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof sp.full_name === 'string' && sp.full_name.trim()) ||
    'Student'

  const studentEmail = typeof sp.email === 'string' ? sp.email.trim() : ''
  const landlordEmail = typeof lp.email === 'string' ? lp.email.trim() : ''
  const landlordName = typeof lp.full_name === 'string' && lp.full_name.trim() ? lp.full_name.trim() : 'Host'

  const moveInRaw =
    (typeof booking.move_in_date === 'string' && booking.move_in_date.trim()) ||
    (typeof booking.start_date === 'string' && booking.start_date.trim()) ||
    ''
  const moveInDate = moveInRaw || '-'
  const leaseLength =
    typeof booking.lease_length === 'string' && booking.lease_length.trim() ? booking.lease_length.trim() : '-'

  const propState = typeof prop.state === 'string' && prop.state.trim() ? prop.state.trim() : 'NSW'
  const propertyType = typeof prop.property_type === 'string' ? prop.property_type.trim() : ''
  const isRooming = Boolean(prop.is_registered_rooming_house)
  const tenancyPackage = resolveTenancyPackage({
    state: propState,
    property_type: propertyType,
    is_registered_rooming_house: isRooming,
    date: moveInRaw || undefined,
  })
  const bondRules = tenancyPackage.supported ? tenancyPackage.rules.bond : null
  const qldBondRemittancePreference =
    typeof prop.qld_bond_remittance_preference === 'string' ? prop.qld_bond_remittance_preference : null
  const bondPaymentOpts =
    qldBondRemittancePreference === 'landlord_collects_remits' || qldBondRemittancePreference === 'tenant_choice'
      ? { qldBondRemittancePreference: qldBondRemittancePreference }
      : undefined
  const resolvedBondAmountAud = resolveBookingBondAmountAud(
    booking.bond_amount,
    prop,
    booking.weekly_rent,
  )
  const bondPaymentTenantHtml =
    bondRules && bondRules.schemeApplies
      ? listingBondPaymentEmailHtmlForTenant(bondRules, propState, resolvedBondAmountAud, bondPaymentOpts)
      : null
  const bondPaymentLandlordHtml =
    bondRules && bondRules.schemeApplies
      ? listingBondPaymentEmailHtmlForLandlord(bondRules, propState, resolvedBondAmountAud, bondPaymentOpts)
      : null

  return {
    bookingId,
    studentEmail,
    landlordEmail,
    studentName,
    landlordName,
    propertyAddress: addr || title,
    propertyTitle: title,
    moveInDate,
    leaseLength,
    bondWindowExpiresAt: booking.bond_window_expires_at,
    weeklyRent: booking.weekly_rent,
    bondPaymentTenantHtml,
    bondPaymentLandlordHtml,
    bondSchemeApplies: Boolean(bondRules?.schemeApplies),
  }
}

/**
 * After Listing confirm (bond_pending).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ bond_window_expires_at: string }} opts
 */
export async function sendListingBookingAcceptedEmails(admin, bookingId, opts) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const base = siteBaseUrl()
    const bookingRef = bookingReferenceLabel(bookingId)
    const bondDeadline = formatAuLongDate(opts.bond_window_expires_at)
    const studentDash = `${base}/student-dashboard?tab=bookings`
    const markBond = `${base}/landlord/bookings/${bookingId}/review`

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingBookingAcceptedRenter({
        student_name: ctx.studentName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        booking_reference: bookingRef,
        bond_deadline_display: bondDeadline,
        student_dashboard_url: studentDash,
        bond_payment_html: ctx.bondPaymentTenantHtml,
      })
      await sendEmail({ to: ctx.studentEmail, subject: t.subject, html: t.html })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingBookingAcceptedLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        booking_reference: bookingRef,
        listing_fee_display: '$99.00',
        bond_deadline_display: bondDeadline,
        mark_bond_received_url: markBond,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
        bond_obligations_html: ctx.bondPaymentLandlordHtml,
        review_url: markBond,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingBookingAcceptedEmails', bookingId, e)
  }
}

/**
 * After Listing confirm when DocuSeal signing is live.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 */
export async function sendListingAgreementReadyEmails(admin, bookingId) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const base = siteBaseUrl()
    const studentDash = `${base}/student-dashboard?tab=bookings`
    const reviewUrl = `${base}/landlord/bookings/${bookingId}/review`

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingAgreementReadyRenter({
        student_name: ctx.studentName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        sign_agreement_url: studentDash,
        student_dashboard_url: studentDash,
      })
      await sendEmail({ to: ctx.studentEmail, subject: t.subject, html: t.html })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingAgreementReadyLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        review_url: reviewUrl,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingAgreementReadyEmails', bookingId, e)
  }
}

/**
 * After bond received → confirmed.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 */
export async function sendListingBondReceivedEmails(admin, bookingId) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const base = siteBaseUrl()
    const studentDash = `${base}/student-dashboard?tab=bookings`

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingBondReceivedRenter({
        student_name: ctx.studentName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        sign_agreement_url: studentDash,
        student_dashboard_url: studentDash,
      })
      await sendEmail({ to: ctx.studentEmail, subject: t.subject, html: t.html })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingBondReceivedLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingBondReceivedEmails', bookingId, e)
  }
}

/**
 * Bond window expiry cron (per booking row already loaded with joins).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {object} bookingRow - shape compatible with expire-bookings select
 * @param {{ refund_id?: string | null; refund_amount_cents?: number | null }} refundMeta
 */
export async function sendListingBondPendingExpiredEmails(admin, bookingRow, refundMeta) {
  try {
    const bookingId = bookingRow.id
    const ctx = await loadListingEmailContext(admin, bookingId)
    const base = siteBaseUrl()

    const prop = bookingRow.properties && typeof bookingRow.properties === 'object' ? bookingRow.properties : {}
    const addr = propertyAddressLine(prop)
    const title = 'title' in prop ? String(prop.title ?? '') : ''
    const st =
      bookingRow.student_profiles && typeof bookingRow.student_profiles === 'object'
        ? bookingRow.student_profiles
        : {}
    const lp =
      bookingRow.landlord_profiles && typeof bookingRow.landlord_profiles === 'object'
        ? bookingRow.landlord_profiles
        : {}

    const studentName =
      ctx?.studentName ||
      [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
      (typeof st.full_name === 'string' && st.full_name.trim()) ||
      'Student'
    const landlordName =
      ctx?.landlordName ||
      (typeof lp.full_name === 'string' && lp.full_name.trim() ? lp.full_name.trim() : 'Host')

    const studentEmail = ctx?.studentEmail || (typeof st.email === 'string' ? st.email.trim() : '')
    const landlordEmail = ctx?.landlordEmail || (typeof lp.email === 'string' ? lp.email.trim() : '')

    const sendRenter = async () => {
      if (!studentEmail) return
      const t = listingBondPendingExpiredRenter({
        student_name: studentName,
        property_address: addr || title,
        property_title: title,
        listings_url: `${base}/listings`,
      })
      await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
    }

    const sendLl = async () => {
      if (!landlordEmail) return
      const t = listingBondPendingExpiredLandlord({
        landlord_name: landlordName,
        property_address: addr || title,
        property_title: title,
        listing_fee_display: '$99.00',
        refund_id: refundMeta.refund_id ?? undefined,
        refund_amount_cents: refundMeta.refund_amount_cents ?? undefined,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingBondPendingExpiredEmails', bookingRow?.id, e)
  }
}

/**
 * Landlord-initiated cancel while bond_pending.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ cancellation_reason?: string | null }} meta
 */
export async function sendListingCancelledByLandlordEmails(admin, bookingId, meta) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const base = siteBaseUrl()
    const reason = typeof meta.cancellation_reason === 'string' ? meta.cancellation_reason.trim() : ''

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingCancelledByLandlordRenter({
        student_name: ctx.studentName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        cancellation_reason: reason || undefined,
        listings_url: `${base}/listings`,
      })
      await sendEmail({ to: ctx.studentEmail, subject: t.subject, html: t.html })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingCancelledByLandlordLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        listing_fee_display: '$99.00',
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingCancelledByLandlordEmails', bookingId, e)
  }
}
