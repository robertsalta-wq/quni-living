import { describe, expect, it } from 'vitest'
import {
  isListingEditSectionPath,
  resolveListingEditDesktopRedirect,
  resolveListingEditMobileHashRedirect,
} from './listingEditDesktopRedirect'

describe('listingEditDesktopRedirect', () => {
  it('maps hub nested paths to long-form base + section hash', () => {
    expect(resolveListingEditDesktopRedirect('/landlord/property/new/basic')).toBe(
      '/landlord/property/new#section-basic-info',
    )
    expect(resolveListingEditDesktopRedirect('/landlord/property/new/section/photos')).toBe(
      '/landlord/property/new#section-photos',
    )
    expect(resolveListingEditDesktopRedirect('/landlord/property/edit/abc/basic')).toBe(
      '/landlord/property/edit/abc#section-basic-info',
    )
    expect(resolveListingEditDesktopRedirect('/landlord/property/edit/abc/section/pricing')).toBe(
      '/landlord/property/edit/abc#section-pricing-availability',
    )
    expect(resolveListingEditDesktopRedirect('/landlord/property/edit/abc/section/property')).toBe(
      '/landlord/property/edit/abc#section-property-details',
    )
  })

  it('returns null for base edit/new paths and owner preview', () => {
    expect(resolveListingEditDesktopRedirect('/landlord/property/new')).toBeNull()
    expect(resolveListingEditDesktopRedirect('/landlord/property/edit/abc')).toBeNull()
    expect(resolveListingEditDesktopRedirect('/landlord/property/edit/abc/preview')).toBeNull()
  })

  it('detects section drill-in paths', () => {
    expect(isListingEditSectionPath('/landlord/property/new/section/rules')).toBe(true)
    expect(isListingEditSectionPath('/landlord/property/edit/abc/section/location')).toBe(true)
    expect(isListingEditSectionPath('/landlord/property/edit/abc')).toBe(false)
  })

  it('restores a desktop hash on the mobile hub URL to the section route', () => {
    expect(
      resolveListingEditMobileHashRedirect(
        '/landlord/property/edit/abc',
        '#section-pricing-availability',
      ),
    ).toBe('/landlord/property/edit/abc/section/pricing')
    expect(
      resolveListingEditMobileHashRedirect('/landlord/property/new', '#section-basic-info'),
    ).toBe('/landlord/property/new/basic')
    expect(resolveListingEditMobileHashRedirect('/landlord/property/edit/abc', '')).toBeNull()
    expect(
      resolveListingEditMobileHashRedirect(
        '/landlord/property/edit/abc/section/pricing',
        '#section-pricing-availability',
      ),
    ).toBeNull()
  })
})
