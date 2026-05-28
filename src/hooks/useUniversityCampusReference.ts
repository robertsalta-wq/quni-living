import { useEffect, useState } from 'react'
import {
  loadUniversityCampusReference,
  peekUniversityCampusReference,
  type UniversityCampusReferenceData,
  type UniversityCampusReferenceScope,
} from '../lib/universityCampusReference'

const EMPTY_REFERENCE: UniversityCampusReferenceData = { universities: [], campuses: [] }

type UseUniversityCampusReferenceOptions = {
  /** Load reference data after idle so listings grid can fetch first (filters use cached peek). */
  deferLoad?: boolean
}

export function useUniversityCampusReference(
  scope: UniversityCampusReferenceScope = 'withListings',
  options: UseUniversityCampusReferenceOptions = {},
): UniversityCampusReferenceData & {
  loading: boolean
  error: string | null
} {
  const deferLoad = options.deferLoad === true
  const cached = peekUniversityCampusReference(scope)
  const [data, setData] = useState<UniversityCampusReferenceData>(cached ?? EMPTY_REFERENCE)
  const [loading, setLoading] = useState(!deferLoad && cached == null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const hadCache = peekUniversityCampusReference(scope) != null

    const runLoad = () => {
      if (!hadCache && !deferLoad) {
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
    }

    if (deferLoad) {
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(runLoad, { timeout: 2500 })
        return () => {
          cancelled = true
          cancelIdleCallback(id)
        }
      }
      const t = window.setTimeout(runLoad, 50)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    runLoad()
    return () => {
      cancelled = true
    }
  }, [deferLoad, scope])

  return { ...data, loading, error }
}
