import { useEffect, useState } from 'react'
import {
  loadUniversityCampusReference,
  peekUniversityCampusReference,
  type UniversityCampusReferenceData,
  type UniversityCampusReferenceScope,
} from '../lib/universityCampusReference'

const EMPTY_REFERENCE: UniversityCampusReferenceData = { universities: [], campuses: [] }

export function useUniversityCampusReference(
  scope: UniversityCampusReferenceScope = 'withListings',
): UniversityCampusReferenceData & {
  loading: boolean
  error: string | null
} {
  const cached = peekUniversityCampusReference(scope)
  const [data, setData] = useState<UniversityCampusReferenceData>(cached ?? EMPTY_REFERENCE)
  const [loading, setLoading] = useState(cached == null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const hadCache = peekUniversityCampusReference(scope) != null
    if (!hadCache) {
      setLoading(true)
      setError(null)
    }
    loadUniversityCampusReference(scope)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (!hadCache) setData(EMPTY_REFERENCE)
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
