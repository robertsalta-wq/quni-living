/**
 * Shared load path for Search Console admin APIs:
 * fresh cache → Google → write; on transient Google failure → stale if any.
 */
import type { VercelResponse } from '@vercel/node'
import {
  SearchConsoleConfigError,
  SearchConsoleOAuthRevokedError,
  SearchConsolePermissionError,
} from './googleSearchConsole.js'
import {
  buildSearchConsoleCacheKey,
  readSearchConsoleCache,
  writeSearchConsoleCache,
  type SearchConsoleCacheDataset,
} from './searchConsoleCache.js'
import { json, mapSearchConsoleHttpError } from './searchConsoleHttp.js'

export type SearchConsoleApiSuccess<T> = {
  ok: true
  data: T
  cached: boolean
  stale?: boolean
  fetchedAt?: string
}

export async function respondWithSearchConsoleCache<T>(opts: {
  res: VercelResponse
  dataset: SearchConsoleCacheDataset
  bypassCache: boolean
  fetchLive: () => Promise<T>
  logLabel: string
}): Promise<void> {
  const { res, dataset, bypassCache, fetchLive, logLabel } = opts
  const cacheKey = buildSearchConsoleCacheKey(dataset)

  let cachedRow = await readSearchConsoleCache<T>(cacheKey)

  if (!bypassCache && cachedRow?.fresh) {
    json(res, 200, {
      ok: true,
      data: cachedRow.payload,
      cached: true,
      fetchedAt: cachedRow.fetchedAt,
    } satisfies SearchConsoleApiSuccess<T>)
    return
  }

  try {
    const data = await fetchLive()
    await writeSearchConsoleCache(cacheKey, data)
    json(res, 200, {
      ok: true,
      data,
      cached: false,
      fetchedAt: new Date().toISOString(),
    } satisfies SearchConsoleApiSuccess<T>)
  } catch (e) {
    if (
      e instanceof SearchConsoleConfigError ||
      e instanceof SearchConsoleOAuthRevokedError ||
      e instanceof SearchConsolePermissionError
    ) {
      const mapped = mapSearchConsoleHttpError(e)
      if (mapped) {
        json(res, mapped.status, { ok: false, error: mapped.error, code: mapped.code })
        return
      }
    }

    // Transient / unknown: serve stale if we have any row (including expired).
    if (!cachedRow) {
      cachedRow = await readSearchConsoleCache<T>(cacheKey)
    }
    if (cachedRow) {
      json(res, 200, {
        ok: true,
        data: cachedRow.payload,
        cached: true,
        stale: true,
        fetchedAt: cachedRow.fetchedAt,
      } satisfies SearchConsoleApiSuccess<T>)
      return
    }

    const mapped = mapSearchConsoleHttpError(e)
    if (mapped) {
      json(res, mapped.status, { ok: false, error: mapped.error, code: mapped.code })
      return
    }
    const message = e instanceof Error ? e.message : `Unable to fetch Search Console ${dataset}`
    console.error(logLabel, e)
    json(res, 500, { ok: false, error: message })
  }
}
