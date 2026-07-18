/**
 * Inline HTML for booking notifications (Resend). Primary colour: #FF6F61
 */

export function propertyAddressLine(prop) {
  if (!prop || typeof prop !== 'object') return ''
  const parts = [prop.address, prop.suburb, prop.state, prop.postcode].filter(Boolean)
  return parts.join(', ') || String(prop.title || '')
}

function escapeHtml(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapContent(innerHtml) {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #FF6F61; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Quni Living</h1>
  </div>
  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
    ${innerHtml}
  </div>
  <div style="text-align: center; padding: 20px; color: #888888; font-size: 12px;">
    <p>Quni Living - verified accommodation for students, graduates &amp; professionals</p>
    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>
  </div>
</div>`
}

function formatAudFromDollars(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '-'
  return `$${x.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatAudFromCents(cents) {
  const n = Number(cents)
  if (!Number.isFinite(n)) return '-'
  return `$${(n / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** @param {object} data */
export function bookingRequestLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'Property')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const studentName = escapeHtml(data.student_name || 'Student')
  const studentUniversity = escapeHtml(data.student_university || '-')
  const studentCourse = escapeHtml(data.student_course || '-')
  const moveInDate = escapeHtml(data.move_in_date || '-')
  const leaseLength = escapeHtml(data.lease_length || '-')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')
  const responseWindow = escapeHtml(data.response_window_label || '5 days')
  const msg = (data.student_message || '').trim()
  const messageBlock =
    msg.length > 0
      ? `<p><strong>Message from student:</strong><br>${escapeHtml(msg).replace(/\n/g, '<br>')}</p>`
      : ''

  const inner = `<h2 style="color: #1A1A2E;">New booking request</h2>
<p>Hi ${landlordName},</p>
<p>You have a new booking request for <strong>${propertyAddress}</strong>.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Student</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>${studentName}</strong></td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">University</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${studentUniversity}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Course</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${studentCourse}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Move-in date</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${moveInDate}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Lease length</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${leaseLength}</td></tr>
</table>
${messageBlock}
<p style="color: #FF6F61;"><strong>⏰ You have ${responseWindow} to respond before this request expires.</strong></p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Review booking request →</a>`

  return {
    subject: `New booking request for ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingConfirmedStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your booking')
  const studentName = escapeHtml(data.student_name || 'there')
  const moveInDate = escapeHtml(data.move_in_date || '-')
  const leaseLength = escapeHtml(data.lease_length || '-')
  const weeklyRent = formatAudFromDollars(data.weekly_rent)
  const landlordName = escapeHtml(data.landlord_name || '-')
  const landlordPhone = escapeHtml(data.landlord_phone || '-')
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/student-dashboard')

  const inner = `<h2 style="color: #1A1A2E;">Booking confirmed! 🎉</h2>
<p>Hi ${studentName},</p>
<p>Great news - your booking for <strong>${propertyAddress}</strong> has been confirmed.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Move-in date</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>${moveInDate}</strong></td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Lease length</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${leaseLength}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Weekly rent</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${weeklyRent}/week</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Landlord</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${landlordName}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Landlord contact</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${landlordPhone}</td></tr>
</table>
<p><strong>Your booking deposit of ${escapeHtml(depositAmount)} will be released to your landlord 24 hours after your move-in date.</strong></p>
<p>Remember to arrange your bond payment directly with your landlord before moving in.</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking details →</a>`

  return {
    subject: `Your booking is confirmed - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingConfirmedLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const studentName = escapeHtml(data.student_name || 'Student')
  const moveInDate = escapeHtml(data.move_in_date || '-')
  const leaseLength = escapeHtml(data.lease_length || '-')
  const weeklyRent = formatAudFromDollars(data.weekly_rent)
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const bondAmountFormatted =
    data.bond_amount_formatted ||
    (data.bond_amount_cents != null ? formatAudFromCents(data.bond_amount_cents) : '')
  const bondAuthority = escapeHtml(data.bond_authority || '')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')

  const bondBlock =
    bondAmountFormatted && bondAuthority
      ? `<p><strong>Bond record:</strong> We&apos;ve logged a bond of <strong>${escapeHtml(bondAmountFormatted)}</strong> for this booking. Please collect the bond from the student and lodge it with <strong>${bondAuthority}</strong> within the timeframe required in your state. Quni Living has recorded your acknowledgement of this obligation.</p>`
      : `<p><strong>Remember:</strong> You must collect the bond directly from the student and lodge it with the relevant state bond authority within 10 business days of move-in.</p>`

  const inner = `<h2 style="color: #1A1A2E;">Booking confirmed</h2>
<p>Hi ${landlordName},</p>
<p>You've confirmed a booking for <strong>${propertyAddress}</strong>.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Student</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>${studentName}</strong></td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Move-in date</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>${moveInDate}</strong></td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Lease length</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${leaseLength}</td></tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #666;">Weekly rent</td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${weeklyRent}/week</td></tr>
</table>
<p>Weekly rent payments will begin automatically on the move-in date via Stripe.</p>
<p>The booking deposit of ${escapeHtml(depositAmount)} will be transferred to your bank account 24 hours after the move-in date.</p>
${bondBlock}
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking details →</a>`

  return {
    subject: `You confirmed a booking - ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
/** Landlord asked follow-up questions before deciding. */
export function bookingMoreInfoFromLandlordStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')
  const landlordMessage = escapeHtml((data.landlord_message || '').trim()).replace(/\n/g, '<br>')
  const replyUrl = escapeHtml(
    data.reply_url || 'https://quni.com.au/student-profile?tab=bookings',
  )

  const inner = `<h2 style="color: #1A1A2E;">More information needed</h2>
<p>Hi ${studentName},</p>
<p>Your host has a question about your booking request for <strong>${propertyAddress}</strong>.</p>
<div style="background:#FEF9E4;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #f0e6c4;">
<p style="margin:0;font-size:14px;line-height:1.5;">${landlordMessage || '<em>(No message text)</em>'}</p>
</div>
<p>Please sign in and reply from your <strong>Bookings</strong> tab so they can continue reviewing your request.</p>
<a href="${replyUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking &amp; reply →</a>`

  return {
    subject: `Your host has a question - ${data.property_address || data.property_title || 'booking request'}`,
    html: wrapContent(inner),
  }
}

/** Auto-declined because another student was confirmed for the same property. */
/** @param {object} data */
export function bookingAutoDeclinedPropertyTakenStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')
  const listingsUrl = escapeHtml(data.listings_url || 'https://quni.com.au/listings')

  const inner = `<h2 style="color: #1A1A2E;">Update on your booking request</h2>
<p>Hi ${studentName},</p>
<p>Thank you for your interest in <strong>${propertyAddress}</strong> through Quni Living.</p>
<p>Another student has been selected for this property, so we are unable to proceed with your request.</p>
<p>Your booking deposit will be refunded to your original payment method within <strong>5–7 business days</strong>. You will not be charged for this listing.</p>
<p>There are many other great homes on Quni Living - we encourage you to keep browsing and find the right place for you.</p>
<a href="${listingsUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse listings →</a>
<p style="margin-top: 24px; font-size: 14px; color: #666;">Warm regards,<br><strong>Quni Living</strong></p>`

  return {
    subject: 'Update on your Quni Living booking request',
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingDeclinedStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)

  const inner = `<h2 style="color: #1A1A2E;">Booking request declined</h2>
<p>Hi ${studentName},</p>
<p>Unfortunately your booking request for <strong>${propertyAddress}</strong> was not accepted by the landlord.</p>
<p>Your booking deposit of <strong>${escapeHtml(depositAmount)}</strong> will be automatically refunded to your original payment method within 5-7 business days.</p>
<p>Don't be discouraged - there are plenty of great properties on Quni Living. Keep searching!</p>
<a href="https://quni.com.au/listings" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse more properties →</a>`

  return {
    subject: `Booking request update - ${data.property_address || data.property_title || 'your request'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingExpiredStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')
  const responseWindow = escapeHtml(data.response_window_label || '5 days')

  const inner = `<h2 style="color: #1A1A2E;">Booking request expired</h2>
<p>Hi ${studentName},</p>
<p>Your booking request for <strong>${propertyAddress}</strong> has expired because the landlord did not respond within ${responseWindow}.</p>
<p>You have not been charged - your payment authorisation has been cancelled.</p>
<a href="https://quni.com.au/listings" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse more properties →</a>`

  return {
    subject: `Your booking request has expired - ${data.property_address || data.property_title || 'your request'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function depositReleasedLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')

  const inner = `<h2 style="color: #1A1A2E;">Deposit released</h2>
<p>Hi ${landlordName},</p>
<p>The booking deposit of <strong>${escapeHtml(depositAmount)}</strong> for <strong>${propertyAddress}</strong> has been released to your connected bank account.</p>
<p>It should appear in your account within 2-3 business days depending on your bank.</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View dashboard →</a>`

  return {
    subject: `Your booking deposit has been released - ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

export function formatPayoutBsbDisplay(raw) {
  const digits = String(raw ?? '').replace(/[\s-]/g, '')
  if (digits.length !== 6) return String(raw ?? '').trim()
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

function listingRentPayeeBlockHtml(data) {
  const payout =
    data.payout && typeof data.payout === 'object' && data.payout.account_name && data.payout.bsb && data.payout.account_number
      ? data.payout
      : null
  if (!payout) return ''
  const accountName = escapeHtml(payout.account_name.trim())
  const bsb = escapeHtml(formatPayoutBsbDisplay(payout.bsb))
  const accountNumber = escapeHtml(payout.account_number.trim())
  const weeklyRentDisplay = formatAudFromDollars(data.weekly_rent)
  const weeklyRentNum = Number(data.weekly_rent)
  const bondAmountNum = Number(data.bond_amount_aud)
  const moveInDisplay = escapeHtml(data.move_in_date || '-')
  const bondDeadlineDisplay = escapeHtml(data.bond_deadline_display || '-')
  const paymentReference = escapeHtml(
    data.payment_reference || `${data.student_name || ''} — ${data.property_address || ''}`.trim(),
  )
  const heading = data.rent_only_heading === true ? 'How to pay your rent' : 'How to pay your bond and rent'
  const isBondPending = data.status === 'bond_pending'
  const hasWeeklyRent = Number.isFinite(weeklyRentNum) && weeklyRentNum > 0
  const hasBond = Number.isFinite(bondAmountNum) && bondAmountNum > 0
  const bondLine =
    data.rent_only_heading === true
      ? ''
      : `<p style="margin:0 0 8px;"><strong>Bond:</strong> ${escapeHtml(formatAudFromDollars(data.bond_amount_aud))} due by <strong>${bondDeadlineDisplay}</strong>.</p>`
  const firstWeekLine =
    isBondPending && hasWeeklyRent
      ? `<p style="margin:0 0 8px;"><strong>First week&apos;s rent:</strong> ${escapeHtml(formatAudFromDollars(weeklyRentNum))}, due by your move-in date (<strong>${moveInDisplay}</strong>).</p>`
      : ''
  const upfrontTotalLine =
    isBondPending && data.rent_only_heading !== true && hasBond && hasWeeklyRent
      ? `<p style="margin:0 0 8px;">Up front you&apos;ll need <strong>${escapeHtml(formatAudFromDollars(bondAmountNum + weeklyRentNum))} in total</strong> — bond ${escapeHtml(formatAudFromDollars(bondAmountNum))} (by <strong>${bondDeadlineDisplay}</strong>) and your first week&apos;s rent ${escapeHtml(formatAudFromDollars(weeklyRentNum))} (by <strong>${moveInDisplay}</strong>).</p>`
      : ''
  const rentLine = `<p style="margin:0 0 8px;"><strong>Rent:</strong> ${escapeHtml(weeklyRentDisplay)} per week, paid weekly in advance from your move-in date (<strong>${moveInDisplay}</strong>).</p>`
  return `<div style="margin:16px 0;padding:16px;border:1px solid #e8e8e8;border-radius:8px;background:#fafafa;">
<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1A1A2E;">${escapeHtml(heading)}</p>
${bondLine}${firstWeekLine}${upfrontTotalLine}${rentLine}
<p style="margin:0 0 8px;"><strong>Pay to:</strong><br>
Account name: ${accountName}<br>
BSB: ${bsb}<br>
Account number: ${accountNumber}</p>
<p style="margin:0 0 8px;"><strong>Reference:</strong> ${paymentReference}</p>
<p style="margin:0;"><strong>Method:</strong> Fee-free bank transfer.</p>
</div>`
}

/** Scheme-aware bond + rent payment block (shared by acceptance and payment-instructions emails). */
export function listingRenterPaymentInstructionsBlockHtml(data) {
  const schemeApplies = data.bond_scheme_applies === true
  const payout =
    data.payout && typeof data.payout === 'object' && data.payout.account_name && data.payout.bsb && data.payout.account_number
      ? data.payout
      : null
  const statutoryBondHtml =
    typeof data.bond_payment_html === 'string' && data.bond_payment_html.trim() ? data.bond_payment_html : ''

  // Any Listing property with complete payee details: show bank transfer block (bond+rent or rent-only when scheme).
  if (payout && schemeApplies) {
    const rentBlock = listingRentPayeeBlockHtml({ ...data, rent_only_heading: true })
    return `${statutoryBondHtml}${rentBlock}`
  }
  if (payout) {
    return listingRentPayeeBlockHtml({ ...data, rent_only_heading: false })
  }
  if (statutoryBondHtml) {
    return statutoryBondHtml
  }
  return `<p><strong>Bond payment:</strong> Pay your bond <strong>directly to your host</strong> outside Quni (bank transfer, cash, or as agreed). Quni does not hold bond on Listing stays.</p>`
}

/** Listing tier - renter: slim payment-instructions resend (no acceptance / DocuSeal copy). */
export function listingPaymentInstructionsRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your booking')
  const dashboardUrl = escapeHtml(data.student_dashboard_url || 'https://quni.com.au/student-dashboard')
  const paymentBlock = listingRenterPaymentInstructionsBlockHtml(data)

  const inner = `<h2 style="color: #1A1A2E;">Payment instructions for your booking</h2>
<p>Hi ${studentName},</p>
<p>Here are the payment details for your booking at <strong>${propertyAddress}</strong>.</p>
${paymentBlock}
<a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>`

  return {
    subject: `Payment instructions - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - renter: landlord accepted; pay bond off-platform; deadline (no signing CTA). */
export function listingBookingAcceptedRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your booking')
  const bookingRef = escapeHtml(data.booking_reference || '-')
  const bondDeadline = escapeHtml(data.bond_deadline_display || '-')
  const dashboardUrl = escapeHtml(data.student_dashboard_url || 'https://quni.com.au/student-dashboard')
  const bondPaymentBlock = listingRenterPaymentInstructionsBlockHtml(data)

  const inner = `<h2 style="color: #1A1A2E;">Your booking is confirmed - arrange bond</h2>
<p>Hi ${studentName},</p>
<p>Good news - your host has accepted your booking for <strong>${propertyAddress}</strong> (reference <strong>${bookingRef}</strong>).</p>
<p><strong>Tenancy agreement:</strong> We&apos;re preparing your agreement for electronic signing. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>
${bondPaymentBlock}
<p><strong>Deadline:</strong> Please arrange bond payment before <strong>${bondDeadline}</strong>. If bond isn&apos;t received in time, this booking may lapse.</p>
<p style="margin-top:12px;font-size:14px;color:#555;">Your host will confirm bond receipt on Quni when they have received it.</p>
<a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>`

  return {
    subject: `Booking confirmed - arrange bond for ${data.property_address || data.property_title || 'your stay'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - renter: agreement ready to sign (DocuSeal dispatched). */
export function listingAgreementReadyRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your booking')
  const signUrl = escapeHtml(data.sign_agreement_url || data.student_dashboard_url || '#')
  const dashboardUrl = escapeHtml(data.student_dashboard_url || 'https://quni.com.au/student-dashboard')

  const inner = `<h2 style="color: #1A1A2E;">Your tenancy agreement is ready to sign</h2>
<p>Hi ${studentName},</p>
<p>Your residential tenancy agreement for <strong>${propertyAddress}</strong> is ready for electronic signing.</p>
<p>You should also receive a DocuSeal email with your signing link. Use the button below if you prefer to sign from your dashboard.</p>
<a href="${signUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Sign tenancy agreement →</a>
<a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>`

  return {
    subject: `Sign your agreement - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - landlord: $99 charged; bond direct from renter */
export function listingBookingAcceptedLandlord(data) {
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const bookingRef = escapeHtml(data.booking_reference || '-')
  const listingFee = escapeHtml(data.listing_fee_display || '$99.00')
  const bondDeadline = escapeHtml(data.bond_deadline_display || '-')
  const markBondUrl = escapeHtml(data.mark_bond_received_url || data.dashboard_url || '#')
  const reviewUrl = escapeHtml(data.review_url || markBondUrl)
  const bondObligationsBlock =
    typeof data.bond_obligations_html === 'string' && data.bond_obligations_html.trim()
      ? data.bond_obligations_html
      : `<p><strong>Bond:</strong> Collect the bond <strong>directly from the renter</strong> off-platform. When you&apos;ve received it, please confirm on Quni before <strong>${bondDeadline}</strong>.</p>`

  const inner = `<h2 style="color: #1A1A2E;">Listing booking confirmed</h2>
<p>Hi ${landlordName},</p>
<p>You&apos;ve confirmed a Listing booking for <strong>${propertyAddress}</strong> (reference <strong>${bookingRef}</strong>).</p>
<p><strong>Listing fee:</strong> We&apos;ve charged your saved card <strong>${listingFee}</strong> (AUD) for this confirmation.</p>
<p><strong>Tenancy agreement:</strong> We&apos;re preparing your state-appropriate agreement. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>
${bondObligationsBlock}
<p>When bond is received (by you or lodged with the authority), confirm on Quni before <strong>${bondDeadline}</strong> so the booking stays active.</p>
<a href="${reviewUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Open booking review →</a>
<a href="${markBondUrl}" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Mark bond received →</a>`

  return {
    subject: `Listing booking confirmed - ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - landlord: agreement ready to sign (DocuSeal dispatched). */
export function listingAgreementReadyLandlord(data) {
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const reviewUrl = escapeHtml(data.review_url || data.dashboard_url || '#')

  const inner = `<h2 style="color: #1A1A2E;">Tenancy agreement ready to sign</h2>
<p>Hi ${landlordName},</p>
<p>Your residential tenancy agreement for <strong>${propertyAddress}</strong> is ready for electronic signing.</p>
<p>Check your email for the DocuSeal signing link, or open the booking on Quni to sign.</p>
<a href="${reviewUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Open booking review →</a>`

  return {
    subject: `Sign your agreement - ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - renter: bond acknowledged; lease signable */
export function listingBondReceivedRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your booking')
  const signUrl = escapeHtml(data.sign_agreement_url || data.student_dashboard_url || '#')
  const receiptLine = data.receipt_attached
    ? '<p>A PDF bond receipt is attached to this email. You can also download it later from your student dashboard.</p>'
    : ''

  const inner = `<h2 style="color: #1A1A2E;">Bond received - sign your tenancy agreement</h2>
<p>Hi ${studentName},</p>
<p>Your landlord has confirmed bond receipt for <strong>${propertyAddress}</strong>.</p>
${receiptLine}
<p><strong>Next step:</strong> Your tenancy agreement is now ready to sign electronically.</p>
<a href="${signUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Sign tenancy agreement →</a>`

  return {
    subject: `Sign your agreement - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - landlord: bond acknowledged */
export function listingBondReceivedLandlord(data) {
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')
  const receiptLine = data.receipt_attached
    ? '<p>A PDF bond receipt is attached to this email (also saved on the tenancy for the renter to re-download).</p>'
    : ''

  const inner = `<h2 style="color: #1A1A2E;">Bond receipt recorded</h2>
<p>Hi ${landlordName},</p>
<p>Thanks - we&apos;ve recorded bond receipt for your Listing booking at <strong>${propertyAddress}</strong>.</p>
${receiptLine}
<p>The renter can now complete signing on their side. You&apos;ll receive DocuSeal notifications as usual.</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking →</a>`

  return {
    subject: `Bond received recorded - ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - bond window expired (renter) */
export function listingBondPendingExpiredRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const listingsUrl = escapeHtml(data.listings_url || 'https://quni.com.au/listings')

  const inner = `<h2 style="color: #1A1A2E;">Booking lapsed - bond not received in time</h2>
<p>Hi ${studentName},</p>
<p>Your booking for <strong>${propertyAddress}</strong> has ended because bond wasn&apos;t confirmed before the deadline.</p>
<p>You can browse other homes on Quni Living anytime.</p>
<a href="${listingsUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse listings →</a>`

  return {
    subject: `Booking lapsed - ${data.property_address || data.property_title || 'your request'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - bond window expired (landlord); fee refunded */
export function listingBondPendingExpiredLandlord(data) {
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const listingFee = escapeHtml(data.listing_fee_display || '$99.00')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')

  const inner = `<h2 style="color: #1A1A2E;">Booking lapsed - Listing fee refunded</h2>
<p>Hi ${landlordName},</p>
<p>The bond window closed without bond confirmation for <strong>${propertyAddress}</strong>, so this Listing booking has expired.</p>
<p>Your <strong>${listingFee}</strong> Listing fee has been refunded to your original payment method (typically 5–10 business days, depending on your bank).</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Open dashboard →</a>`

  return {
    subject: `Booking lapsed - fee refunded (${data.property_address || data.property_title || 'listing'})`,
    html: wrapContent(inner),
  }
}

/** Listing tier - landlord cancelled (renter) */
export function listingCancelledByLandlordRenter(data) {
  const studentName = escapeHtml(data.student_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const reasonRaw = (data.cancellation_reason || '').trim()
  const reasonBlock =
    reasonRaw.length > 0
      ? `<p><strong>Note from host:</strong><br>${escapeHtml(reasonRaw).replace(/\n/g, '<br>')}</p>`
      : ''
  const listingsUrl = escapeHtml(data.listings_url || 'https://quni.com.au/listings')

  const inner = `<h2 style="color: #1A1A2E;">Booking cancelled by host</h2>
<p>Hi ${studentName},</p>
<p>The host has cancelled your Listing booking for <strong>${propertyAddress}</strong>.</p>
${reasonBlock}
<p>There are many other student-friendly homes on Quni Living - keep browsing when you&apos;re ready.</p>
<a href="${listingsUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse listings →</a>`

  return {
    subject: `Booking cancelled - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** Listing tier - landlord cancelled (landlord confirmation); fee refunded */
export function listingCancelledByLandlordLandlord(data) {
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const listingFee = escapeHtml(data.listing_fee_display || '$99.00')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni.com.au/landlord/dashboard?tab=bookings')

  const inner = `<h2 style="color: #1A1A2E;">Booking cancelled - fee refunded</h2>
<p>Hi ${landlordName},</p>
<p>We&apos;ve cancelled your Listing booking for <strong>${propertyAddress}</strong> as requested.</p>
<p>Your <strong>${listingFee}</strong> Listing fee refund has been submitted to your original payment method.</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Dashboard →</a>`

  return {
    subject: `Cancellation confirmed - fee refunded (${data.property_address || data.property_title || 'listing'})`,
    html: wrapContent(inner),
  }
}

/** Self-serve reinstatement — request to other party */
export function listingReinstatementRequested(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const requesterLabel = escapeHtml(data.requester_label || 'The other party')
  const actionUrl = escapeHtml(data.action_url || 'https://quni.com.au')
  const graceDays =
    data.grace_days != null && Number.isFinite(Number(data.grace_days))
      ? Math.max(0, Math.floor(Number(data.grace_days)))
      : null
  const confirmWindow =
    graceDays != null
      ? `Confirm within <strong>${graceDays} day${graceDays === 1 ? '' : 's'}</strong> if you still want to proceed.`
      : 'Confirm within the grace window if you still want to proceed.'
  const inner = `<h2 style="color: #1A1A2E;">Reinstatement requested</h2>
<p>${requesterLabel} asked to reinstate your booking at <strong>${propertyAddress}</strong>.</p>
<p>${confirmWindow} The room is <strong>not reserved</strong> until bond is marked received.</p>
<a href="${actionUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Review request →</a>`
  return {
    subject: `${data.requester_label || 'Someone'} asked to reinstate your booking at ${data.property_address || data.property_title || 'the property'}`,
    html: wrapContent(inner),
  }
}

/** Self-serve reinstatement — confirmed (both parties) */
export function listingReinstatementConfirmed(data) {
  const name = escapeHtml(data.recipient_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const actionUrl = escapeHtml(data.action_url || 'https://quni.com.au')
  const status = escapeHtml(data.booking_status || 'bond_pending')
  let signingLine = ''
  if (data.signing_resent) {
    signingLine =
      '<p>Signing has been re-sent — check your email for the agreement.</p>'
  } else if (data.signing_resend_failed) {
    signingLine =
      '<p>Signing could not be re-sent automatically. The host can regenerate the agreement from the booking page.</p>'
  }
  const feeLine = data.listing_fee_refunded
    ? '<p><strong>Listing fee:</strong> Booking reinstated; listing fee was refunded on expiry — confirm payment separately.</p>'
    : ''
  const reserveNote =
    status === 'active'
      ? '<p>Bond was already marked received, so this booking is active again.</p>'
      : '<p>The booking is back in <strong>bond pending</strong>. The property is <strong>not reserved</strong> until the bond is marked received.</p>'

  const inner = `<h2 style="color: #1A1A2E;">Booking reinstated</h2>
<p>Hi ${name},</p>
<p>Your booking for <strong>${propertyAddress}</strong> has been reinstated.</p>
${reserveNote}
${signingLine}
${feeLine}
<a href="${actionUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Open booking →</a>`
  return {
    subject: `Booking reinstated - ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

export function listingReinstatementDeclined(data) {
  const name = escapeHtml(data.recipient_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const actionUrl = escapeHtml(data.action_url || 'https://quni.com.au')
  const inner = `<h2 style="color: #1A1A2E;">Reinstatement declined</h2>
<p>Hi ${name},</p>
<p>The other party declined reinstating the booking for <strong>${propertyAddress}</strong>.</p>
<a href="${actionUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking →</a>`
  return {
    subject: `Reinstatement declined - ${data.property_address || data.property_title || 'booking'}`,
    html: wrapContent(inner),
  }
}

export function listingReinstatementCancelled(data) {
  const name = escapeHtml(data.recipient_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const actionUrl = escapeHtml(data.action_url || 'https://quni.com.au')
  const inner = `<h2 style="color: #1A1A2E;">Reinstatement cancelled</h2>
<p>Hi ${name},</p>
<p>The pending reinstatement request for <strong>${propertyAddress}</strong> was cancelled.</p>
<a href="${actionUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View booking →</a>`
  return {
    subject: `Reinstatement cancelled - ${data.property_address || data.property_title || 'booking'}`,
    html: wrapContent(inner),
  }
}

export function listingReinstatementBlockedUnavailable(data) {
  const name = escapeHtml(data.recipient_name || 'there')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const actionUrl = escapeHtml(data.action_url || 'https://quni.com.au/listings')
  const inner = `<h2 style="color: #1A1A2E;">Room no longer available</h2>
<p>Hi ${name},</p>
<p>The booking for <strong>${propertyAddress}</strong> could not be reinstated — the room was taken while this reinstatement was pending.</p>
<a href="${actionUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Continue →</a>`
  return {
    subject: `Reinstatement blocked - ${data.property_address || data.property_title || 'room taken'}`,
    html: wrapContent(inner),
  }
}

/** Landlord-sourced tenant invite — prospect books through Quni verification flow. */
export function tenantInviteProspectEmail(data) {
  const inviteeName = escapeHtml(data.invitee_name || 'there')
  const firstName = inviteeName === 'there' ? 'there' : inviteeName.split(/\s+/)[0]
  const landlordName = escapeHtml(data.landlord_name || 'Your landlord')
  const propertyTitle = escapeHtml(data.property_title || 'a room')
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the listing')
  const inviteUrl = escapeHtml(data.invite_url || 'https://quni.com.au')
  const studentOnlyBlock = data.student_only
    ? `<p style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 8px; padding: 12px 14px; color: #44403c; font-size: 14px;">This room is for <strong>students only</strong>. You&apos;ll verify as a student during signup — the same requirement as anyone booking this listing on Quni.</p>`
    : ''
  const offerAud =
    data.offered_weekly_rent_aud != null && Number.isFinite(Number(data.offered_weekly_rent_aud))
      ? Number(data.offered_weekly_rent_aud)
      : null
  const offerBlock =
    offerAud != null && offerAud > 0
      ? `<p style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 14px;"><strong>Special rent offer:</strong> $${offerAud.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/week${data.offer_reason ? ` — ${escapeHtml(String(data.offer_reason))}` : ''}.</p>`
      : ''

  const inner = `<h2 style="color: #1A1A2E;">You&apos;re invited to book on Quni</h2>
<p>Hi ${firstName},</p>
<p><strong>${landlordName}</strong> invited you to apply for <strong>${propertyTitle}</strong> through Quni Living.</p>
${offerBlock}
<p>Quni handles verified tenancy, the compliant agreement, and e-signing on-platform. You&apos;ll create a renter account, complete verification, then submit your booking request for this room.</p>
${studentOnlyBlock}
<p style="margin: 24px 0;"><a href="${inviteUrl}" style="background-color: #FF6F61; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View invitation &amp; get started →</a></p>
<p style="color: #666666; font-size: 14px;">Or copy this link into your browser:<br><a href="${inviteUrl}" style="color: #FF6F61; word-break: break-all;">${inviteUrl}</a></p>
<p style="color: #888888; font-size: 13px;">This invite link expires in 14 days. If it stops working, ask ${landlordName} to send a fresh link.</p>`

  return {
    subject: `Invitation to book ${data.property_title || 'a room'} on Quni Living`,
    html: wrapContent(inner),
  }
}
