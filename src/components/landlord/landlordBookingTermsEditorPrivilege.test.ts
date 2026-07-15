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
    expect(src).toMatch(/<BookingLeasePanel\s+bookingId=\{[^}]+\}\s*\/>/)
    expect(src).not.toMatch(/allowRegenerateAgreement/)
    expect(src).not.toMatch(/allowPrepareRetry/)
  })

  it('landlord review page is the only UI mount of LandlordBookingTermsEditor', () => {
    const review = readSrc('src/pages/landlord/LandlordBookingReviewPage.tsx')
    expect(review).toContain('LandlordBookingTermsEditor')
    expect(review).toContain('listingBookingTermsEditorEligible')

    const editorModule = readSrc('src/components/landlord/LandlordBookingTermsEditor.tsx')
    expect(editorModule).toContain('Edit booking terms')
    expect(editorModule).toContain('booking-update-terms')
  })
})
