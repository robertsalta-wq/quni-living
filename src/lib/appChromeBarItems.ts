import { listingHubWizardStepCaption, listingHubWizardStepProgress } from './listingHubWizard'

/**
 * Pure, framework-agnostic item specs for `AppActionBar` - and for desktop
 * in-page footers (same source, two targets). See docs/app-chrome-brief.md.
 */
export type AppChromeBarStepProgress = {
  current: number
  total: number
}

export type AppChromeBarItemSpec = {
  id: string
  label: string
  active?: boolean
  primary?: boolean
  disabled?: boolean
  /** Wizard step indicator - dots + caption, not a button. */
  stepProgress?: AppChromeBarStepProgress
}

function listingWizardStepItem(progress: AppChromeBarStepProgress): AppChromeBarItemSpec {
  return {
    id: 'step',
    label: listingHubWizardStepCaption(progress),
    stepProgress: progress,
  }
}

/** Fixed hub exit - listings tab. */
export const LANDLORD_LISTINGS_EXIT_HREF = '/landlord/dashboard?tab=listings'

/** Nav bar - landlord browse. */
export const LANDLORD_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'messages', label: 'Messages' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'profile', label: 'Profile' },
]

/** Nav bar - renter browse. */
export const RENTER_NAV_BAR_ITEMS: AppChromeBarItemSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'saved', label: 'Saved' },
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
]

/** Listing hub - mobile action bar: exit · Health · Preview. */
export function listingHubActionBarItemSpecs(hasPreviewHref: boolean): AppChromeBarItemSpec[] {
  return [
    { id: 'exit-listings', label: '‹ Listings' },
    { id: 'health', label: 'Health', active: true },
    { id: 'preview', label: 'Preview', disabled: !hasPreviewHref },
  ]
}

/** Basic-info drill-in - Prev · Step · Next · Save draft (setup) / Prev · Next · Save (live). */
export function listingBasicInfoActionBarItemSpecs(opts: {
  isSetupMode: boolean
  saving: boolean
  canSubmit: boolean
  wizardStep?: AppChromeBarStepProgress
}): AppChromeBarItemSpec[] {
  const prev: AppChromeBarItemSpec = { id: 'prev', label: 'Prev', disabled: opts.saving }
  if (opts.isSetupMode) {
    return [
      prev,
      listingWizardStepItem(opts.wizardStep ?? listingHubWizardStepProgress('basic')),
      {
        id: 'next',
        label: opts.saving ? 'Saving…' : 'Next',
        primary: true,
        disabled: opts.saving || !opts.canSubmit,
      },
      { id: 'draft', label: 'Save draft', disabled: opts.saving },
    ]
  }
  return [
    prev,
    { id: 'next', label: 'Next', disabled: opts.saving },
    {
      id: 'save',
      label: opts.saving ? 'Saving…' : 'Save',
      primary: true,
      disabled: opts.saving || !opts.canSubmit,
    },
  ]
}

/**
 * Section drill-in.
 * Setup / draft: Prev · Step · Next · Save draft (Next does not run the full form submit).
 * Live listing: Prev · Next · Save (Next only navigates; Save submits).
 * Other callers (profile): Save draft · Save.
 */
export function listingSectionDrillInActionBarItemSpecs(opts: {
  saving: boolean
  isSetupMode?: boolean
  isLiveListing?: boolean
  wizardStep?: AppChromeBarStepProgress
  /** @deprecated Use isSetupMode. Kept so older callers still type-check. */
  isNewListing?: boolean
}): AppChromeBarItemSpec[] {
  const setup = Boolean(opts.isSetupMode ?? opts.isNewListing)
  if (setup) {
    return [
      { id: 'prev', label: 'Prev', disabled: opts.saving },
      listingWizardStepItem(opts.wizardStep ?? listingHubWizardStepProgress('basic')),
      {
        id: 'next',
        label: opts.saving ? 'Saving…' : 'Next',
        primary: true,
        disabled: opts.saving,
      },
      { id: 'draft', label: 'Save draft', disabled: opts.saving },
    ]
  }
  if (opts.isLiveListing) {
    return [
      { id: 'prev', label: 'Prev', disabled: opts.saving },
      { id: 'next', label: 'Next', disabled: opts.saving },
      {
        id: 'save',
        label: opts.saving ? 'Saving…' : 'Save',
        primary: true,
        disabled: opts.saving,
      },
    ]
  }
  return [
    { id: 'draft', label: 'Save draft', disabled: opts.saving },
    {
      id: 'save',
      label: opts.saving ? 'Saving…' : 'Save',
      primary: true,
      disabled: opts.saving,
    },
  ]
}

/** Owner draft preview - Edit · Publish. */
export function listingPreviewActionBarItemSpecs(opts: {
  canPublish: boolean
  publishing: boolean
}): AppChromeBarItemSpec[] {
  const items: AppChromeBarItemSpec[] = [{ id: 'edit', label: 'Edit' }]
  if (opts.canPublish) {
    items.push({
      id: 'publish',
      label: opts.publishing ? 'Publishing…' : 'Publish',
      primary: true,
      disabled: opts.publishing,
    })
  }
  return items
}
