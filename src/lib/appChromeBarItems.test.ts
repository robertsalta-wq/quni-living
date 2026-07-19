import { describe, expect, it } from 'vitest'
import {
  LANDLORD_NAV_BAR_ITEMS,
  RENTER_NAV_BAR_ITEMS,
  listingBasicInfoActionBarItemSpecs,
  listingHubActionBarItemSpecs,
  listingSectionDrillInActionBarItemSpecs,
} from './appChromeBarItems'

describe('AppActionBar — Nav bar item sets (§3, §6 "dashboard = 5 nav")', () => {
  it('landlord nav matches Overview · Listings · Messages · Bookings · Profile', () => {
    expect(LANDLORD_NAV_BAR_ITEMS.map((i) => i.id)).toEqual([
      'overview',
      'listings',
      'messages',
      'bookings',
      'profile',
    ])
  })

  it('renter nav matches Overview · Bookings · Saved · Messages · Profile', () => {
    expect(RENTER_NAV_BAR_ITEMS.map((i) => i.id)).toEqual(['overview', 'bookings', 'saved', 'messages', 'profile'])
  })
})

describe('Listing hub action bar — ‹ Listings · Health · Preview', () => {
  it('has exactly three items — exit, Health, Preview', () => {
    const items = listingHubActionBarItemSpecs(true)
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.id)).toEqual(['exit-listings', 'health', 'preview'])
  })

  it('Health is the active (current view) item', () => {
    expect(listingHubActionBarItemSpecs(true)[1]).toMatchObject({ id: 'health', active: true })
    expect(listingHubActionBarItemSpecs(false)[1]).toMatchObject({ id: 'health', active: true })
  })

  it('Preview is disabled without a preview href, enabled with one', () => {
    expect(listingHubActionBarItemSpecs(false)[2]).toMatchObject({ id: 'preview', disabled: true })
    expect(listingHubActionBarItemSpecs(true)[2]).toMatchObject({ id: 'preview', disabled: false })
  })

  it('never includes a Save/Done/Insights item', () => {
    for (const hasPreview of [true, false]) {
      const ids = listingHubActionBarItemSpecs(hasPreview).map((i) => i.id)
      expect(ids).not.toContain('save')
      expect(ids).not.toContain('done')
      expect(ids).not.toContain('insights')
    }
  })
})

describe('AppActionBar — Basic info drill-in (§3 row 7 edit / row 8 setup)', () => {
  it('setup mode → Draft · Next', () => {
    const items = listingBasicInfoActionBarItemSpecs({ isSetupMode: true, saving: false, canSubmit: true })
    expect(items.map((i) => i.id)).toEqual(['draft', 'next'])
    expect(items[1]).toMatchObject({ label: 'Next', primary: true })
  })

  it('edit mode → Cancel · Save', () => {
    const items = listingBasicInfoActionBarItemSpecs({ isSetupMode: false, saving: false, canSubmit: true })
    expect(items.map((i) => i.id)).toEqual(['cancel', 'save'])
    expect(items[1]).toMatchObject({ label: 'Save', primary: true })
  })

  it('primary item disables when saving or when the form cannot submit yet', () => {
    expect(
      listingBasicInfoActionBarItemSpecs({ isSetupMode: false, saving: false, canSubmit: false })[1],
    ).toMatchObject({ disabled: true })
    expect(
      listingBasicInfoActionBarItemSpecs({ isSetupMode: false, saving: true, canSubmit: true })[1],
    ).toMatchObject({ disabled: true, label: 'Saving…' })
    expect(
      listingBasicInfoActionBarItemSpecs({ isSetupMode: false, saving: false, canSubmit: true })[1],
    ).toMatchObject({ disabled: false })
  })

  it('saving disables the secondary item too', () => {
    expect(
      listingBasicInfoActionBarItemSpecs({ isSetupMode: true, saving: true, canSubmit: true })[0],
    ).toMatchObject({ id: 'draft', disabled: true })
  })
})

describe('AppActionBar — section drill-in, LandlordPropertyFormPage hub-section mode (§3 row 7)', () => {
  it('always Cancel · Save — no distinct draft/next intent exists on this page', () => {
    const items = listingSectionDrillInActionBarItemSpecs({ saving: false })
    expect(items.map((i) => i.id)).toEqual(['cancel', 'save'])
    expect(items[1]).toMatchObject({ label: 'Save', primary: true })
  })

  it('saving disables both and relabels the primary item', () => {
    const items = listingSectionDrillInActionBarItemSpecs({ saving: true })
    expect(items[0]).toMatchObject({ disabled: true })
    expect(items[1]).toMatchObject({ disabled: true, label: 'Saving…' })
  })
})
