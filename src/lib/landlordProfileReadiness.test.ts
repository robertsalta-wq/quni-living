import { describe, expect, it } from 'vitest'
import { NON_DISCRIMINATION_POLICY_VERSION } from './nonDiscriminationPolicy'
import { landlordProfileHostIdentityVerified } from './landlordBookingConfirmGate'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'
import {
  computeLandlordReadiness,
  isLandlordPersonalSectionComplete,
  isLandlordPublishComplete,
  landlordPublishFirstIncompleteAction,
} from './landlordProfileReadiness'
import type { Database } from './database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function baseProfile(overrides: Partial<LandlordRow> = {}): LandlordRow {
  return {
    id: 'lp1',
    user_id: 'u1',
    first_name: 'Pat',
    last_name: 'Lee',
    phone: '0400000000',
    bio: 'A short landlord bio.',
    landlord_type: 'individual',
    address: '1 Test St',
    suburb: 'Sydney',
    postcode: '2000',
    state: 'NSW',
    terms_accepted_at: '2026-01-01T00:00:00Z',
    landlord_terms_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_version: NON_DISCRIMINATION_POLICY_VERSION,
    onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_customer_id: null,
    admin_override_verified: false,
    avatar_url: null,
    residence_location: null,
    ...overrides,
  } as LandlordRow
}

describe('landlordProfileReadiness publish gate', () => {
  it('is complete when all four publish sections pass', () => {
    const r = computeLandlordReadiness(baseProfile())
    expect(r.publish.complete).toBe(true)
    expect(r.publish.doneCount).toBe(4)
    expect(r.publish.missing).toEqual([])
    expect(isLandlordPublishComplete(baseProfile())).toBe(true)
  })

  it('blocks publish when address fields are missing', () => {
    const p = baseProfile({ address: null })
    const r = computeLandlordReadiness(p)
    expect(r.publish.complete).toBe(false)
    expect(r.publish.sections.address).toBe(false)
    expect(r.publish.missing).toContain('address')
    expect(isLandlordPublishComplete(p)).toBe(false)
  })

  it('requires residence_location when state is not NSW', () => {
    const withoutResidence = baseProfile({ state: 'VIC', residence_location: null })
    expect(computeLandlordReadiness(withoutResidence).publish.sections.address).toBe(false)

    const withResidence = baseProfile({ state: 'VIC', residence_location: 'Melbourne' })
    expect(computeLandlordReadiness(withResidence).publish.sections.address).toBe(true)
  })

  it('does not require residence_location for NSW', () => {
    const p = baseProfile({ state: 'NSW', residence_location: null })
    expect(computeLandlordReadiness(p).publish.sections.address).toBe(true)
  })

  it('does not block publish when avatar_url is absent', () => {
    const p = baseProfile({ avatar_url: null })
    expect(computeLandlordReadiness(p).publish.complete).toBe(true)
  })

  it('individual landlord passes personal without company fields', () => {
    const p = baseProfile({ landlord_type: 'individual', company_name: null, abn: null })
    expect(isLandlordPersonalSectionComplete(p)).toBe(true)
    expect(computeLandlordReadiness(p).publish.sections.personal).toBe(true)
  })

  it('company landlord requires company_name and ABN', () => {
    const incomplete = baseProfile({
      landlord_type: 'company',
      company_name: null,
      abn: null,
    })
    expect(isLandlordPersonalSectionComplete(incomplete)).toBe(false)
    expect(computeLandlordReadiness(incomplete).publish.complete).toBe(false)

    const complete = baseProfile({
      landlord_type: 'company',
      company_name: 'Acme Pty Ltd',
      abn: '12345678901',
    })
    expect(isLandlordPersonalSectionComplete(complete)).toBe(true)
  })

  it('trust landlord requires company_name and ABN', () => {
    const incomplete = baseProfile({ landlord_type: 'trust', company_name: 'Family Trust', abn: null })
    expect(isLandlordPersonalSectionComplete(incomplete)).toBe(false)

    const complete = baseProfile({
      landlord_type: 'trust',
      company_name: 'Family Trust',
      abn: '98765432109',
    })
    expect(isLandlordPersonalSectionComplete(complete)).toBe(true)
  })

  it('orders missing keys personal → address → about → agreements', () => {
    const p = baseProfile({
      first_name: null,
      address: null,
      bio: null,
      terms_accepted_at: null,
    })
    expect(computeLandlordReadiness(p).publish.missing).toEqual([
      'personal',
      'address',
      'about',
      'agreements',
    ])
  })

  it('routes missing address to complete-address action', () => {
    const action = landlordPublishFirstIncompleteAction(baseProfile({ suburb: '' }))
    expect(action).toEqual({
      label: 'Complete your address →',
      href: landlordDashboardProfilePath('address'),
    })
  })
})

describe('landlordProfileReadiness accept display', () => {
  it('identityVerified mirrors landlordProfileHostIdentityVerified', () => {
    const p = baseProfile({ stripe_charges_enabled: true })
    const r = computeLandlordReadiness(p)
    expect(r.accept.identityVerified).toBe(landlordProfileHostIdentityVerified(p, 'listing'))
    expect(r.accept.identityVerified).toBe(true)
  })

  it('listing admin override counts as identity verified', () => {
    const p = baseProfile({ admin_override_verified: true, stripe_charges_enabled: false })
    expect(computeLandlordReadiness(p).accept.identityVerified).toBe(true)
  })

  it('savedCard reflects stripe_customer_id only', () => {
    expect(computeLandlordReadiness(baseProfile()).accept.savedCard).toBe(false)
    expect(
      computeLandlordReadiness(baseProfile({ stripe_customer_id: 'cus_abc' })).accept.savedCard,
    ).toBe(true)
  })

  it('accept.complete requires card on listing tier', () => {
    const identityOnly = baseProfile({ stripe_charges_enabled: true })
    expect(computeLandlordReadiness(identityOnly).accept.complete).toBe(false)

    const full = baseProfile({ stripe_charges_enabled: true, stripe_customer_id: 'cus_abc' })
    expect(computeLandlordReadiness(full).accept.complete).toBe(true)
  })
})

describe('landlordProfileReadiness phase', () => {
  it('starts in publishing when publish incomplete', () => {
    expect(computeLandlordReadiness(baseProfile({ bio: null })).phase).toBe('publishing')
  })

  it('moves to accepting when publish complete but identity pending', () => {
    expect(computeLandlordReadiness(baseProfile()).phase).toBe('accepting')
  })

  it('is complete when publish and identity verified', () => {
    const p = baseProfile({ stripe_charges_enabled: true })
    expect(computeLandlordReadiness(p).phase).toBe('complete')
  })
})
