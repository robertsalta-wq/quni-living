import { describe, expect, it } from 'vitest'

import {
  listingBondPendingExpiredLandlord,
  listingBondPendingExpiredRenter,
  listingBondReceivedLandlord,
  listingBondReceivedRenter,
  listingBookingAcceptedLandlord,
  listingBookingAcceptedRenter,
  listingCancelledByLandlordLandlord,
  listingCancelledByLandlordRenter,
  listingPaymentInstructionsRenter,
  listingRenterPaymentInstructionsBlockHtml,
} from './emailTemplates.js'

const sample = {
  student_name: 'Alex Student',
  landlord_name: 'Jordan Host',
  property_address: '42 Example St, Sydney NSW 2000',
  property_title: 'Sunlit room near campus',
  booking_reference: 'A1B2C3D4',
  bond_deadline_display: '18 May 2026',
  lease_preview_url: 'https://example.test/student-dashboard',
  student_dashboard_url: 'https://example.test/student-dashboard',
  listing_fee_display: '$99.00',
  mark_bond_received_url: 'https://example.test/landlord/bookings/x/review',
  sign_agreement_url: 'https://example.test/student-dashboard',
  listings_url: 'https://example.test/listings',
  dashboard_url: 'https://example.test/landlord/dashboard',
  cancellation_reason: 'No longer available',
}

const paymentBase = {
  student_name: 'Alex Student',
  property_address: '42 Example St, Sydney NSW 2000',
  property_title: 'Sunlit room',
  booking_reference: 'A1B2C3D4',
  bond_deadline_display: '18 May 2026',
  student_dashboard_url: 'https://example.test/student-dashboard',
  weekly_rent: 350,
  bond_amount_aud: 1400,
  move_in_date: '2026-06-01',
  payment_reference: 'Alex Student — 42 Example St, Sydney NSW 2000',
}

