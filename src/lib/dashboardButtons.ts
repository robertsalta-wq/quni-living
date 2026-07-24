/**
 * Shared dashboard action button classes (landlord profile = canonical).
 * Prefer these over parallel renter or local saveBtnClass strings.
 */

/** Coral primary — profile save, resume CTA, primary dashboard actions. */
export const dashboardPrimaryBtnClass =
  'inline-flex items-center justify-center rounded-admin-md bg-admin-coral px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-admin-coral-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors'

/** Bordered secondary — cancel / alternate actions. */
export const dashboardSecondaryBtnClass =
  'inline-flex items-center justify-center rounded-admin-md border border-admin-line bg-white px-3.5 py-2.5 text-sm font-semibold text-admin-ink hover:bg-admin-surface-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors'

/** Text-style Edit / change affordance (matches Section header Edit). */
export const dashboardEditBtnClass =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-1 py-1.5 text-[13px] font-semibold text-admin-coral hover:text-admin-coral-hover disabled:cursor-not-allowed disabled:opacity-50'

/** Secondary chrome with danger emphasis (e.g. delete-account confirm). */
export const dashboardDestructiveBtnClass =
  'inline-flex items-center justify-center rounded-admin-md border border-admin-danger-bg bg-white px-3.5 py-2.5 text-sm font-semibold text-admin-danger-fg hover:bg-admin-surface-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors'
