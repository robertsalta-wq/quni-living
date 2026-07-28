import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  accommodationUnsetPublishError,
  assertExtractorDraftMayInsertActive,
  canPublishWithAccommodation,
} from './accommodationUnset'
import { applyExtractedListingToDraft } from './applyExtractedDraft'
import { parseExtractedListing } from './parseExtractedListing'
import { emptyDraftBase } from '../listingHubDraft'
import { DEFAULT_BOND_WEEKS } from '../booking/resolveBookingBondAmount'
import { EXTRACT_LISTING_PERFORMS_SUPABASE_WRITES } from '../../../api/ai/extract-listing'
import { ACCOMMODATION_UNSET_PUBLISH_MESSAGE } from './types'

describe('listing extractor guardrails', () => {
  it('blocks publish while accommodation is unset', () => {
    expect(canPublishWithAccommodation(null)).toBe(false)
    expect(accommodationUnsetPublishError(null)).toBe(ACCOMMODATION_UNSET_PUBLISH_MESSAGE)
    expect(canPublishWithAccommodation('entire_property')).toBe(true)
    expect(() =>
      assertExtractorDraftMayInsertActive({
        extractorInitiated: true,
        propertyListingType: null,
      }),
    ).toThrow(/Choose how this is let/)
    expect(() =>
      assertExtractorDraftMayInsertActive({
        extractorInitiated: true,
        propertyListingType: 'private_room_landlord_on_site',
      }),
    ).not.toThrow()
  })

  it('AI route module declares zero Supabase writes', () => {
    expect(EXTRACT_LISTING_PERFORMS_SUPABASE_WRITES).toBe(false)
    const srcPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../api/ai/extract-listing.ts',
    )
    const src = readFileSync(srcPath, 'utf8')
    // Auth may SELECT landlord_profiles; must not mutate listing/money tables
    expect(src).not.toMatch(/\.from\(['"]properties['"]\)\.(insert|update|upsert|delete)/)
    expect(src).not.toMatch(/\.from\(['"]bookings['"]\)\.(insert|update|upsert|delete)/)
    expect(src).not.toMatch(/\.from\(['"]tenancy_documents['"]\)\.(insert|update|upsert|delete)/)
  })

  it('extractor never pre-fills bond, surcharges, or state-gated keys on the draft', () => {
    const extracted = parseExtractedListing(
      JSON.stringify({
        title: { value: 'Room', confidence: 'high' },
        rentPerWeek: { value: '300', confidence: 'high' },
        bondWeeks: { value: '4', confidence: 'high' },
        coupleSurchargePerWeek: { value: '50', confidence: 'high' },
        smokeAlarmType: { value: 'hardwired', confidence: 'high' },
        utilities_services: { electricity: { tenant_pays: true } },
        qldBondRemittancePreference: 'landlord_collects_remits',
      }),
    )!
    const { draft } = applyExtractedListingToDraft(extracted, [], emptyDraftBase())
    expect(draft.bondWeeks).toBe(String(DEFAULT_BOND_WEEKS))
    expect(draft).not.toHaveProperty('smokeAlarmType')
    expect(draft).not.toHaveProperty('utilities_services')
    expect(draft.qldBondRemittancePreference).toBe('tenant_choice')
    expect(draft.propertyListingType).toBeNull()
    // Rent lands in draft/form only — commit still requires normal submit + accuracy attestation
    expect(draft.rentPerWeek).toBe('300')
  })

  it('emptyDraftBase bond weeks matches DEFAULT_BOND_WEEKS (not 4)', () => {
    expect(emptyDraftBase().bondWeeks).toBe(String(DEFAULT_BOND_WEEKS))
    expect(emptyDraftBase().bondWeeks).not.toBe('4')
  })
})
