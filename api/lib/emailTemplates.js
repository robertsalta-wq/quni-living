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
    <p>Quni Living — Australia's student accommodation marketplace</p>
    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>
  </div>
</div>`
}

function formatAudFromDollars(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return `$${x.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatAudFromCents(cents) {
  const n = Number(cents)
  if (!Number.isFinite(n)) return '—'
  return `$${(n / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** @param {object} data */
export function bookingRequestLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'Property')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const studentName = escapeHtml(data.student_name || 'Student')
  const studentUniversity = escapeHtml(data.student_university || '—')
  const studentCourse = escapeHtml(data.student_course || '—')
  const moveInDate = escapeHtml(data.move_in_date || '—')
  const leaseLength = escapeHtml(data.lease_length || '—')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni-living.vercel.app/landlord/dashboard?tab=bookings')
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
<p style="color: #FF6F61;"><strong>⏰ You have 48 hours to respond before this request expires.</strong></p>
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
  const moveInDate = escapeHtml(data.move_in_date || '—')
  const leaseLength = escapeHtml(data.lease_length || '—')
  const weeklyRent = formatAudFromDollars(data.weekly_rent)
  const landlordName = escapeHtml(data.landlord_name || '—')
  const landlordPhone = escapeHtml(data.landlord_phone || '—')
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni-living.vercel.app/student-dashboard')

  const inner = `<h2 style="color: #1A1A2E;">Booking confirmed! 🎉</h2>
<p>Hi ${studentName},</p>
<p>Great news — your booking for <strong>${propertyAddress}</strong> has been confirmed.</p>
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
    subject: `Your booking is confirmed — ${data.property_address || data.property_title || 'your booking'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingConfirmedLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const studentName = escapeHtml(data.student_name || 'Student')
  const moveInDate = escapeHtml(data.move_in_date || '—')
  const leaseLength = escapeHtml(data.lease_length || '—')
  const weeklyRent = formatAudFromDollars(data.weekly_rent)
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const bondAmountFormatted =
    data.bond_amount_formatted ||
    (data.bond_amount_cents != null ? formatAudFromCents(data.bond_amount_cents) : '')
  const bondAuthority = escapeHtml(data.bond_authority || '')
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni-living.vercel.app/landlord/dashboard?tab=bookings')

  const bondBlock =
    bondAmountFormatted && bondAuthority
      ? `<p><strong>Bond record:</strong> We&apos;ve logged a bond of <strong>${escapeHtml(bondAmountFormatted)}</strong> (four weeks&apos; rent) for this booking. Please collect the bond from the student and lodge it with <strong>${bondAuthority}</strong> within the timeframe required in your state. Quni Living has recorded your acknowledgement of this obligation.</p>`
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
    subject: `You confirmed a booking — ${data.property_address || data.property_title || 'your listing'}`,
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
    data.reply_url || 'https://quni-living.vercel.app/student-profile?tab=bookings',
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
    subject: `Your host has a question — ${data.property_address || data.property_title || 'booking request'}`,
    html: wrapContent(inner),
  }
}

/** Auto-declined because another student was confirmed for the same property. */
/** @param {object} data */
export function bookingAutoDeclinedPropertyTakenStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')
  const listingsUrl = escapeHtml(data.listings_url || 'https://quni-living.vercel.app/listings')

  const inner = `<h2 style="color: #1A1A2E;">Update on your booking request</h2>
<p>Hi ${studentName},</p>
<p>Thank you for your interest in <strong>${propertyAddress}</strong> through Quni Living.</p>
<p>Another student has been selected for this property, so we are unable to proceed with your request.</p>
<p>Your booking deposit will be refunded to your original payment method within <strong>5–7 business days</strong>. You will not be charged for this listing.</p>
<p>There are many other great homes for students on Quni Living — we encourage you to keep browsing and find the right place for you.</p>
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
<p>Don't be discouraged — there are plenty of great properties on Quni Living. Keep searching!</p>
<a href="https://quni-living.vercel.app/listings" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse more properties →</a>`

  return {
    subject: `Booking request update — ${data.property_address || data.property_title || 'your request'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function bookingExpiredStudent(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'the property')
  const studentName = escapeHtml(data.student_name || 'there')

  const inner = `<h2 style="color: #1A1A2E;">Booking request expired</h2>
<p>Hi ${studentName},</p>
<p>Your booking request for <strong>${propertyAddress}</strong> has expired because the landlord did not respond within 48 hours.</p>
<p>You have not been charged — your payment authorisation has been cancelled.</p>
<a href="https://quni-living.vercel.app/listings" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Browse more properties →</a>`

  return {
    subject: `Your booking request has expired — ${data.property_address || data.property_title || 'your request'}`,
    html: wrapContent(inner),
  }
}

/** @param {object} data */
export function depositReleasedLandlord(data) {
  const propertyAddress = escapeHtml(data.property_address || data.property_title || 'your listing')
  const landlordName = escapeHtml(data.landlord_name || 'there')
  const depositAmount = data.deposit_amount_formatted || formatAudFromCents(data.deposit_amount_cents)
  const dashboardUrl = escapeHtml(data.dashboard_url || 'https://quni-living.vercel.app/landlord/dashboard?tab=bookings')

  const inner = `<h2 style="color: #1A1A2E;">Deposit released</h2>
<p>Hi ${landlordName},</p>
<p>The booking deposit of <strong>${escapeHtml(depositAmount)}</strong> for <strong>${propertyAddress}</strong> has been released to your connected bank account.</p>
<p>It should appear in your account within 2-3 business days depending on your bank.</p>
<a href="${dashboardUrl}" style="background-color: #FF6F61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View dashboard →</a>`

  return {
    subject: `Your booking deposit has been released — ${data.property_address || data.property_title || 'your listing'}`,
    html: wrapContent(inner),
  }
}
