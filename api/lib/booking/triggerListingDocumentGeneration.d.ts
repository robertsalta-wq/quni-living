import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import type { ListingDocGenResult } from './listingAgreementTypes.js'

export function triggerListingDocumentGeneration(args: {
  admin: SupabaseClient<Database>
  bookingId: string
  deferSigning?: boolean
  logger?: Pick<Console, 'warn' | 'error'>
}): Promise<ListingDocGenResult>
