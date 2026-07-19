/**
 * Pure, framework-agnostic item specs for `AppActionBar` — kept separate from the
 * component/icons so §6 "bar shows the declared items" is unit-testable without
 * rendering (see appChromeBarItems.test.ts + docs/app-chrome-brief.md §3, §6).
 */
export type AppChromeBarItemSpec = {
  id: string
  label: string
  active?: boolean
  primary?: boolean
  disabled?: boolean
}

/** Nav bar — landlord, §3 row 1. */
export const LANDLORD_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'messages', label: 'Messages' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'profile', label: 'Profile' },
]

/** Nav bar — renter, §3 row 2. */
export const RENTER_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'saved', label: 'Saved' },
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
]

/** Listing hub Preview affordance specs (in-page under Map chrome; formerly action-bar). */
export function listingHubActionBarItemSpecs(hasPreviewHref: boolean): AppChromeBarItemSpec[] {
  return [
    { id: 'health', label: 'Health', active: true },
    { id: 'preview', label: 'Preview', disabled: !hasPreviewHref },
  ]
}

/** Basic-info drill-in footer — edit: Cancel · Save / setup: Draft · Next. */
export function listingBasicInfoActionBarItemSpecs(opts: {
  isSetupMode: boolean
  saving: boolean
  canSubmit: boolean
}): AppChromeBarItemSpec[] {
  const primaryLabel = opts.saving ? 'Saving…' : opts.isSetupMode ? 'Next' : 'Save'
  return opts.isSetupMode
    ? [
        { id: 'draft', label: 'Draft', disabled: opts.saving },
        { id: 'next', label: primaryLabel, primary: true, disabled: opts.saving || !opts.canSubmit },
      ]
    : [
        { id: 'cancel', label: 'Cancel', disabled: opts.saving },
        { id: 'save', label: primaryLabel, primary: true, disabled: opts.saving || !opts.canSubmit },
      ]
}

/**
 * Section drill-in (`LandlordPropertyFormPage`, hub-section mode) — §3 row 7.
 * Only Cancel + submit exist on this page today (no distinct draft/next intent),
 * so setup vs edit does not change the item set here (unlike Basic info above).
 */
export function listingSectionDrillInActionBarItemSpecs(opts: { saving: boolean }): AppChromeBarItemSpec[] {
  return [
    { id: 'cancel', label: 'Cancel', disabled: opts.saving },
    { id: 'save', label: opts.saving ? 'Saving…' : 'Save', primary: true, disabled: opts.saving },
  ]
}
