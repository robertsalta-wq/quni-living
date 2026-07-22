import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf8')
}

/** Student / shared renter surfaces that mount BookingLeasePanel — must never host the landlord terms editor. */
const RENTER_SURFACES = [
  'src/pages/StudentDashboard.tsx',
  'src/components/booking/RenterBookingZones.tsx',
  'src/components/booking/BookingLeasePanel.tsx',
] as const

const EDITOR_MARKERS = [
  'LandlordBookingTermsEditor',
  'listingBookingTermsEditorEligible',
  'booking-update-terms',
  'Edit booking terms',
  'BookingReviewTermsRail',
] as const

describe('landlord booking terms editor privilege boundary', () => {
  for (const surface of RENTER_SURFACES) {
    it(`${surface} must not import or render the landlord terms editor`, () => {
      const src = readSrc(surface)
      for (const marker of EDITOR_MARKERS) {
        expect(src, `${surface} must not contain ${marker}`).not.toContain(marker)
      }
    })
  }

  it('renter BookingLeasePanel call sites do not pass landlord-only regenerate/prepare props that imply edit UI', () => {
    const src = readSrc('src/components/booking/RenterBookingZones.tsx')
    expect(src).toMatch(/<BookingLeasePanel\s+bookingId=\{[^}]+\}\s+embedded\s*\/>/)
    expect(src).not.toMatch(/allowRegenerateAgreement/)
    expect(src).not.toMatch(/allowPrepareRetry/)
  })

  it('landlord review page mounts the terms rail, which is the sole UI mount of LandlordBookingTermsEditor', () => {
    const review = readSrc('src/pages/landlord/LandlordBookingReviewPage.tsx')
    expect(review).toContain('BookingReviewTermsRail')
    // Editors must not mount directly on the page — only via the rail modal.
    expect(review).not.toContain('LandlordBookingTermsEditor')
    expect(review).not.toContain('LandlordBookingAgreedRentEditor')

    const rail = readSrc('src/components/booking/review/BookingReviewTermsRail.tsx')
    expect(rail).toContain('LandlordBookingTermsEditor')
    expect(rail).toContain('LandlordBookingAgreedRentEditor')
    expect(rail).toContain('listingBookingTermsEditorEligible')

    const editorModule = readSrc('src/components/landlord/LandlordBookingTermsEditor.tsx')
    expect(editorModule).toContain('Edit booking terms')
    expect(editorModule).toContain('booking-update-terms')
  })

  it('applicant profile drawer is type-enforced to LandlordSafeStudentSnapshot and does not widen PII', () => {
    const drawer = readSrc('src/components/landlord/LandlordApplicantProfileDrawer.tsx')
    expect(drawer).toContain('LandlordSafeStudentSnapshot')
    // Tripwire: no contact/identity document fields introduced beyond the safe snapshot.
    // Matches on the constraint doc-comment are allowed; field reads/renders are not.
    const withoutDocComments = drawer
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n')
    expect(withoutDocComments).not.toMatch(/\bemail\b/i)
    expect(withoutDocComments).not.toMatch(/\bphone\b/i)
    expect(withoutDocComments).not.toMatch(/\bdate_of_birth\b/i)
    expect(withoutDocComments).not.toMatch(/\bemergency\b/i)
    expect(withoutDocComments).not.toMatch(/\bdocument_url\b/i)
  })
})
