import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchTopQueriesFromGoogle,
  type SearchConsoleQueryRow,
} from '../../lib/googleSearchConsole.js'
import {
  json,
  mapSearchConsoleHttpError,
  parseBool,
  requireAdminFromVercelRequest,
} from '../../lib/searchConsoleHttp.js'
import {
  readSearchConsoleCacheMemory,
  writeSearchConsoleCacheMemory,
} from '../../lib/searchConsoleCacheMemory.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

const CACHE_KEY = 'search-console/queries'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  const auth = await requireAdminFromVercelRequest(req)
  if (auth.ok === false) {
    json(res, auth.status, { ok: false, error: auth.error })
    return
  }

  const bypassCache = parseBool(req.query.refresh)

  try {
    if (!bypassCache) {
      const row = readSearchConsoleCacheMemory<SearchConsoleQueryRow[]>(CACHE_KEY)
      if (row?.fresh) {
        json(res, 200, { ok: true, data: row.payload, cached: true, fetchedAt: row.fetchedAt })
        return
      }
    }

    const data = await fetchTopQueriesFromGoogle()
    writeSearchConsoleCacheMemory(CACHE_KEY, data)
    json(res, 200, { ok: true, data, cached: false })
  } catch (e) {
    const mapped = mapSearchConsoleHttpError(e)
    if (mapped) {
      json(res, mapped.status, { ok: false, error: mapped.error, code: mapped.code })
      return
    }
    const message = e instanceof Error ? e.message : 'Unable to fetch Search Console queries'
    console.error('[api/admin/search-console/queries]', e)
    json(res, 500, { ok: false, error: message })
  }
}
