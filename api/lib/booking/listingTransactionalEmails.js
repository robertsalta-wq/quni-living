/**
 * Listing-tier transactional emails (Resend). Failures are logged; callers treat email as best-effort
 * except sendListingPaymentInstructionsRenter (propagates). Payment-instruction paths use
 * sendBookingEmail so attempt/accept/fail land in booking_events.
 */
import { sendEmail } from '../sendEmail.js'
import { sendBookingEmail } from './sendBookingEmail.js'
import { listingEmailAttemptExists } from './listingEmailAttempt.js'
import { inclusiveLeaseLastDay } from './leaseEndDate.js'
import { resolveTenancyPackage, tenancyPackageInputFromPropertyRow } from '../resolveTenancyPackage.js'
import { resolveBookingBondAmountAud } from './bookingBondAmount.js'
import { propertyPayoutDetailsComplete } from '../../../src/lib/propertyPayoutDetails.js'
import { tenantLegalNameForDocuments } from './tenantLegalNameForDocuments.js'
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
  listingPaymentInstructionsRenter,
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
      property_id,
      landlord_id,
      student_id,
      status,
      service_tier_final,
      confirmed_at,
      weekly_rent,
      bond_amount,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      bond_window_expires_at,
      properties ( title, address, suburb, state, postcode, property_type, is_registered_rooming_house, rooms_rented_to_residents, qld_shares_kitchen_or_bathroom, qld_bond_remittance_preference, bond, bond_weeks ),
      student_profiles ( email, full_name, first_name, last_name, verification_type, legal_name_locked_at ),
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
  const tenancyPackage = resolveTenancyPackage(
    tenancyPackageInputFromPropertyRow(prop, { date: moveInRaw || undefined }),
  )
  const bondRules = tenancyPackage.supported ? tenancyPackage.rules.bond : null
  const qldBondRemittancePreference =
    typeof prop.qld_bond_remittance_preference === 'string' ? prop.qld_bond_remittance_preference : null

  const isBoarderLodger = tenancyPackage.supported && tenancyPackage.tier === 'T1'
  let payout = null
  const propertyId =
    typeof booking.property_id === 'string' && booking.property_id.trim() ? booking.property_id.trim() : ''
  // Listing: load payee for all property types (rent + optional host-collected bond), not only occupancy.
  if (propertyId) {
    const { data: payoutRow, error: payoutErr } = await admin
      .from('property_payout_details')
      .select('account_name, bsb, account_number')
      .eq('property_id', propertyId)
      .maybeSingle()
    if (payoutErr) {
      console.error('[listing-emails] load payout details', payoutErr)
    } else if (propertyPayoutDetailsComplete(payoutRow)) {
      payout = payoutRow
    }
  }

  const paymentReference = `${tenantLegalNameForDocuments(sp, 'Student')} - ${addr || title}`.trim()
  const bondPaymentOpts = {
    qldBondRemittancePreference,
    ...(payout ? { payee: payout, paymentReference } : {}),
  }
  const resolvedBondAmountAud = resolveBookingBondAmountAud(
    booking.bond_amount,
    prop,
    booking.weekly_rent,
  )
  const bondPaymentTenantHtml =
    bondRules && bondRules.schemeApplies
      ? listingBondPaymentEmailHtmlForTenant(
          bondRules,
          propState,
          resolvedBondAmountAud,
          bondPaymentOpts,
        )
      : null
  const bondPaymentLandlordHtml =
    bondRules && bondRules.schemeApplies
      ? listingBondPaymentEmailHtmlForLandlord(
          bondRules,
          propState,
          resolvedBondAmountAud,
          bondPaymentOpts,
        )
      : null

  return {
    bookingId: typeof booking.id === 'string' ? booking.id : bookingId,
    landlordId: typeof booking.landlord_id === 'string' ? booking.landlord_id : null,
    studentId: typeof booking.student_id === 'string' ? booking.student_id : null,
    studentEmail,
    landlordEmail,
    studentName,
    landlordName,
    propertyAddress: addr || title,
    propertyTitle: title,
    moveInDate,
    leaseLength,
    exclusiveEndDate: typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null,
    landlordPhone: typeof lp.phone === 'string' ? lp.phone.trim() : '',
    bondWindowExpiresAt: booking.bond_window_expires_at,
    weeklyRent: booking.weekly_rent,
    bondAmountAud: resolvedBondAmountAud,
    bondPaymentTenantHtml,
    bondPaymentLandlordHtml,
    bondSchemeApplies: Boolean(bondRules?.schemeApplies),
    propertyState: tenancyPackage.ragState,
    isBoarderLodger,
    payout,
    paymentReference,
    qldBondRemittancePreference,
    bookingStatus: typeof booking.status === 'string' ? booking.status : '',
    serviceTierFinal:
      typeof booking.service_tier_final === 'string' ? booking.service_tier_final : null,
    confirmedAt: typeof booking.confirmed_at === 'string' ? booking.confirmed_at : null,
  }
}

