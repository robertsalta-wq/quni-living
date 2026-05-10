import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export function fetchListingFeePaymentIntentId(
  admin: SupabaseClient,
  bookingId: string,
): Promise<string | null>

export function refundListingFeePaymentIntentFull(
  stripe: Stripe,
  paymentIntentId: string | null | undefined,
  idempotencyKey?: string,
): Promise<{
  refundId: string | null
  refundAmountCents: number | null
  alreadyRefunded?: boolean
}>
