import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type PlatformFeatures = {
  managedTierEnabled: boolean
  listingModuleEnabled: boolean
  loaded: boolean
}

const DEFAULT_FEATURES: PlatformFeatures = {
  managedTierEnabled: false,
  listingModuleEnabled: false,
  loaded: false,
}

type PlatformFeaturesContextValue = PlatformFeatures

const PlatformFeaturesContext = createContext<PlatformFeaturesContextValue | null>(null)

type PublicPlatformFeaturesRow = {
  managed_tier_enabled: boolean | null
  listing_module_enabled: boolean | null
}

function useProvidePlatformFeatures(): PlatformFeaturesContextValue {
  const [features, setFeatures] = useState<PlatformFeatures>(DEFAULT_FEATURES)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    void (async () => {
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
      const { data, error } = await (supabase as unknown as FeaturesClient)
        .from('public_platform_features')
        .select('*')
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setFeatures((prev) => (prev.loaded ? prev : { ...DEFAULT_FEATURES, loaded: true }))
        return
      }

      setFeatures({
        managedTierEnabled: data.managed_tier_enabled === true,
        listingModuleEnabled: data.listing_module_enabled === true,
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
  const { managedTierEnabled } = usePlatformFeatures()
  return useMemo(
    () => ({
      managedGloballyEnabled: managedTierEnabled,
    }),
    [managedTierEnabled],
  )
}
