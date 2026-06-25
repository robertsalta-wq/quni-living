/**
 * Thin DocuSeal API client helpers (no pdf-lib). Safe for edge crons and scripts.
 */

/** @returns {string | null} Normalized API origin without trailing /api */
export function getDocusealApiBase() {
  const rawBase = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  if (!rawBase) return null
  return rawBase.replace(/\/api$/i, '')
}

/**
 * @param {{ includeContentType?: boolean }} [opts]
 * @returns {Record<string, string>}
 */
export function getDocusealAuthHeaders(opts = {}) {
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const headers = { 'X-Auth-Token': token }
  if (opts.includeContentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}
