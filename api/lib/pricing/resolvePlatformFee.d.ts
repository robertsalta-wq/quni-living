import type { SupabaseClient } from '@supabase/supabase-js'

export function isLandlordFeeExempt(admin: SupabaseClient, landlordId: string): Promise<boolean>

export function resolveListingPlatformFeeCents(feeExempt: boolean, defaultCents: number): number
