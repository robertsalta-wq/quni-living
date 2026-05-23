import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  getFallbackLegalEntity,
  legalEntitiesEqual,
  mergeLegalEntityFromRow,
  type LegalEntity,
  type PublicLegalEntityRow,
} from '../lib/legalEntity'

type LegalEntityContextValue = {
  legalEntity: LegalEntity
}

const LegalEntityContext = createContext<LegalEntityContextValue | null>(null)

function useProvideLegalEntity(): LegalEntityContextValue {
  const fallback = useMemo(() => getFallbackLegalEntity(), [])
  const [legalEntity, setLegalEntity] = useState<LegalEntity>(fallback)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    void (async () => {
      // View omitted from generated Database types so existing .from() overloads stay stable.
      type LegalEntityClient = {
        from(table: 'public_legal_entity'): {
          select(cols: '*'): {
            maybeSingle(): Promise<{
              data: PublicLegalEntityRow | null
              error: { message: string } | null
            }>
          }
        }
      }
      const { data, error } = await (supabase as unknown as LegalEntityClient)
        .from('public_legal_entity')
        .select('*')
        .maybeSingle()
      if (cancelled || error || !data) return

      const merged = mergeLegalEntityFromRow(data, fallback)
      setLegalEntity((prev) => (legalEntitiesEqual(prev, merged) ? prev : merged))
    })()

    return () => {
      cancelled = true
    }
  }, [fallback])

  return { legalEntity }
}

export function LegalEntityProvider({ children }: { children: ReactNode }) {
  const value = useProvideLegalEntity()
  return <LegalEntityContext.Provider value={value}>{children}</LegalEntityContext.Provider>
}

export function useLegalEntity(): LegalEntity {
  const ctx = useContext(LegalEntityContext)
  if (ctx) return ctx.legalEntity
  return getFallbackLegalEntity()
}