/**
 * @param {NonNullable<Awaited<ReturnType<typeof loadListingEmailContext>>>} ctx
 * @param {{ bondDeadlineDisplay: string; studentDashboardUrl?: string; bookingReference?: string }} opts
 */
export function buildListingRenterPaymentEmailPayload(ctx, opts) {
  const base = siteBaseUrl()
  const studentDash = opts.studentDashboardUrl ?? `${base}/student-dashboard?tab=bookings`
  return {
    student_name: ctx.studentName,
    property_address: ctx.propertyAddress,
    property_title: ctx.propertyTitle,
    booking_reference: opts.bookingReference,
    bond_deadline_display: opts.bondDeadlineDisplay,
    student_dashboard_url: studentDash,
    bond_payment_html: ctx.bondPaymentTenantHtml,
    bond_scheme_applies: ctx.bondSchemeApplies,
    property_state: ctx.propertyState,
    is_boarder_lodger: ctx.isBoarderLodger,
    payout: ctx.payout,
    weekly_rent: ctx.weeklyRent,
    bond_amount_aud: ctx.bondAmountAud,
    move_in_date: ctx.moveInDate,
    payment_reference: ctx.paymentReference,
    status: ctx.bookingStatus,
  }
}

/**
 * User-initiated payment instructions email (landlord resend). Propagates send failures.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ deviceCtx?: { user_agent: string, is_mobile: boolean } | null }} [opts]
 * @returns {Promise<{ ok: true } | { ok: false; code: string; message: string }>}
 */
export async function sendListingPaymentInstructionsRenter(admin, bookingId, opts = {}) {
  const ctx = await loadListingEmailContext(admin, bookingId)
  if (!ctx) {
    return { ok: false, code: 'not_found', message: 'Booking not found.' }
  }
  if (!ctx.studentEmail) {
    return { ok: false, code: 'no_student_email', message: 'Renter email is not available.' }
  }

  const bondDeadline = formatAuLongDate(ctx.bondWindowExpiresAt)
  const payload = buildListingRenterPaymentEmailPayload(ctx, { bondDeadlineDisplay: bondDeadline })
  const t = listingPaymentInstructionsRenter(payload)
  const landlordCc = ctx.landlordEmail?.trim() || ''
  await sendBookingEmail(admin, {
    bookingId: ctx.bookingId,
    templateKey: 'listing_payment_instructions',
    to: ctx.studentEmail,
    subject: t.subject,
    html: t.html,
    ...(landlordCc ? { cc: landlordCc } : {}),
    landlordId: ctx.landlordId,
    studentId: ctx.studentId,
    actorType: 'landlord',
    deviceCtx: opts.deviceCtx ?? null,
  })
  return { ok: true }
}

