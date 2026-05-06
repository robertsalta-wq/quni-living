import { getPricingForCell } from '../lib/pricing/index.js'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=900'

function readPropertyTier(req) {
  const raw = req.query?.propertyTier
  return Array.isArray(raw) ? raw[0] ?? '' : raw ?? ''
}

function readServiceTier(req) {
  const raw = req.query?.service_tier
  return Array.isArray(raw) ? raw[0] ?? 'managed' : raw ?? 'managed'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const pricing = await getPricingForCell(readPropertyTier(req), readServiceTier(req))
    res.setHeader('Cache-Control', CACHE_CONTROL)
    return res.status(200).json(pricing)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load pricing'
    return res.status(400).json({ error: message })
  }
}
