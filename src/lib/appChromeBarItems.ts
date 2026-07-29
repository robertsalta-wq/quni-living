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

/** Basic-info drill-in — Save draft · Next (setup) / Save (edit). Always persists on leave. */
export function listingBasicInfoActionBarItemSpecs(opts: {
  isSetupMode: boolean
  saving: boolean
  canSubmit: boolean
}): AppChromeBarItemSpec[] {
  const primaryLabel = opts.saving ? 'Saving…' : opts.isSetupMode ? 'Next' : 'Save'
  return [
    { id: 'draft', label: 'Save draft', disabled: opts.saving },
    {
      id: opts.isSetupMode ? 'next' : 'save',
      label: primaryLabel,
      primary: true,
      disabled: opts.saving || !opts.canSubmit,
    },
  ]
}

/**
 * Section drill-in — Save draft · Publish (new) / Save (edit).
 * Save draft → hub (caller wires); never discard without persisting.
 */
export function listingSectionDrillInActionBarItemSpecs(opts: {
  saving: boolean
  isNewListing?: boolean
}): AppChromeBarItemSpec[] {
  return [
    { id: 'draft', label: 'Save draft', disabled: opts.saving },
    {
      id: 'save',
      label: opts.saving ? 'Saving…' : opts.isNewListing ? 'Publish' : 'Save',
      primary: true,
      disabled: opts.saving,
    },
  ]
}
