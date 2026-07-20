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

  it('marks required sections complete when fields are filled', () => {
    const p = baseProfile()
    expect(profileHubSectionStatus('personal', p)).toBe('complete')
    expect(profileHubSectionStatus('address', p)).toBe('complete')
    expect(profileHubSectionStatus('about', p)).toBe('complete')
    expect(profileHubSectionStatus('agreements', p)).toBe('complete')
    expect(profileHubSectionStatus('languages', p)).toBe('complete')
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
