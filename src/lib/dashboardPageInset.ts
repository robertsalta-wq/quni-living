/**
 * Shared dashboard content-track insets (landlord canonical).
 * Non-profile tabs use the full inset; profile tab/route is flush on mobile
 * (`max-sm:contents`) so the profile body owns Listing-style gutters.
 */

/** Non-profile dashboard tabs — same track as Listing Health hub body (`px-3.5 py-3`). */
export const dashboardPageInsetClass =
  'mx-auto w-full min-w-0 max-w-site px-3.5 py-3 sm:px-4 sm:py-6 lg:px-8 lg:pb-14'

/**
 * Profile tab/route shell. Mobile: `contents` (no double-pad; body owns gutters).
 * sm+: same horizontal/vertical inset as non-profile tabs.
 */
export const dashboardProfilePageInsetClass =
  'max-sm:contents max-w-site mx-auto w-full min-w-0 sm:px-4 sm:py-6 lg:px-8 lg:pb-14'

/**
 * Mobile gutters for profile body when the shell is `max-sm:contents`.
 * Matches landlord profile hub scroll body (`px-3.5 py-3`).
 */
export const dashboardProfileMobilePadClass = 'max-sm:px-3.5 max-sm:py-3'
