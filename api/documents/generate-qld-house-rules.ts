/// <reference types="node" />
/**
 * Generate QLD rooming house-rules PDFs (resident copy s 275, wall-display copy s 276).
 * Public POST. Rate-limited. No property row. No save.
 *
 * POST JSON: { variant: 'resident' | 'wall', commonAreas: string, extras?: object, premisesLine?: string }
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import {
  buildQldHouseRulesDocument,
  isQldHouseRulesVariant,
} from '../lib/tenancy/qldHouseRules/document.js'
import { consumeQldHouseRulesRateLimit, qldHouseRulesClientKey } from '../lib/tenancy/qldHouseRules/rateLimit.js'
import { QldHouseRulesPdf } from './QldHouseRulesPdf.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = qldHouseRulesClientKey(headerString(req.headers, 'x-forwarded-for'))
  if (!consumeQldHouseRulesRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait and try again.' })
  }

  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid request. Please try again.' })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request. Please try again.' })
  }

  const o = body as Record<string, unknown>
  const variantRaw = typeof o.variant === 'string' ? o.variant.trim() : ''
  if (!isQldHouseRulesVariant(variantRaw)) {
    return res.status(400).json({ error: 'Choose the resident copy or the wall-display copy.' })
  }

  const commonAreas = typeof o.commonAreas === 'string' ? o.commonAreas : ''
  const premisesLine = typeof o.premisesLine === 'string' ? o.premisesLine : ''
  const built = buildQldHouseRulesDocument({
    commonAreas,
    extras: o.extras && typeof o.extras === 'object' && !Array.isArray(o.extras) ? o.extras : {},
    premisesLine,
  })
  if (!built.ok) {
    return res.status(400).json({ error: built.error })
  }

  const element = React.createElement(QldHouseRulesPdf, {
    variant: variantRaw,
    document: built.document,
    generatedAtLabel: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }),
  })
  const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  const filename =
    variantRaw === 'wall'
      ? 'qld-house-rules-wall-display.pdf'
      : 'qld-house-rules-resident-copy.pdf'

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).send(pdfBuffer)
}
