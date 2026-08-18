import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchTopPagesFromGoogle } from '../../lib/googleSearchConsole.js'
import { json, parseBool, requireAdminFromVercelRequest } from '../../lib/searchConsoleHttp.js'
import { respondWithSearchConsoleCache } from '../../lib/searchConsoleRespond.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

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

  await respondWithSearchConsoleCache({
    res,
    dataset: 'pages',
    bypassCache: parseBool(req.query.refresh),
    fetchLive: fetchTopPagesFromGoogle,
    logLabel: '[api/admin/search-console/pages]',
  })
}
