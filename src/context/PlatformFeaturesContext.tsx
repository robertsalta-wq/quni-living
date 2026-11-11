import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildManagedOverridesMap } from '../lib/serviceTier/matrix'
import type { ManagedOverridesMap } from '../lib/serviceTier'
import { isSupabaseConfigured } from '../lib/supabaseConfigured'

export type PlatformFeatures = {
  managedTierEnabled: boolean
  listingModuleEnabled: boolean
  pricingV2Enabled: boolean
  managedOverrides: ManagedOverridesMap
  loaded: boolean
}

/**
 * Local preview only. `import.meta.env.DEV` is false in every production build,
 * so this cannot turn the new price on at quni.com.au.
 * Set VITE_PRICING_V2_ENABLED=true in .env.local, then restart `npm run dev`.
 * Set it to false, or delete the line, and restart to see the old pages again.
 */
const localPricingV2Preview =
  import.meta.env.DEV === true && import.meta.env.VITE_PRICING_V2_ENABLED === 'true'

const DEFAULT_FEATURES: PlatformFeatures = {
  managedTierEnabled: false,
  listingModuleEnabled: false,
  pricingV2Enabled: localPricingV2Preview,
  managedOverrides: {},
  loaded: false,
}

type PlatformFeaturesContextValue = PlatformFeatures

const PlatformFeaturesContext = createContext<PlatformFeaturesContextValue | null>(null)

type PublicPlatformFeaturesRow = {
  managed_tier_enabled: boolean | null
  listing_module_enabled: boolean | null
  pricing_v2_enabled?: boolean | null
}

type MatrixRow = {
  state_code: string
  property_tier: string
  managed_status: string
  notes: string | null
}

function useProvidePlatformFeatures(): PlatformFeaturesContextValue {
  const [features, setFeatures] = useState<PlatformFeatures>(DEFAULT_FEATURES)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    void (async () => {
      const { supabase } = await import('../lib/supabase')
      type FeaturesClient = {
        from(table: 'public_platform_features'): {
          select(cols: '*'): {
            maybeSingle(): Promise<{
              data: PublicPlatformFeaturesRow | null
              error: { message: string } | null
            }>
          }
        }
      }
      type MatrixClient = {
        from(table: 'service_tier_state_matrix'): {
          select(cols: string): Promise<{
            data: MatrixRow[] | null
            error: { message: string } | null
          }>
        }
      }

      const [featuresResult, matrixResult] = await Promise.all([
        (supabase as unknown as FeaturesClient).from('public_platform_features').select('*').maybeSingle(),
        (supabase as unknown as MatrixClient)
          .from('service_tier_state_matrix')
          .select('state_code, property_tier, managed_status, notes'),
      ])

      if (cancelled) return

      const managedOverrides =
        matrixResult.error || !matrixResult.data
          ? {}
          : buildManagedOverridesMap(matrixResult.data)

      if (featuresResult.error || !featuresResult.data) {
        setFeatures({
          managedTierEnabled: false,
          listingModuleEnabled: false,
          pricingV2Enabled: localPricingV2Preview,
          managedOverrides,
          loaded: true,
        })
        return
      }

      setFeatures({
        managedTierEnabled: false,
        listingModuleEnabled: featuresResult.data.listing_module_enabled === true,
        pricingV2Enabled: localPricingV2Preview || featuresResult.data.pricing_v2_enabled === true,
        managedOverrides,
        loaded: true,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return features
}

export function PlatformFeaturesProvider({ children }: { children: ReactNode }) {
  const value = useProvidePlatformFeatures()
  return <PlatformFeaturesContext.Provider value={value}>{children}</PlatformFeaturesContext.Provider>
}

/** Platform feature toggles from public_platform_features (defaults false until loaded). */
export function usePlatformFeatures(): PlatformFeatures {
  const ctx = useContext(PlatformFeaturesContext)
  return ctx ?? DEFAULT_FEATURES
}

/** Resolver options for client-side service tier availability checks. */
export function useServiceTierResolverOptions() {
  const { managedTierEnabled, managedOverrides } = usePlatformFeatures()
  return useMemo(
    () => ({
      managedGloballyEnabled: managedTierEnabled,
      managedOverrides,
    }),
    [managedTierEnabled, managedOverrides],
  )
}
