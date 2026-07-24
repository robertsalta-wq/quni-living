import { describe, expect, it } from 'vitest'
import {
  LANDLORD_BOOKINGS_TAB_HREF,
  LANDLORD_LISTINGS_TAB_HREF,
  appChromeBarContents,
  appChromeHeaderInner,
  appShellFocusFallbackPath,
  isListingEditPath,
} from './appShell'
import {
  LANDLORD_LISTINGS_EXIT_HREF,
  LANDLORD_NAV_BAR_ITEMS,
  listingBasicInfoActionBarItemSpecs,
  listingHubActionBarItemSpecs,
} from './appChromeBarItems'
import { CHROME_HEADER_INNER_CLASS, CHROME_HEADER_OUTER_CLASS, CHROME_HEADER_ROW_CLASS } from '../components/ChromeHeaderShell'
import { SITE_CONTENT_MAX_CLASS } from './site'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('decoupled chrome — header vs bar are independent', () => {
  it('landlord listing edit: dashboard header + page-actions bar on mobile', () => {
    const path = '/landlord/property/edit/abc'
    expect(appChromeHeaderInner(path, 'landlord', true)).toBe('dashboard')
    expect(appChromeHeaderInner(path, 'landlord', false)).toBe('dashboard')
    expect(appChromeBarContents(path, 'landlord', true)).toBe('page-actions')
    expect(appChromeBarContents(path, 'landlord', false)).toBe('none')
  })

  it('landlord dashboard browse: dashboard header + nav bar on mobile', () => {
    const path = '/landlord/dashboard'
    expect(appChromeHeaderInner(path, 'landlord', true)).toBe('dashboard')
    expect(appChromeBarContents(path, 'landlord', true)).toBe('nav')
  })

  it('landlord profile hub: nav bar; section drill-in: page-actions', () => {
    const path = '/landlord/dashboard'
    expect(appChromeBarContents(path, 'landlord', true, '?tab=profile')).toBe('nav')
    expect(appChromeBarContents(path, 'landlord', true, '?tab=profile&section=personal')).toBe(
      'page-actions',
    )
    expect(appChromeBarContents(path, 'landlord', false, '?tab=profile&section=personal')).toBe(
      'none',
    )
  })

  it('renter profile hub: nav bar; section drill-in: page-actions', () => {
    const path = '/student-profile'
    expect(appChromeBarContents(path, 'renter', true)).toBe('nav')
    expect(appChromeBarContents(path, 'renter', true, '?section=personal')).toBe('page-actions')
    expect(appChromeBarContents(path, 'renter', false, '?section=personal')).toBe('none')
  })

  it('landlord booking review: dashboard header + nav (deferred page-actions)', () => {
    const path = '/landlord/bookings/b1/review'
    expect(appChromeHeaderInner(path, 'landlord', true)).toBe('dashboard')
    expect(appChromeBarContents(path, 'landlord', true)).toBe('nav')
  })

  it('header staying dashboard does not force bar to nav on listing edit', () => {
    const path = '/landlord/property/edit/1/basic'
    expect(appChromeHeaderInner(path, 'landlord', true)).toBe('dashboard')
    expect(appChromeBarContents(path, 'landlord', true)).not.toBe('nav')
    expect(appChromeBarContents(path, 'landlord', true)).toBe('page-actions')
  })

  it('marketing / admin paths are outside the app shell', () => {
    expect(appChromeHeaderInner('/', 'landlord', true)).toBeNull()
    expect(appChromeBarContents('/', 'landlord', true)).toBe('none')
    expect(appChromeHeaderInner('/admin', 'admin', true)).toBeNull()
  })
})

describe('bar item sets — browse vs edit', () => {
  it('browse nav has the five landlord sections', () => {
    expect(LANDLORD_NAV_BAR_ITEMS.map((i) => i.id)).toEqual([
      'overview',
      'listings',
      'messages',
      'bookings',
      'profile',
    ])
  })

  it('hub page-actions include ‹ Listings exit + Health + Preview', () => {
    const ids = listingHubActionBarItemSpecs(true).map((i) => i.id)
    expect(ids).toEqual(['exit-listings', 'health', 'preview'])
    expect(LANDLORD_LISTINGS_EXIT_HREF).toBe(LANDLORD_LISTINGS_TAB_HREF)
    expect(LANDLORD_LISTINGS_EXIT_HREF).toBe('/landlord/dashboard?tab=listings')
  })

  it('drill-in page-actions are Cancel · Save (no separate ‹ Listings)', () => {
    const ids = listingBasicInfoActionBarItemSpecs({
      isSetupMode: false,
      saving: false,
      canSubmit: true,
    }).map((i) => i.id)
    expect(ids).toEqual(['cancel', 'save'])
    expect(ids).not.toContain('exit-listings')
  })
})

