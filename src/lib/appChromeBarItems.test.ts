import { describe, expect, it } from 'vitest'
import {
  LANDLORD_NAV_BAR_ITEMS,
  RENTER_NAV_BAR_ITEMS,
  listingBasicInfoActionBarItemSpecs,
  listingHubActionBarItemSpecs,
  listingPreviewActionBarItemSpecs,
  listingSectionDrillInActionBarItemSpecs,
} from './appChromeBarItems'

describe('AppActionBar - Nav bar item sets (§3, §6 "dashboard = 5 nav")', () => {
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

describe('Listing hub action bar - ‹ Listings · Health · Preview', () => {
  it('has exactly three items - exit, Health, Preview', () => {
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

describe('AppActionBar - Basic info drill-in (§3 row 7 edit / row 8 setup)', () => {
  it('setup mode → Prev · Save draft · Next', () => {
    const items = listingBasicInfoActionBarItemSpecs({ isSetupMode: true, saving: false, canSubmit: true })
    expect(items.map((i) => i.id)).toEqual(['prev', 'draft', 'next'])
    expect(items[0]).toMatchObject({ label: 'Prev' })
    expect(items[1]).toMatchObject({ label: 'Save draft' })
    expect(items[2]).toMatchObject({ label: 'Next', primary: true })
  })

  it('edit mode → Save draft · Save', () => {
    const items = listingBasicInfoActionBarItemSpecs({ isSetupMode: false, saving: false, canSubmit: true })
    expect(items.map((i) => i.id)).toEqual(['draft', 'save'])
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

  it('saving disables Prev and Save draft too', () => {
    const items = listingBasicInfoActionBarItemSpecs({ isSetupMode: true, saving: true, canSubmit: true })
    expect(items[0]).toMatchObject({ id: 'prev', disabled: true })
    expect(items[1]).toMatchObject({ id: 'draft', disabled: true })
  })
})

describe('AppActionBar - section drill-in, LandlordPropertyFormPage hub-section mode (§3 row 7)', () => {
  it('live listing → Save draft · Save', () => {
    const items = listingSectionDrillInActionBarItemSpecs({ saving: false })
    expect(items.map((i) => i.id)).toEqual(['draft', 'save'])
    expect(items[1]).toMatchObject({ label: 'Save', primary: true })
  })

  it('setup / draft → Prev · Save draft · Next (never Publish)', () => {
    const items = listingSectionDrillInActionBarItemSpecs({ saving: false, isSetupMode: true })
    expect(items.map((i) => i.id)).toEqual(['prev', 'draft', 'next'])
    expect(items[0]).toMatchObject({ label: 'Prev' })
    expect(items[1]).toMatchObject({ label: 'Save draft' })
    expect(items[2]).toMatchObject({ label: 'Next', primary: true })
    expect(items.map((i) => i.label).join(' ')).not.toMatch(/Publish/i)
  })

  it('saving disables items and relabels the primary item', () => {
    const items = listingSectionDrillInActionBarItemSpecs({ saving: true })
    expect(items[0]).toMatchObject({ disabled: true })
    expect(items[1]).toMatchObject({ disabled: true, label: 'Saving…' })
  })
})

describe('AppActionBar - owner draft preview', () => {
  it('shows Edit and Publish on a draft the landlord can publish', () => {
    const items = listingPreviewActionBarItemSpecs({ canPublish: true, publishing: false })
    expect(items.map((i) => i.id)).toEqual(['edit', 'publish'])
    expect(items[1]).toMatchObject({ label: 'Publish', primary: true })
  })

  it('hides Publish when the listing cannot be published here', () => {
    expect(listingPreviewActionBarItemSpecs({ canPublish: false, publishing: false }).map((i) => i.id)).toEqual([
      'edit',
    ])
  })
})
