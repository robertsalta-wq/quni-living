import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export function declineCompetingBookings(
  admin: SupabaseClient,
  stripe: Stripe | null | undefined,
  args: {
    propertyId: string
    winningBookingId: string
    siteBase?: string
  },
): Promise<{ declined: number; error?: string }>