/**
 * After Listing confirm (bond_pending).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ bond_window_expires_at: string, deviceCtx?: { user_agent: string, is_mobile: boolean } | null }} opts
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
    const deviceCtx = opts.deviceCtx ?? null

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingBookingAcceptedRenter(
        buildListingRenterPaymentEmailPayload(ctx, {
          bondDeadlineDisplay: bondDeadline,
          studentDashboardUrl: studentDash,
          bookingReference: bookingRef,
        }),
      )
      if (await listingEmailAttemptExists(admin, bookingId, 'listing_booking_accepted_renter')) return
      await sendBookingEmail(admin, {
        bookingId,
        templateKey: 'listing_booking_accepted_renter',
        to: ctx.studentEmail,
        subject: t.subject,
        html: t.html,
        landlordId: ctx.landlordId,
        studentId: ctx.studentId,
        actorType: 'system',
        deviceCtx,
      })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingBookingAcceptedLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        booking_reference: bookingRef,
        listing_fee_display: '',
        bond_deadline_display: bondDeadline,
        mark_bond_received_url: markBond,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
        bond_obligations_html: ctx.bondPaymentLandlordHtml,
        bond_scheme_applies: ctx.bondSchemeApplies,
        property_state: ctx.propertyState,
        review_url: markBond,
      })
      if (await listingEmailAttemptExists(admin, bookingId, 'listing_booking_accepted_landlord')) return
      await sendBookingEmail(admin, {
        bookingId,
        templateKey: 'listing_booking_accepted_landlord',
        to: ctx.landlordEmail,
        subject: t.subject,
        html: t.html,
        landlordId: ctx.landlordId,
        studentId: ctx.studentId,
        actorType: 'system',
        deviceCtx,
      })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingBookingAcceptedEmails', bookingId, e)
  }
}

/**
 * After Listing confirm when signing emails / in-app links are live.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 */
function embedSrcForRole(metadata, role) {
  const response =
    metadata && typeof metadata === 'object' && metadata.docuseal_response && typeof metadata.docuseal_response === 'object'
      ? metadata.docuseal_response
      : null
  const submitters = response && Array.isArray(response.submitters) ? response.submitters : []
  const match = submitters.find((row) => {
    const roleStr = typeof row?.role === 'string' ? row.role.toLowerCase() : ''
    if (role === 'landlord') return roleStr.includes('landlord') || roleStr.includes('first party')
    if (role === 'co-tenant') return roleStr.includes('co-tenant') || roleStr.includes('co tenant')
    return (
      (roleStr.includes('tenant') || roleStr.includes('second party') || roleStr.includes('renter')) &&
      !roleStr.includes('co-tenant') &&
      !roleStr.includes('co tenant')
    )
  })
  const url = typeof match?.embed_src === 'string' ? match.embed_src.trim() : ''
  const email = typeof match?.email === 'string' ? match.email.trim() : ''
  return { url, email }
}

async function loadAgreementSigningLinks(admin, bookingId) {
  const { data: tenancy } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()
  if (!tenancy?.id) return { landlord: { url: '', email: '' }, renter: { url: '', email: '' }, coTenant: { url: '', email: '' } }
  const { data: docs } = await admin
    .from('tenancy_documents')
    .select('metadata, document_type, created_at')
    .eq('tenancy_id', tenancy.id)
    .in('document_type', ['residential_tenancy', 'lease'])
    .order('created_at', { ascending: false })
    .limit(5)
  const doc = (docs ?? []).find((row) => embedSrcForRole(row.metadata, 'landlord').url || embedSrcForRole(row.metadata, 'renter').url)
  return {
    landlord: embedSrcForRole(doc?.metadata, 'landlord'),
    renter: embedSrcForRole(doc?.metadata, 'renter'),
    coTenant: embedSrcForRole(doc?.metadata, 'co-tenant'),
  }
}

function formatSigningMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatSigningDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '-'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export async function sendListingAgreementReadyEmails(admin, bookingId) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const links = await loadAgreementSigningLinks(admin, bookingId)
    if (!links.landlord.url || !links.renter.url) {
      console.error('[listing-emails] signing links missing', bookingId)
      return
    }

    const base = siteBaseUrl()
    const studentDash = `${base}/student-dashboard?tab=bookings`
    const reviewUrl = `${base}/landlord/bookings/${bookingId}/review`
    const lastDay = ctx.leaseLength === 'Flexible' ? 'open-ended' : formatSigningDate(inclusiveLeaseLastDay(ctx.exclusiveEndDate))
    const landlordContact = [ctx.landlordName, ctx.landlordEmail, ctx.landlordPhone].filter(Boolean).join(', ')
    const shared = {
      landlord_name: ctx.landlordName,
      student_name: ctx.studentName,
      property_address: ctx.propertyAddress,
      property_title: ctx.propertyTitle,
      start_date: formatSigningDate(ctx.moveInDate),
      lease_length: ctx.leaseLength,
      last_day: lastDay,
      weekly_rent: formatSigningMoney(ctx.weeklyRent),
      bond: formatSigningMoney(ctx.bondAmountAud),
      landlord_contact: landlordContact,
    }

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingAgreementReadyRenter({
        ...shared,
        sign_agreement_url: links.renter.url,
        student_dashboard_url: studentDash,
      })
      if (await listingEmailAttemptExists(admin, bookingId, 'listing_agreement_ready_renter')) return
      await sendBookingEmail(admin, {
        bookingId,
        templateKey: 'listing_agreement_ready_renter',
        to: ctx.studentEmail,
        subject: t.subject,
        html: t.html,
        text: t.text,
        landlordId: ctx.landlordId,
        studentId: ctx.studentId,
        actorType: 'system',
      })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingAgreementReadyLandlord({
        ...shared,
        sign_agreement_url: links.landlord.url,
        review_url: reviewUrl,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      if (await listingEmailAttemptExists(admin, bookingId, 'listing_agreement_ready_landlord')) return
      await sendBookingEmail(admin, {
        bookingId,
        templateKey: 'listing_agreement_ready_landlord',
        to: ctx.landlordEmail,
        subject: t.subject,
        html: t.html,
        text: t.text,
        landlordId: ctx.landlordId,
        studentId: ctx.studentId,
        actorType: 'system',
      })
    }

    const sendCo = async () => {
      if (!links.coTenant.url || !links.coTenant.email) return
      if (links.coTenant.email.toLowerCase() === ctx.studentEmail.toLowerCase()) return
      const t = listingAgreementReadyRenter({
        ...shared,
        student_name: 'there',
        sign_agreement_url: links.coTenant.url,
        student_dashboard_url: studentDash,
      })
      if (await listingEmailAttemptExists(admin, bookingId, 'listing_agreement_ready_co_tenant')) return
      await sendBookingEmail(admin, {
        bookingId,
        templateKey: 'listing_agreement_ready_co_tenant',
        to: links.coTenant.email,
        subject: t.subject,
        html: t.html,
        text: t.text,
        landlordId: ctx.landlordId,
        studentId: ctx.studentId,
        actorType: 'system',
      })
    }

    await Promise.all([sendRenter(), sendLl(), sendCo()])
  } catch (e) {
    console.error('[listing-emails] sendListingAgreementReadyEmails', bookingId, e)
  }
}

/**
 * After bond received → confirmed.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ pdfAttachment?: { filename: string, content: string } | null }} [opts]
 */
export async function sendListingBondReceivedEmails(admin, bookingId, opts) {
  try {
    const ctx = await loadListingEmailContext(admin, bookingId)
    if (!ctx) return

    const base = siteBaseUrl()
    const studentDash = `${base}/student-dashboard?tab=bookings`
    const pdfAttachment =
      opts?.pdfAttachment &&
      typeof opts.pdfAttachment.filename === 'string' &&
      typeof opts.pdfAttachment.content === 'string'
        ? opts.pdfAttachment
        : null
    const attachments = pdfAttachment ? [pdfAttachment] : undefined
    const receiptAttached = Boolean(pdfAttachment)

    const sendRenter = async () => {
      if (!ctx.studentEmail) return
      const t = listingBondReceivedRenter({
        student_name: ctx.studentName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        sign_agreement_url: studentDash,
        student_dashboard_url: studentDash,
        receipt_attached: receiptAttached,
      })
      await sendEmail({ to: ctx.studentEmail, subject: t.subject, html: t.html, attachments })
    }

    const sendLl = async () => {
      if (!ctx.landlordEmail) return
      const t = listingBondReceivedLandlord({
        landlord_name: ctx.landlordName,
        property_address: ctx.propertyAddress,
        property_title: ctx.propertyTitle,
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
        receipt_attached: receiptAttached,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html, attachments })
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
        listing_fee_display: '',
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
        listing_fee_display: '',
        dashboard_url: `${base}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: ctx.landlordEmail, subject: t.subject, html: t.html })
    }

    await Promise.all([sendRenter(), sendLl()])
  } catch (e) {
    console.error('[listing-emails] sendListingCancelledByLandlordEmails', bookingId, e)
  }
}
