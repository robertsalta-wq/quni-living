/**
 * Browser-safe Stripe config. Only the publishable key belongs in Vite.
 * Secret keys, webhook secrets, and Connect account creation stay in Edge Functions / server.
 */
export function getStripePublishableKey(): string | undefined {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  return typeof k === 'string' && k.trim() ? k.trim() : undefined
}

export function isStripePublishableKeyConfigured(): boolean {
  return Boolean(getStripePublishableKey())
}

/** True when the Vite publishable key is Stripe test mode (`pk_test_…`), not live. */
export function isStripeTestPublishableKey(): boolean {
  const k = getStripePublishableKey()
  return Boolean(k?.startsWith('pk_test_'))
}
