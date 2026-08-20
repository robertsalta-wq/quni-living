import { describe, expect, it } from 'vitest'
import {
  ADMIN_ACTIVATE_UNATTESTED_MESSAGE,
  adminNewListingPath,
  adminNewListingStatus,
  adminPropertyActivateBlockedReason,
  filterLandlordOptionsForSearch,
  listingStateFromLandlordProfile,
  parseAdminConciergeLandlordProfileId,
  skipListingAttestationsForAdmin,
} from './adminConciergeListing'

describe('adminConciergeListing', () => {
  it('parses landlord profile ids from the query param', () => {
    expect(parseAdminConciergeLandlordProfileId('d2d97e22-7f88-4efc-b2f1-af50c7fc7da0')).toBe(
      'd2d97e22-7f88-4efc-b2f1-af50c7fc7da0',
    )
    expect(parseAdminConciergeLandlordProfileId(' not-a-uuid ')).toBe(null)
    expect(parseAdminConciergeLandlordProfileId('')).toBe(null)
  })

  it('builds the admin new-listing path', () => {
    expect(adminNewListingPath()).toBe('/landlord/property/new')
    expect(adminNewListingPath('d2d97e22-7f88-4efc-b2f1-af50c7fc7da0')).toBe(
      '/landlord/property/new?landlord=d2d97e22-7f88-4efc-b2f1-af50c7fc7da0',
    )
  })

  it('forces admin creates to draft', () => {
    expect(adminNewListingStatus(true, true)).toBe('draft')
    expect(adminNewListingStatus(true, false)).toBe('draft')
    expect(adminNewListingStatus(false, true)).toBe('active')
    expect(adminNewListingStatus(false, false)).toBe('draft')
  })

  it('skips attestations only for admin', () => {
    expect(skipListingAttestationsForAdmin(true)).toBe(true)
    expect(skipListingAttestationsForAdmin(false)).toBe(false)
  })

  it('maps landlord profile state onto listing state', () => {
    expect(listingStateFromLandlordProfile('qld')).toBe('QLD')
    expect(listingStateFromLandlordProfile('NSW')).toBe('NSW')
    expect(listingStateFromLandlordProfile('California')).toBe(null)
    expect(listingStateFromLandlordProfile(null)).toBe(null)
  })

  it('filters landlord options by name or email', () => {
    const opts = [
      {
        id: 'd2d97e22-7f88-4efc-b2f1-af50c7fc7da0',
        label: 'David Schacht',
        email: 'david.rizal@outlook.com.au',
        state: 'QLD',
      },
      { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: 'Other Host', email: 'other@example.com', state: 'NSW' },
    ]
    expect(filterLandlordOptionsForSearch(opts, 'david')).toEqual([opts[0]])
    expect(filterLandlordOptionsForSearch(opts, 'OUTLOOK')).toEqual([opts[0]])
    expect(filterLandlordOptionsForSearch(opts, opts[0].id)).toEqual([opts[0]])
    expect(filterLandlordOptionsForSearch(opts, '')).toEqual(opts)
  })

  it('blocks admin activate when authority to let is missing', () => {
    expect(
      adminPropertyActivateBlockedReason({ nextStatus: 'active', authorityToLetAttestedAt: null }),
    ).toBe(ADMIN_ACTIVATE_UNATTESTED_MESSAGE)
    expect(
      adminPropertyActivateBlockedReason({
        nextStatus: 'draft',
        authorityToLetAttestedAt: null,
      }),
    ).toBe(null)
    expect(
      adminPropertyActivateBlockedReason({
        nextStatus: 'active',
        authorityToLetAttestedAt: '2026-08-20T10:00:00.000Z',
      }),
    ).toBe(null)
  })
})
