import { useEffect, useState } from 'react'
import {
  loadUniversityCampusReference,
  type UniversityCampusReferenceData,
  type UniversityCampusReferenceScope,
} from '../lib/universityCampusReference'

export function useUniversityCampusReference(scope: UniversityCampusReferenceScope = 'withListings'): UniversityCampusReferenceData & {
  loading: boolean
  error: string | null
} {
  const [data, setData] = useState<UniversityCampusReferenceData>({
    universities: [],
    campuses: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadUniversityCampusReference(scope)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData({ universities: [], campuses: [] })
          setError(e instanceof Error ? e.message : 'Could not load universities.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope])

  return { ...data, loading, error }
}
