import { supabase } from './supabase'
import { apiUrl } from './apiUrl'

export type LandlordListingBillingSnapshot = {
  moduleEnabled: boolean
  hasPaymentMethod: boolean
  card: { brand: string; last4: string } | null
}

/** Normalize API card payload — reject nullish/non-string brand or last4. */
export function normalizeListingBillingCard(
  card: unknown,
): { brand: string; last4: string } | null {
  if (!card || typeof card !== 'object') return null
  const brand = 'brand' in card && typeof card.brand === 'string' ? card.brand.trim() : ''
  const last4 = 'last4' in card && typeof card.last4 === 'string' ? card.last4.trim() : ''
  if (!brand || !last4) return null
  return { brand, last4 }
}

/**
 * Listing-module billing flags + default card summary (Stripe). Returns null if unauthenticated or request fails.
 */
export async function fetchLandlordListingBillingSnapshot(): Promise<LandlordListingBillingSnapshot | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null

    const res = await fetch(apiUrl('/api/landlord-listing-billing-status'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const raw = await res.text()
    let body: {
      moduleEnabled?: boolean
      hasPaymentMethod?: boolean
      card?: { brand: string; last4: string } | null
    } = {}
    try {
      body = raw ? (JSON.parse(raw) as typeof body) : {}
    } catch {
      return null
    }
    if (!res.ok) return null

    const card = normalizeListingBillingCard(body.card)
    return {
      moduleEnabled: body.moduleEnabled === true,
      // Prefer a usable card summary; ignore a bare hasPaymentMethod flag with a bad/missing card object.
      hasPaymentMethod: card != null && body.hasPaymentMethod === true,
      card,
    }
  } catch {
    return null
  }
}

export function formatStripeCardOnFile(card: { brand: string; last4: string } | null | undefined): string {
  if (!card || typeof card !== 'object') return 'your saved card'
  const b = (card.brand ?? '').trim().toLowerCase()
  const label =
    b === 'visa'
      ? 'Visa'
      : b === 'mastercard'
        ? 'Mastercard'
        : b === 'amex'
          ? 'American Express'
          : b === 'discover'
            ? 'Discover'
            : b === 'diners'
              ? 'Diners Club'
              : b === 'jcb'
                ? 'JCB'
                : b === 'unionpay'
                  ? 'UnionPay'
                  : b
                    ? b.charAt(0).toUpperCase() + b.slice(1)
                    : 'your saved card'
  const last4 = (card.last4 ?? '').trim()
  return last4 ? `${label} •••• ${last4}` : label
}
