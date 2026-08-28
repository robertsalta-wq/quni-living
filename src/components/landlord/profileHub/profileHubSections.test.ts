import { describe, expect, it } from 'vitest'
import type { Database } from '../../../lib/database.types'
import {
  LANDLORD_PROFILE_HUB_SECTION_IDS,
  profileHubSectionStatus,
  profileHubSubtitleLines,
} from './profileHubSections'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function baseProfile(overrides: Partial<LandlordRow> = {}): LandlordRow {
  return {
    id: 'p1',
    user_id: 'u1',
    first_name: 'Quinn',
    last_name: 'Lee',
    full_name: 'Quinn Lee',
    phone: '+61410025719',
    email: 'quinn.lee@example.com',
    landlord_type: 'individual',
    company_name: null,
    abn: null,
    address: '18 Malvina Street',
    suburb: 'Ryde',
    state: 'NSW',
    postcode: '2112',
    residence_location: null,
    bio: 'Quiet tidy home near Macquarie Uni.',
    avatar_url: null,
    languages_spoken: ['english'],
    terms_accepted_at: '2026-01-01T00:00:00Z',
    landlord_terms_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_version: '2026-06-05',
    has_landlord_insurance: true,
    insurance_acknowledged_at: '2026-01-01T00:00:00Z',
    stripe_connect_account_id: 'acct_1',
    stripe_charges_enabled: true,
    stripe_customer_id: 'cus_1',
    ...overrides,
  } as LandlordRow
}

describe('profileHubSections', () => {
  it('covers every hub section id from the field audit', () => {
    expect([...LANDLORD_PROFILE_HUB_SECTION_IDS]).toEqual([
      'personal',
      'address',
      'about',
      'agreements',
      'payouts',
      'insurance',
      'languages',
    ])
  })

  it('personal subtitle stacks name, phone, email (and type)', () => {
    const lines = profileHubSubtitleLines('personal', baseProfile(), {
      email: 'quinn.lee@example.com',
      listingBilling: null,
    })
    expect(lines[0]).toBe('Quinn Lee')
    expect(lines).toContain('+61410025719')
    expect(lines).toContain('quinn.lee@example.com')
    expect(lines.some((l) => l.includes('Individual'))).toBe(true)
  })

  it('payouts subtitle for Listing uses the saved card, not Connect', () => {
    const noCard = profileHubSubtitleLines(
      'payouts',
      baseProfile({ stripe_charges_enabled: false, stripe_customer_id: null }),
      { email: null, listingBilling: null },
    )
    expect(noCard).toEqual(['Add a saved card to accept bookings'])

    const customerOnly = profileHubSubtitleLines(
      'payouts',
      baseProfile({ stripe_charges_enabled: false, stripe_customer_id: 'cus_abc' }),
      { email: null, listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null } },
    )
    expect(customerOnly).toEqual(['Add a saved card to accept bookings'])

    const withCard = profileHubSubtitleLines(
      'payouts',
      baseProfile({ stripe_charges_enabled: false, stripe_customer_id: 'cus_abc' }),
      {
        email: null,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: true, card: { brand: 'visa', last4: '4242' } },
      },
    )
    expect(withCard[0]).toMatch(/4242/)
    expect(withCard.join(' ')).not.toMatch(/Stripe Connect/i)
  })

  it('payouts hub status stays incomplete until a payment method exists', () => {
    const p = baseProfile({ stripe_charges_enabled: false, stripe_customer_id: 'cus_abc' })
    expect(profileHubSectionStatus('payouts', p, { moduleEnabled: true, hasPaymentMethod: false, card: null })).toBe(
      'attention',
    )
    expect(
      profileHubSectionStatus('payouts', p, {
        moduleEnabled: true,
        hasPaymentMethod: true,
        card: { brand: 'visa', last4: '4242' },
      }),
    ).toBe('complete')
  })

  it('keeps landlord type + ABN in personal subtitle for company landlords', () => {
    const lines = profileHubSubtitleLines(
      'personal',
      baseProfile({
        landlord_type: 'company',
        company_name: 'Lee Holdings',
        abn: '51824753556',
      }),
      { email: null, listingBilling: null },
    )
    expect(lines.some((l) => l.includes('Company') && l.includes('ABN'))).toBe(true)
  })
})