const acceptanceGolden = {
  fallback: {
    subject: 'Booking confirmed - arrange bond for 42 Example St, Sydney NSW 2000',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <div style="background-color: #FF6F61; padding: 24px; border-radius: 8px 8px 0 0;">\n    <h1 style="color: white; margin: 0; font-size: 24px;">Quni Living</h1>\n  </div>\n  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">\n    <h2 style="color: #1A1A2E;">Your booking is confirmed - arrange bond</h2>\n<p>Hi Alex Student,</p>\n<p>Good news - your host has accepted your booking for <strong>42 Example St, Sydney NSW 2000</strong> (reference <strong>A1B2C3D4</strong>).</p>\n<p><strong>Tenancy agreement:</strong> We&apos;re preparing your agreement for electronic signing. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>\n<p><strong>Bond payment:</strong> Pay your bond <strong>directly to your host</strong> outside Quni (bank transfer, cash, or as agreed). Quni does not hold bond on Listing stays.</p>\n<p><strong>Deadline:</strong> Please arrange bond payment before <strong>18 May 2026</strong>. If bond isn&apos;t received in time, this booking may lapse.</p>\n<p style="margin-top:12px;font-size:14px;color:#555;">Your host will confirm bond receipt on Quni when they have received it.</p>\n<a href="https://example.test/student-dashboard" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>\n  </div>\n  <div style="text-align: center; padding: 20px; color: #888888; font-size: 12px;">\n    <p>Quni Living - verified accommodation for students, graduates &amp; professionals</p>\n    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>\n  </div>\n</div>',
  },
  nsw_bl: {
    subject: 'Booking confirmed - arrange bond for 42 Example St, Sydney NSW 2000',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <div style="background-color: #FF6F61; padding: 24px; border-radius: 8px 8px 0 0;">\n    <h1 style="color: white; margin: 0; font-size: 24px;">Quni Living</h1>\n  </div>\n  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">\n    <h2 style="color: #1A1A2E;">Your booking is confirmed - arrange bond</h2>\n<p>Hi Alex Student,</p>\n<p>Good news - your host has accepted your booking for <strong>42 Example St, Sydney NSW 2000</strong> (reference <strong>A1B2C3D4</strong>).</p>\n<p><strong>Tenancy agreement:</strong> We&apos;re preparing your agreement for electronic signing. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>\n<div style="margin:16px 0;padding:16px;border:1px solid #e8e8e8;border-radius:8px;background:#fafafa;">\n<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1A1A2E;">How to pay your bond and rent</p>\n<p style="margin:0 0 8px;"><strong>Bond:</strong> $1,400 due by <strong>18 May 2026</strong>.</p><p style="margin:0 0 8px;"><strong>First week&apos;s rent:</strong> $350, due by your move-in date (<strong>2026-06-01</strong>).</p><p style="margin:0 0 8px;">Up front you&apos;ll need <strong>$1,750 in total</strong> — bond $1,400 (by <strong>18 May 2026</strong>) and your first week&apos;s rent $350 (by <strong>2026-06-01</strong>).</p><p style="margin:0 0 8px;"><strong>Rent:</strong> $350 per week, paid weekly in advance from your move-in date (<strong>2026-06-01</strong>).</p>\n<p style="margin:0 0 8px;"><strong>Pay to:</strong><br>\nAccount name: Host Co<br>\nBSB: 123-456<br>\nAccount number: 98765432</p>\n<p style="margin:0 0 8px;"><strong>Reference:</strong> Alex Student — 42 Example St, Sydney NSW 2000</p>\n<p style="margin:0;"><strong>Method:</strong> Fee-free bank transfer.</p>\n</div>\n<p><strong>Deadline:</strong> Please arrange bond payment before <strong>18 May 2026</strong>. If bond isn&apos;t received in time, this booking may lapse.</p>\n<p style="margin-top:12px;font-size:14px;color:#555;">Your host will confirm bond receipt on Quni when they have received it.</p>\n<a href="https://example.test/student-dashboard" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>\n  </div>\n  <div style="text-align: center; padding: 20px; color: #888888; font-size: 12px;">\n    <p>Quni Living - verified accommodation for students, graduates &amp; professionals</p>\n    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>\n  </div>\n</div>',
  },
  qld_bl: {
    subject: 'Booking confirmed - arrange bond for 42 Example St, Sydney NSW 2000',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <div style="background-color: #FF6F61; padding: 24px; border-radius: 8px 8px 0 0;">\n    <h1 style="color: white; margin: 0; font-size: 24px;">Quni Living</h1>\n  </div>\n  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">\n    <h2 style="color: #1A1A2E;">Your booking is confirmed - arrange bond</h2>\n<p>Hi Alex Student,</p>\n<p>Good news - your host has accepted your booking for <strong>42 Example St, Sydney NSW 2000</strong> (reference <strong>A1B2C3D4</strong>).</p>\n<p><strong>Tenancy agreement:</strong> We&apos;re preparing your agreement for electronic signing. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>\n<p><strong>Bond - your choice:</strong></p><div style="margin:16px 0;padding:16px;border:1px solid #e8e8e8;border-radius:8px;background:#fafafa;">\n<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1A1A2E;">How to pay your rent</p>\n<p style="margin:0 0 8px;"><strong>First week&apos;s rent:</strong> $350, due by your move-in date (<strong>2026-06-01</strong>).</p><p style="margin:0 0 8px;"><strong>Rent:</strong> $350 per week, paid weekly in advance from your move-in date (<strong>2026-06-01</strong>).</p>\n<p style="margin:0 0 8px;"><strong>Pay to:</strong><br>\nAccount name: Host Co<br>\nBSB: 123-456<br>\nAccount number: 98765432</p>\n<p style="margin:0 0 8px;"><strong>Reference:</strong> Alex Student — 42 Example St, Sydney NSW 2000</p>\n<p style="margin:0;"><strong>Method:</strong> Fee-free bank transfer.</p>\n</div>\n<p><strong>Deadline:</strong> Please arrange bond payment before <strong>18 May 2026</strong>. If bond isn&apos;t received in time, this booking may lapse.</p>\n<p style="margin-top:12px;font-size:14px;color:#555;">Your host will confirm bond receipt on Quni when they have received it.</p>\n<a href="https://example.test/student-dashboard" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>\n  </div>\n  <div style="text-align: center; padding: 20px; color: #888888; font-size: 12px;">\n    <p>Quni Living - verified accommodation for students, graduates &amp; professionals</p>\n    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>\n  </div>\n</div>',
  },
  statutory_only: {
    subject: 'Booking confirmed - arrange bond for 42 Example St, Sydney NSW 2000',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <div style="background-color: #FF6F61; padding: 24px; border-radius: 8px 8px 0 0;">\n    <h1 style="color: white; margin: 0; font-size: 24px;">Quni Living</h1>\n  </div>\n  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">\n    <h2 style="color: #1A1A2E;">Your booking is confirmed - arrange bond</h2>\n<p>Hi Alex Student,</p>\n<p>Good news - your host has accepted your booking for <strong>42 Example St, Sydney NSW 2000</strong> (reference <strong>A1B2C3D4</strong>).</p>\n<p><strong>Tenancy agreement:</strong> We&apos;re preparing your agreement for electronic signing. You&apos;ll receive a separate email when it&apos;s ready to sign.</p>\n<p><strong>Bond - your choice:</strong></p>\n<p><strong>Deadline:</strong> Please arrange bond payment before <strong>18 May 2026</strong>. If bond isn&apos;t received in time, this booking may lapse.</p>\n<p style="margin-top:12px;font-size:14px;color:#555;">Your host will confirm bond receipt on Quni when they have received it.</p>\n<a href="https://example.test/student-dashboard" style="display:inline-block;margin-top:12px;color:#FF6F61;font-weight:600;">Student dashboard →</a>\n  </div>\n  <div style="text-align: center; padding: 20px; color: #888888; font-size: 12px;">\n    <p>Quni Living - verified accommodation for students, graduates &amp; professionals</p>\n    <p><a href="mailto:hello@quni.com.au" style="color: #FF6F61;">hello@quni.com.au</a> | quni.com.au</p>\n  </div>\n</div>',
  },
} as const

