import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  preflightQldForm18aListingTenancy,
  runQldForm18aListingTenancy,
} from './qldForm18a.js'
import {
  preflightNswOccupancyListingTenancy,
  runNswOccupancyListingTenancy,
} from './nswOccupancy.js'
import {
  preflightNswFt6600ListingTenancy,
  runNswFt6600ListingTenancy,
} from './nswFt6600.js'
import {
  preflightQldOccupancyListingTenancy,
  runQldOccupancyListingTenancy,
} from './qldOccupancy.js'
import {
  preflightVicForm1ListingTenancy,
  runVicForm1ListingTenancy,
} from './vicForm1.js'
import {
  preflightVicOccupancyListingTenancy,
  runVicOccupancyListingTenancy,
} from './vicOccupancy.js'

export type ListingTenancyGeneratorModule = {
  preflight: (
    admin: SupabaseClient<Database>,
    bookingId: string,
  ) => Promise<ListingPreflightResult>
  run: (
    admin: SupabaseClient<Database>,
    bookingId: string,
    opts: { deferSigning: boolean },
  ) => Promise<ListingDocGenResult>
}

const REGISTRY: Record<string, ListingTenancyGeneratorModule> = {
  'qld-form18a': {
    preflight: preflightQldForm18aListingTenancy,
    run: runQldForm18aListingTenancy,
  },
  'nsw-occupancy': {
    preflight: preflightNswOccupancyListingTenancy,
    run: runNswOccupancyListingTenancy,
  },
  'nsw-ft6600': {
    preflight: preflightNswFt6600ListingTenancy,
    run: runNswFt6600ListingTenancy,
  },
  'qld-occupancy': {
    preflight: preflightQldOccupancyListingTenancy,
    run: runQldOccupancyListingTenancy,
  },
  'vic-form1': {
    preflight: preflightVicForm1ListingTenancy,
    run: runVicForm1ListingTenancy,
  },
  'vic-occupancy': {
    preflight: preflightVicOccupancyListingTenancy,
    run: runVicOccupancyListingTenancy,
  },
}

export function getListingTenancyGenerator(generator: string): ListingTenancyGeneratorModule | null {
  return REGISTRY[generator] ?? null
}
