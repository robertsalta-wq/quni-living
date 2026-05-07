import { supabase } from './supabase'
import { apiUrl } from './apiUrl'

export type LandlordListingBillingSnapshot = {
  moduleEnabled: boolean
  hasPaymentMethod: boolean
  card: { brand: string; last4: string } | null
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

    return {
      moduleEnabled: body.moduleEnabled === true,
      hasPaymentMethod: body.hasPaymentMethod === true,
      card: body.card && typeof body.card === 'object' ? body.card : null,
    }
  } catch {
    return null
  }
}

export function formatStripeCardOnFile(card: { brand: string; last4: string }): string {
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
                  : card.brand.trim()
                    ? card.brand.trim().charAt(0).toUpperCase() + card.brand.trim().slice(1).toLowerCase()
                    : 'Card'
  const last4 = (card.last4 ?? '').trim()
  return last4 ? `${label} •••• ${last4}` : label
}