describe('Listing email templates', () => {
  it('renders acceptance templates', () => {
    const r = listingBookingAcceptedRenter(sample)
    const l = listingBookingAcceptedLandlord(sample)
    expect(r.subject.length).toBeGreaterThan(5)
    expect(r.html).toContain('bond payment')
    expect(l.html).toContain('Listing fee')
  })

  it('keeps acceptance email byte-identical after payment block extraction', () => {
    const payout = { account_name: 'Host Co', bsb: '123456', account_number: '98765432' }
    const cases = [
      { key: 'fallback', data: paymentBase },
      {
        key: 'nsw_bl',
        data: {
          ...paymentBase,
          status: 'bond_pending',
          is_boarder_lodger: true,
          bond_scheme_applies: false,
          payout,
        },
      },
      {
        key: 'qld_bl',
        data: {
          ...paymentBase,
          status: 'bond_pending',
          is_boarder_lodger: true,
          bond_scheme_applies: true,
          bond_payment_html: '<p><strong>Bond - your choice:</strong></p>',
          payout,
        },
      },
      {
        key: 'statutory_only',
        data: {
          ...paymentBase,
          bond_payment_html: '<p><strong>Bond - your choice:</strong></p>',
        },
      },
    ] as const

    for (const c of cases) {
      const r = listingBookingAcceptedRenter(c.data)
      const golden = acceptanceGolden[c.key]
      expect(r.subject).toBe(golden.subject)
      expect(r.html).toBe(golden.html)
    }
  })

  it('renders payment instructions renter template', () => {
    const payout = { account_name: 'Host Co', bsb: '123456', account_number: '98765432' }
    const r = listingPaymentInstructionsRenter({
      ...paymentBase,
      is_boarder_lodger: true,
      bond_scheme_applies: false,
      payout,
    })
    expect(r.subject).toContain('Payment instructions')
    expect(r.html).toContain('Payment instructions for your booking')
    expect(r.html).toContain('How to pay your bond and rent')
    expect(r.html).not.toContain('Tenancy agreement')
  })

  it('shared payment block matches acceptance inner block for NSW boarder/lodger', () => {
    const payout = { account_name: 'Host Co', bsb: '123456', account_number: '98765432' }
    const data = {
      ...paymentBase,
      status: 'bond_pending',
      is_boarder_lodger: true,
      bond_scheme_applies: false,
      payout,
    }
    const block = listingRenterPaymentInstructionsBlockHtml(data)
    expect(block).toContain('How to pay your bond and rent')
    expect(block).toContain('123-456')
    expect(block).toContain("First week&apos;s rent:")
    expect(block).toContain('$1,750 in total')
  })

  it('shows first-week and up-front total for bond_pending NSW/VIC only', () => {
    const payout = { account_name: 'Host Co', bsb: '123456', account_number: '98765432' }
    const nswBlock = listingRenterPaymentInstructionsBlockHtml({
      ...paymentBase,
      status: 'bond_pending',
      is_boarder_lodger: true,
      bond_scheme_applies: false,
      payout,
    })
    expect(nswBlock).toContain("First week&apos;s rent:")
    expect(nswBlock).toContain('$1,750 in total')
    expect(nswBlock).toContain('$1,400')
    expect(nswBlock).toContain('$350 per week')

    const qldBlock = listingRenterPaymentInstructionsBlockHtml({
      ...paymentBase,
      status: 'bond_pending',
      is_boarder_lodger: true,
      bond_scheme_applies: true,
      bond_payment_html: '<p>Bond</p>',
      payout,
    })
    expect(qldBlock).toContain("First week&apos;s rent:")
    expect(qldBlock).not.toContain('in total')
  })

  it('omits up-front lines when status is not bond_pending', () => {
    const payout = { account_name: 'Host Co', bsb: '123456', account_number: '98765432' }
    const block = listingRenterPaymentInstructionsBlockHtml({
      ...paymentBase,
      status: 'confirmed',
      is_boarder_lodger: true,
      bond_scheme_applies: false,
      payout,
    })
    expect(block).not.toContain("First week&apos;s rent:")
    expect(block).not.toContain('in total')
    expect(block).toContain('$350 per week')
  })

  it('renders bond-received templates', () => {
    const r = listingBondReceivedRenter(sample)
    const l = listingBondReceivedLandlord(sample)
    expect(r.html).toContain('Sign')
    expect(l.html).toContain('Bond receipt')
  })

  it('renders expiry templates', () => {
    const r = listingBondPendingExpiredRenter(sample)
    const l = listingBondPendingExpiredLandlord(sample)
    expect(r.html).toContain('lapsed')
    expect(l.html).toContain('refunded')
  })

  it('renders cancellation templates', () => {
    const r = listingCancelledByLandlordRenter(sample)
    const l = listingCancelledByLandlordLandlord(sample)
    expect(r.html).toContain('cancelled')
    expect(l.html).toContain('refund')
  })
})
