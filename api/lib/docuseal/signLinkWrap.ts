/// <reference types="node" />
// @ts-nocheck - Vercel isolated API TS pass.
/**
 * Quni signing-link redirect wrapper: GET /api/sign/{token} refreshes NSW FT6600
 * readonly dates (Australia/Sydney) via DocuSeal PUT, then 302 to DocuSeal /s/{slug}.
 * Token carries submitter id + HMAC only — never the DocuSeal slug.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../docusealClient.js'
import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'
import {
  officialFt6600ReadonlyDateFieldValues,
  type Ft6600PrefilledField,
} from '../documents/officialNswFt6600Signing.js'

export type DocusealSubmitterLinkSource = {
  id?: number
  role?: string
  embed_src?: string
  completed_at?: string | null
  status?: string
}

function signLinkSecret(): string {
  const s = (process.env.DOCUSEAL_SIGN_LINK_SECRET || '').trim()
  if (!s) throw new Error('Missing DOCUSEAL_SIGN_LINK_SECRET')
  return s
}

/** NSW residential tenancy (FT6600) uses just-in-time date refresh on link open. */
export function signingPackageNeedsDateRefresh(signingPackage: string | null | undefined): boolean {
  return signingPackage === 'residential_tenancy'
}

export function publicSignWrapBaseUrl(): string {
  const base = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni.com.au')
    .trim()
    .replace(/\/$/, '')
  return `${base}/api/sign`
}

export function mintSignLinkToken(submitterId: number, refreshDates: boolean): string {
  const flag = refreshDates ? 'd' : 'n'
  const payload = `${submitterId}.${flag}`
  const sig = createHmac('sha256', signLinkSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function parseSignLinkToken(
  token: string,
): { submitterId: number; refreshDates: boolean } | null {
  const raw = (token || '').trim()
  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [idStr, flag, sig] = parts
  if (flag !== 'd' && flag !== 'n') return null
  const submitterId = Number.parseInt(idStr, 10)
  if (!Number.isFinite(submitterId) || submitterId <= 0) return null
  let secret: string
  try {
    secret = signLinkSecret()
  } catch {
    return null
  }
  const payload = `${idStr}.${flag}`
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return { submitterId, refreshDates: flag === 'd' }
}

export function publicSignWrapUrl(submitterId: number, refreshDates: boolean): string {
  return `${publicSignWrapBaseUrl()}/${mintSignLinkToken(submitterId, refreshDates)}`
}

export function isWrappedSigningLink(url: string): boolean {
  return url.includes('/api/sign/')
}

export function resolveSigningLinkUrl(
  submitter: DocusealSubmitterLinkSource,
  refreshDates: boolean,
): string | null {
  const embed = typeof submitter.embed_src === 'string' ? submitter.embed_src.trim() : ''
  if (!embed) return null
  if (isWrappedSigningLink(embed)) return embed
  if (submitter.id == null || !Number.isFinite(submitter.id)) return embed
  return publicSignWrapUrl(submitter.id, refreshDates)
}

export function wrapSubmissionSubmitters<T extends { submitters?: DocusealSubmitterLinkSource[] }>(
  submission: T,
  refreshDates: boolean,
): T {
  if (!Array.isArray(submission.submitters)) return submission
  return {
    ...submission,
    submitters: submission.submitters.map((s) => {
      const wrapped = resolveSigningLinkUrl(s, refreshDates)
      return wrapped ? { ...s, embed_src: wrapped } : s
    }),
  }
}

export function isSubmitterSigningComplete(submitter: DocusealSubmitterLinkSource): boolean {
  if (submitter.completed_at) return true
  const st = typeof submitter.status === 'string' ? submitter.status.toLowerCase() : ''
  return st === 'completed'
}

export function pickNswFt6600DateFieldsForRole(role: string): Ft6600PrefilledField[] {
  const r = (role || '').trim().toLowerCase()
  const isCoTenant = r.includes('co-tenant') || r.includes('cotenant')
  const parts = officialFt6600ReadonlyDateFieldValues(new Date(), { includeCoTenant: isCoTenant })
  if (r === 'first party' || (r.includes('landlord') && !isCoTenant)) return parts.firstParty
  if (isCoTenant) return parts.coTenant
  if (r === 'second party' || r.includes('tenant')) return parts.secondParty
  return []
}

async function fetchDocusealSubmitter(submitterId: number): Promise<DocusealSubmitterLinkSource> {
  const base = getDocusealApiBase()
  if (!base) throw new Error('DocuSeal is not configured')
  const url = `${base}/api/submitters/${submitterId}`
  const res = await fetch(url, { headers: getDocusealAuthHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DocuSeal GET submitter ${submitterId}: ${res.status} ${text}`)
  }
  return (await res.json()) as DocusealSubmitterLinkSource
}

async function putDocusealSubmitterFields(
  submitterId: number,
  fields: Ft6600PrefilledField[],
): Promise<void> {
  const base = getDocusealApiBase()
  if (!base) throw new Error('DocuSeal is not configured')
  const url = `${base}/api/submitters/${submitterId}`
  const values = Object.fromEntries(fields.map((f) => [f.name, f.default_value]))
  const res = await fetch(url, {
    method: 'PUT',
    headers: getDocusealAuthHeaders({ includeContentType: true }),
    body: JSON.stringify({ fields, values }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DocuSeal PUT submitter ${submitterId}: ${res.status} ${text}`)
  }
}

/**
 * Resolve DocuSeal embed_src for redirect. Refreshes NSW date fields when allowed.
 * Never throws — caller always redirects when embed_src is returned.
 */
export async function resolveSignLinkRedirect(
  submitterId: number,
  refreshDates: boolean,
): Promise<string | null> {
  let submitter: DocusealSubmitterLinkSource
  try {
    submitter = await fetchDocusealSubmitter(submitterId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await captureSentryMessageEdge('sign_link: failed to load submitter', {
      submitterId,
      error: msg,
    })
    return null
  }

  const embed =
    typeof submitter.embed_src === 'string' && submitter.embed_src.trim()
      ? submitter.embed_src.trim()
      : null
  if (!embed) {
    await captureSentryMessageEdge('sign_link: submitter missing embed_src', { submitterId })
    return null
  }

  if (refreshDates && !isSubmitterSigningComplete(submitter)) {
    const fields = pickNswFt6600DateFieldsForRole(submitter.role || '')
    if (fields.length > 0) {
      try {
        await putDocusealSubmitterFields(submitterId, fields)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await captureSentryMessageEdge('sign_link: date refresh PUT failed (redirecting anyway)', {
          submitterId,
          role: submitter.role,
          error: msg,
        })
      }
    }
  }

  return embed
}
