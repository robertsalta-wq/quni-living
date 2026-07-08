/// <reference types="node" />
// @ts-nocheck - Vercel isolated API TS pass.
/**
 * Signing-link redirect wrapper.
 * GET /api/sign/{token} → refresh NSW FT6600 dates (when token flag set) → 302 DocuSeal.
 *
 * Env: DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, DOCUSEAL_SIGN_LINK_SECRET
 */
import { parseSignLinkToken, resolveSignLinkRedirect } from '../lib/docuseal/signLinkWrap.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }

  const token = typeof req.query?.token === 'string' ? req.query.token.trim() : ''
  if (!token) {
    return res.status(404).send('Not found')
  }

  const parsed = parseSignLinkToken(token)
  if (!parsed) {
    return res.status(404).send('Not found')
  }

  const embedSrc = await resolveSignLinkRedirect(parsed.submitterId, parsed.refreshDates)
  if (!embedSrc) {
    return res.status(502).send('Signing link is temporarily unavailable. Please try again shortly.')
  }

  if (req.method === 'HEAD') {
    res.setHeader('Location', embedSrc)
    return res.status(302).end()
  }

  res.writeHead(302, { Location: embedSrc })
  res.end()
}
