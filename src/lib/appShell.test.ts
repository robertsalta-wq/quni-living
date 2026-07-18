import { describe, expect, it } from 'vitest'
import {
  appShellFocusFallbackPath,
  appShellFocusTitle,
  appShellMode,
  appShellScrollSectionKey,
  isAppShellFocusPath,
  isAppShellPath,
  isDashboardMobileChromePath,
  isListingEditDesktopSectionChrome,
  isListingEditHubChromePath,
} from './appShell'

describe('appShell membership', () => {
  it('frames section destinations', () => {
    expect(appShellMode('/student-dashboard')).toBe('section')
    expect(appShellMode('/student-profile')).toBe('section')
    expect(appShellMode('/landlord/dashboard')).toBe('section')
    expect(appShellMode('/messages')).toBe('section')
    expect(appShellMode('/messages/abc')).toBe('section')
  })

  it('frames focus destinations without dropping to marketing', () => {
    expect(appShellMode('/landlord/property/new')).toBe('focus')
    expect(appShellMode('/landlord/property/new/basic')).toBe('focus')
    expect(appShellMode('/landlord/property/new/section/photos')).toBe('focus')
    expect(appShellMode('/landlord/property/edit/x')).toBe('focus')
    expect(appShellMode('/landlord/property/edit/x/basic')).toBe('focus')
    expect(appShellMode('/landlord/property/edit/x/section/pricing')).toBe('focus')
    expect(appShellMode('/landlord/bookings/b1/review')).toBe('focus')
    expect(appShellMode('/booking/prop1')).toBe('focus')
    expect(isAppShellFocusPath('/booking/prop1')).toBe(true)
    expect(isAppShellPath('/booking/prop1')).toBe(true)
  })

  it('leaves marketing and admin outside the shell', () => {
    expect(appShellMode('/')).toBeNull()
    expect(appShellMode('/listings')).toBeNull()
    expect(appShellMode('/verification')).toBeNull()
    expect(appShellMode('/admin')).toBeNull()
    expect(appShellMode('/admin/bookings')).toBeNull()
    expect(isAppShellPath('/verification')).toBe(false)
  })

  it('isDashboardMobileChromePath requires a framed path and a shell role', () => {
    expect(isDashboardMobileChromePath('renter', '/student-dashboard')).toBe(true)
    expect(isDashboardMobileChromePath('landlord', '/landlord/property/new')).toBe(true)
    expect(isDashboardMobileChromePath('admin', '/landlord/property/edit/1')).toBe(true)
    expect(isDashboardMobileChromePath('renter', '/listings')).toBe(false)
    expect(isDashboardMobileChromePath(null, '/student-dashboard')).toBe(false)
  })

  it('builds scroll keys that distinguish dashboard tabs', () => {
    expect(appShellScrollSectionKey('/student-dashboard', '?tab=bookings')).toBe(
      '/student-dashboard?tab=bookings',
    )
    expect(appShellScrollSectionKey('/landlord/dashboard', '')).toBe('/landlord/dashboard?tab=overview')
    expect(appShellScrollSectionKey('/student-profile', '?tab=bookings')).toBe(
      '/student-profile?tab=bookings',
    )
  })

  it('returns sensible focus back fallbacks', () => {
    expect(appShellFocusFallbackPath('landlord', '/landlord/property/edit/1')).toBe(
      '/landlord/dashboard?tab=listings',
    )
    expect(appShellFocusFallbackPath('renter', '/booking/abc')).toBe('/student-dashboard?tab=bookings')
  })

  it('uses Edit listing / New listing focus titles on base property paths', () => {
    expect(appShellFocusTitle('/landlord/property/edit/1')).toBe('Edit listing')
    expect(appShellFocusTitle('/landlord/property/new')).toBe('New listing')
    expect(appShellFocusTitle('/landlord/property/edit/1/basic')).toBe('Basic info')
  })

  it('applies listing hub chrome only on mobile listing-edit paths', () => {
    expect(isListingEditHubChromePath('/landlord/property/edit/1', true)).toBe(true)
    expect(isListingEditHubChromePath('/landlord/property/edit/1', false)).toBe(false)
    expect(isListingEditHubChromePath('/landlord/dashboard', true)).toBe(false)
  })

  it('uses desktop section chrome for listing edit on sm+', () => {
    expect(isListingEditDesktopSectionChrome('/landlord/property/edit/1', false)).toBe(true)
    expect(isListingEditDesktopSectionChrome('/landlord/property/new', false)).toBe(true)
    expect(isListingEditDesktopSectionChrome('/landlord/property/edit/1', true)).toBe(false)
  })
})
