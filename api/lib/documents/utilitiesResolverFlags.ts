import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import {
  PLATFORM_CONFIG_KEYS,
  fetchPlatformConfigValueMap,
  parseBooleanConfig,
} from '../platformConfig.js'

export type UtilitiesResolverStateFlags = {
  qldEnabled: boolean
  nswEnabled: boolean
  vicEnabled: boolean
  addendumEnabled: boolean
  listingDisclosureEnabled: boolean
}

const UTILITIES_RESOLVER_KEYS = [
  PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_QLD_ENABLED,
  PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_NSW_ENABLED,
  PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_VIC_ENABLED,
  PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_ADDENDUM_ENABLED,
  PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_LISTING_DISCLOSURE_ENABLED,
] as const

/** Per-state utilities resolver rollout flags (default false — legacy hard-coded fill). */
export async function fetchUtilitiesResolverStateFlags(
  client: SupabaseClient<Database>,
): Promise<UtilitiesResolverStateFlags> {
  const map = await fetchPlatformConfigValueMap(client, UTILITIES_RESOLVER_KEYS)
  return {
    qldEnabled: parseBooleanConfig(map[PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_QLD_ENABLED], false),
    nswEnabled: parseBooleanConfig(map[PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_NSW_ENABLED], false),
    vicEnabled: parseBooleanConfig(map[PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_VIC_ENABLED], false),
    addendumEnabled: parseBooleanConfig(
      map[PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_ADDENDUM_ENABLED],
      false,
    ),
    listingDisclosureEnabled: parseBooleanConfig(
      map[PLATFORM_CONFIG_KEYS.UTILITIES_RESOLVER_LISTING_DISCLOSURE_ENABLED],
      false,
    ),
  }
}
