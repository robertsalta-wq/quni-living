import { describe, expect, it } from 'vitest'
import {
  appChromeBarKind,
  appChromeHeaderKind,
  appChromeMode,
  appShellBackDestination,
  appShellFocusFallbackPath,
  appShellFocusTitle,
  appShellMode,
  appShellScrollSectionKey,
  isAppShellFocusPath,
  isAppShellPath,
  isDashboardMobileChromePath,
  isListingEditDesktopSectionChrome,
  isListingEditHubChromePath,
  isLandlordDesktopAppChrome,
  type AppChromeMode,
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

  it('uses desktop listing-edit path gate on sm+ (sticky offsets)', () => {
    expect(isListingEditDesktopSectionChrome('/landlord/property/edit/1', false)).toBe(true)
    expect(isListingEditDesktopSectionChrome('/landlord/property/new', false)).toBe(true)
    expect(isListingEditDesktopSectionChrome('/landlord/property/edit/1', true)).toBe(false)
  })

  it('uses authenticated app chrome for landlord section and listing-edit on sm+', () => {
    expect(isLandlordDesktopAppChrome('landlord', '/landlord/dashboard', false)).toBe(true)
    expect(isLandlordDesktopAppChrome('landlord', '/messages', false)).toBe(true)
    expect(isLandlordDesktopAppChrome('landlord', '/landlord/property/edit/1', false)).toBe(true)
    expect(isLandlordDesktopAppChrome('landlord', '/landlord/property/new', false)).toBe(true)
    expect(isLandlordDesktopAppChrome('landlord', '/landlord/dashboard', true)).toBe(false)
    expect(isLandlordDesktopAppChrome('landlord', '/landlord/property/edit/1', true)).toBe(false)
    expect(isLandlordDesktopAppChrome('renter', '/student-dashboard', false)).toBe(false)
  })
})

describe('appChromeMode — Template System Brief (docs/app-chrome-brief.md) §3 matrix', () => {
  type Case = { path: string; mobile: AppChromeMode; desktop: AppChromeMode }

  const cases: Case[] = [
    // Map — dashboards, messages, profile (§3 rows 1-4)
    { path: '/landlord/dashboard', mobile: 'map', desktop: 'map' },
    { path: '/student-dashboard', mobile: 'map', desktop: 'map' },
    { path: '/student-profile', mobile: 'map', desktop: 'map' },
    { path: '/student/profile', mobile: 'map', desktop: 'map' },
    { path: '/messages', mobile: 'map', desktop: 'map' },
    { path: '/messages/abc123', mobile: 'map', desktop: 'map' },
    // Listing edit / new — Option A: task on mobile, Map-shaped on desktop (§2, §3 rows 5-8)
    { path: '/landlord/property/edit/1', mobile: 'task', desktop: 'map' },
    { path: '/landlord/property/new', mobile: 'task', desktop: 'map' },
    { path: '/landlord/property/edit/1/basic', mobile: 'task', desktop: 'map' },
    { path: '/landlord/property/new/basic', mobile: 'task', desktop: 'map' },
    { path: '/landlord/property/edit/1/section/pricing', mobile: 'task', desktop: 'map' },
    { path: '/landlord/property/new/section/photos', mobile: 'task', desktop: 'map' },
    // task-header on mobile / Map on desktop — booking review + apply stay in dashboard chrome on sm+
    { path: '/landlord/bookings/b1/review', mobile: 'task-header', desktop: 'map' },
    { path: '/booking/prop1', mobile: 'task-header', desktop: 'map' },
  ]

  it.each(cases)('$path — mobile=$mobile, desktop=$desktop', ({ path, mobile, desktop }) => {
    expect(appChromeMode(path, true)).toBe(mobile)
    expect(appChromeMode(path, false)).toBe(desktop)
  })

  it('is null outside the app shell (marketing / admin)', () => {
    expect(appChromeMode('/', true)).toBeNull()
    expect(appChromeMode('/', false)).toBeNull()
    expect(appChromeMode('/listings', false)).toBeNull()
    expect(appChromeMode('/admin', false)).toBeNull()
    expect(appChromeMode('/admin/bookings', true)).toBeNull()
  })

  it('gives the header its back-control destination (`‹ {destination}`, §1a)', () => {
    expect(appShellBackDestination('/landlord/property/edit/1')).toBe('Listings')
    expect(appShellBackDestination('/landlord/property/new/section/photos')).toBe('Listings')
    expect(appShellBackDestination('/landlord/bookings/b1/review')).toBe('Bookings')
    expect(appShellBackDestination('/booking/prop1')).toBe('Bookings')
  })
})

describe('appChrome coherence — §2 "both shells render the shape the mode declares"', () => {
  it('map → map header, nav bar on mobile, no bar on desktop', () => {
    expect(appChromeHeaderKind('map')).toBe('map')
    expect(appChromeBarKind('map', true)).toBe('nav')
    expect(appChromeBarKind('map', false)).toBe('none')
  })

  it('task → task header, action bar on mobile, no bar on desktop', () => {
    expect(appChromeHeaderKind('task')).toBe('task')
    expect(appChromeBarKind('task', true)).toBe('action')
    expect(appChromeBarKind('task', false)).toBe('none')
  })

  it('task-header (Phase 1) → task header, but Nav bar still on mobile — a pass, not a desync', () => {
    expect(appChromeHeaderKind('task-header')).toBe('task')
    expect(appChromeBarKind('task-header', true)).toBe('nav')
    expect(appChromeBarKind('task-header', false)).toBe('none')
  })

  it('never desyncs: every surface × device resolves to exactly one coherent (header, bar) pair', () => {
    const paths = [
      '/landlord/dashboard',
      '/student-dashboard',
      '/messages',
      '/landlord/property/edit/1',
      '/landlord/property/edit/1/section/pricing',
      '/landlord/bookings/b1/review',
      '/booking/prop1',
    ]
    for (const path of paths) {
      for (const isMobile of [true, false]) {
        const mode = appChromeMode(path, isMobile)
        expect(mode).not.toBeNull()
        if (!mode) continue
        // A `task` surface must never render a Nav bar; a `map` surface never an Action bar.
        const bar = appChromeBarKind(mode, isMobile)
        if (mode === 'task') expect(bar).not.toBe('nav')
        if (mode === 'map') expect(bar).not.toBe('action')
      }
    }
  })
})
