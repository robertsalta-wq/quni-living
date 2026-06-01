/**
 * Open Stripe Connect hosted onboarding. Prefer a new tab; fall back to same-tab navigation
 * when pop-up blockers prevent window.open (common on mobile Safari).
 */
export function openStripeHostedUrl(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) return
  const opened = window.open(trimmed, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.assign(trimmed)
  }
}
