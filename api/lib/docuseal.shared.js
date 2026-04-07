/**
 * Shared DocuSeal helpers (plain ESM JS).
 *
 * This file exists so Node scripts can reuse the exact same DocuSeal submission
 * logic without requiring a TypeScript loader.
 */
import { PDFDocument } from 'pdf-lib'

export function getDocusealSubmissionsUrl() {
  const rawBase = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  const base = rawBase.replace(/\/api$/i, '')
  const path = (process.env.DOCUSEAL_SUBMISSIONS_PATH || '/api/submissions/pdf').trim()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function docusealHeaders() {
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': token,
  }
}

function asBooleanEnv(name, defaultValue = false) {
  const v = (process.env[name] || '').trim().toLowerCase()
  if (!v) return defaultValue
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

function normalizeBase64Pdf(input) {
  const raw = String(input || '').trim()
  if (!raw) return raw
  // DocuSeal accepts base64 content, not a data URI payload.
  if (raw.startsWith('data:')) {
    const idx = raw.indexOf('base64,')
    if (idx >= 0) return raw.slice(idx + 'base64,'.length).trim()
  }
  return raw
}

async function reencodePdfBase64(input) {
  const normalized = normalizeBase64Pdf(input)
  if (!normalized) return normalized
  try {
    const src = Buffer.from(normalized, 'base64')
    const loaded = await PDFDocument.load(src, { ignoreEncryption: true })
    const saved = await loaded.save({
      useObjectStreams: false,
      addDefaultPage: false,
      updateFieldAppearances: true,
    })
    return Buffer.from(saved).toString('base64')
  } catch (err) {
    console.warn('[DocuSeal] PDF normalization skipped:', err instanceof Error ? err.message : String(err))
    return normalized
  }
}

async function readErrorBody(res) {
  const text = await res.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  return { text, parsed }
}

/**
 * Create DocuSeal submission from PDF bytes (base64) and two signers.
 * @param {{ name: string, pdfBase64: string, landlord: {name: string, email: string}, tenant: {name: string, email: string} }} params
 * @returns {Promise<{ id?: number, submitters?: Array<{id?: number, email?: string, name?: string, role?: string, embed_src?: string, completed_at?: string|null}> }>}
 */
export async function createDocusealSubmissionFromPdf(params) {
  const url = getDocusealSubmissionsUrl()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  if (!token) throw new Error('Missing DOCUSEAL_API_TOKEN')

  const normalizedPdfBase64 = await reencodePdfBase64(params.pdfBase64)

  const body = {
    name: params.name,
    order: 'preserved',
    send_email: asBooleanEnv('DOCUSEAL_SEND_EMAIL', false),
    documents: [
      {
        name: 'Residential Tenancy Agreement.pdf',
        file: normalizedPdfBase64,
      },
    ],
    submitters: [
      { role: 'Landlord', email: params.landlord.email, name: params.landlord.name },
      { role: 'Tenant', email: params.tenant.email, name: params.tenant.name },
    ],
  }

  console.log('[DocuSeal] create submission request', {
    url,
    submitters: body.submitters.map((s) => ({ name: s.name, email: s.email })),
    authHeaderKey: 'X-Auth-Token',
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: docusealHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const { text, parsed } = await readErrorBody(res)
    const errorPayload = {
      status: res.status,
      statusText: res.statusText,
      url,
      headers: {
        'content-type': res.headers.get('content-type'),
        'x-request-id': res.headers.get('x-request-id'),
      },
      body: parsed ?? text,
      requestHint: {
        send_email: body.send_email,
        submitterRoles: body.submitters.map((s) => s.role),
        documentsCount: body.documents.length,
      },
    }
    console.error('[DocuSeal] submission error', JSON.stringify(errorPayload, null, 2))
    throw new Error(`DocuSeal submission failed: ${res.status} ${text}`)
  }
  return await res.json()
}