describe('fixed-URL exits — never history.back', () => {
  it('listing edit fallback is listings tab', () => {
    expect(appShellFocusFallbackPath('landlord', '/landlord/property/edit/1')).toBe(
      LANDLORD_LISTINGS_TAB_HREF,
    )
    expect(appShellFocusFallbackPath('landlord', '/landlord/property/new/basic')).toBe(
      LANDLORD_LISTINGS_TAB_HREF,
    )
  })

  it('booking review fallback is bookings tab', () => {
    expect(appShellFocusFallbackPath('landlord', '/landlord/bookings/b1/review')).toBe(
      LANDLORD_BOOKINGS_TAB_HREF,
    )
  })

  it('AppHeader onBack does not call navigate(-1)', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/appShell/AppHeader.tsx'), 'utf8')
    const onBack = src.match(/function onBack\(\) \{[\s\S]*?\n  \}/)?.[0] ?? ''
    expect(onBack.length).toBeGreaterThan(40)
    expect(onBack).not.toMatch(/navigate\(\s*-1\s*\)/)
    expect(onBack).not.toMatch(/history\.back/)
    expect(onBack).toMatch(/appShellFocusFallbackPath/)
  })
})

describe('one header geometry shell (marketing reference)', () => {
  it('exports marketing geometry constants including FIXED row height (not min-height)', () => {
    expect(CHROME_HEADER_INNER_CLASS).toContain(SITE_CONTENT_MAX_CLASS)
    expect(CHROME_HEADER_INNER_CLASS).toContain('py-4')
    expect(CHROME_HEADER_OUTER_CLASS).toContain('bg-[var(--brand-header-bg)]')
    expect(CHROME_HEADER_OUTER_CLASS).toContain('border-[var(--brand-header-border)]')
    expect(CHROME_HEADER_OUTER_CLASS).toContain('pt-safe-top')
    // Fixed h-11 — min-h-11 is a floor and lets marketing grow past dashboard.
    expect(CHROME_HEADER_ROW_CLASS).toMatch(/(?:^|\s)h-11(?:\s|$)/)
    expect(CHROME_HEADER_ROW_CLASS).not.toContain('min-h-11')
    expect(CHROME_HEADER_ROW_CLASS).toContain('items-center')
    expect(CHROME_HEADER_ROW_CLASS).toContain('overflow-hidden')
  })

  it('only ChromeHeaderShell declares the geometry container attribute', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/ChromeHeaderShell.tsx'), 'utf8')
    const header = readFileSync(join(process.cwd(), 'src/components/Header.tsx'), 'utf8')
    const appHeader = readFileSync(join(process.cwd(), 'src/components/appShell/AppHeader.tsx'), 'utf8')
    expect(shell).toContain('data-chrome-header-shell')
    expect(shell).toContain('data-chrome-header-row')
    expect(header).toContain('ChromeHeaderShell')
    expect(appHeader).toContain('ChromeHeaderShell')
    expect(appHeader).not.toMatch(/<header[^>]*brand-header-bg/)
    expect(header).not.toMatch(/<header[^>]*brand-header-bg/)
  })

  it('AppHeader mobile uses the same logo grid cell as marketing', () => {
    const appHeader = readFileSync(join(process.cwd(), 'src/components/appShell/AppHeader.tsx'), 'utf8')
    expect(appHeader).toMatch(/grid-cols-\[auto_minmax\(0,1fr\)_auto\]/)
    expect(appHeader).toContain('DashboardBrandLockup')
  })

  it('DashboardBrandLockup locks logo cluster height to the marketing logo box', () => {
    const lockup = readFileSync(join(process.cwd(), 'src/components/SiteBrandLockup.tsx'), 'utf8')
    expect(lockup).toContain('export function DashboardBrandLockup')
    expect(lockup).toMatch(/flex h-9 items-center gap-2 whitespace-nowrap sm:h-10/)
    expect(lockup).toContain('QUNI_LOGO_MARK_WRAP_CLASS')
    expect(lockup).toMatch(/data-chrome-brand="dashboard"/)
    expect(lockup).toMatch(/data-chrome-brand="marketing"/)
  })

  it('AppHeader and marketing Header route through the shell', () => {
    const header = readFileSync(join(process.cwd(), 'src/components/Header.tsx'), 'utf8')
    const appHeader = readFileSync(join(process.cwd(), 'src/components/appShell/AppHeader.tsx'), 'utf8')
    expect(header).toMatch(/import ChromeHeaderShell/)
    expect(appHeader).toMatch(/import ChromeHeaderShell/)
  })
})

describe('listing edit path helper', () => {
  it('recognises hub and drill-ins', () => {
    expect(isListingEditPath('/landlord/property/edit/1')).toBe(true)
    expect(isListingEditPath('/landlord/property/edit/1/basic')).toBe(true)
    expect(isListingEditPath('/landlord/property/edit/1/section/pricing')).toBe(true)
    expect(isListingEditPath('/landlord/dashboard')).toBe(false)
  })
})
