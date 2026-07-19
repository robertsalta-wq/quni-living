/**
 * Pure, framework-agnostic item specs for `AppActionBar` — and for desktop
 * in-page footers (same source, two targets). See docs/app-chrome-brief.md.
 */
export type AppChromeBarItemSpec = {
  id: string
  label: string
  active?: boolean
  primary?: boolean
  disabled?: boolean
}

/** Fixed hub exit — listings tab. */
export const LANDLORD_LISTINGS_EXIT_HREF = '/landlord/dashboard?tab=listings'

/** Nav bar — landlord browse. */
export const LANDLORD_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'messages', label: 'Messages' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'profile', label: 'Profile' },
]

/** Nav bar — renter browse. */
export const RENTER_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'saved', label: 'Saved' },
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
]

/** Listing hub — mobile action bar: exit · Health · Preview. */
export function listingHubActionBarItemSpecs(hasPreviewHref: boolean): AppChromeBarItemSpec[] {
  return [
    { id: 'exit-listings', label: '‹ Listings' },
    { id: 'health', label: 'Health', active: true },
    { id: 'preview', label: 'Preview', disabled: !hasPreviewHref },
  ]
}

/** Basic-info drill-in — Cancel · Save / setup: Draft · Next. Cancel → hub (fixed). */
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

/** Section drill-in — Cancel · Save. Cancel → hub (fixed). */
export function listingSectionDrillInActionBarItemSpecs(opts: { saving: boolean }): AppChromeBarItemSpec[] {
  return [
    { id: 'cancel', label: 'Cancel', disabled: opts.saving },
    { id: 'save', label: opts.saving ? 'Saving…' : 'Save', primary: true, disabled: opts.saving },
  ]
}
