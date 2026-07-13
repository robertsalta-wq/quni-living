/// <reference types="node" />
// @ts-nocheck - Vercel isolated API TS pass (see tsconfig.api.json for full check).
/**
 * DocuSeal (self-hosted) + tenancy lease workflow - server-only (Vercel Node).
 * Uses SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, RESEND_API_KEY.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import type { Database, Json } from '../../src/lib/database.types'
import { sendEmail } from './sendEmail.js'
import {
  createDocusealSubmissionFromPdf,
  getDocusealSubmissionsUrl as getDocusealSubmissionsUrlImpl,
} from './docuseal.shared.js'
import { officialFt6600ReadonlyDateFieldValues } from './documents/officialNswFt6600Signing.js'
import {
  signingPackageNeedsDateRefresh,
  wrapSubmissionSubmitters,
} from './docuseal/signLinkWrap.js'
import { getActivePricingSnapshotForProperty } from './pricing/index.js'
import {
  isLandlordFeeExempt,
  resolveManagedApplicationFeePercent,
} from './pricing/resolvePlatformFee.js'
import {
  coTenantEmailDistinctFromPrimary,
  fetchCoTenantSignerForTenancy,
  fetchCoTenantSignerForBooking,
} from './booking/coTenantSigning.js'
import { isTerminalBookingStatus } from './booking/terminalBookingStatus.js'
import { assertStudentLegalNameForSigning } from './booking/assertStudentLegalNameForSigning.js'
import {
  legacyStudentNameFromProfile,
  tenantLegalNameForDocuments,
} from './booking/tenantLegalNameForDocuments.js'

export function getDocusealSubmissionsUrl(): string {
  return getDocusealSubmissionsUrlImpl()
}

// `createDocusealSubmissionFromPdf` moved to `docuseal.shared.js` so it can be
// used by Node scripts without a TS loader.

function adminClient(): SupabaseClient<Database> {
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, key)
}

export function extractSubmissionIdFromWebhook(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>

  const tryVal = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    if (typeof v === 'string' && v.trim()) return v.trim()
    return null
  }

  const evt = typeof o.event_type === 'string' ? o.event_type.toLowerCase() : ''
  const isFormEvent = evt.startsWith('form.')

  const data = o.data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const nestedSubmission =
      d.submission && typeof d.submission === 'object'
        ? tryVal((d.submission as Record<string, unknown>).id)
        : null
    // form.* payloads use data.id as the submitter id; submission id is data.submission.id.
    if (isFormEvent && nestedSubmission) return nestedSubmission
    // Heuristic when event_type is missing: submitter-shaped data with nested submission.
    const looksLikeFormSubmitter =
      typeof d.role === 'string' && nestedSubmission != null && !Array.isArray(d.submitters)
    if (looksLikeFormSubmitter && nestedSubmission) return nestedSubmission

    const fromData = tryVal(d.id) ?? tryVal(d.submission_id)
    if (fromData) return fromData
    if (nestedSubmission) return nestedSubmission
  }

  const direct = tryVal(o.id) ?? tryVal(o.submission_id)
  if (direct) return direct

  const submission = o.submission
  if (submission && typeof submission === 'object') {
    const fromSub = tryVal((submission as Record<string, unknown>).id)
    if (fromSub) return fromSub
  }

  return null
}

type DocusealSubmitter = {
  id?: number
  email?: string
  name?: string
  role?: string
  embed_src?: string
  completed_at?: string | null
}

type DocusealSubmissionResponse = {
  id?: number
  submitters?: DocusealSubmitter[]
}

async function fetchDocusealJson(path: string): Promise<unknown> {
  const rawBase = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  const base = rawBase.replace(/\/api$/i, '')
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  if (!base || !token) throw new Error('DocuSeal is not configured')
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, { headers: { 'X-Auth-Token': token } })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`DocuSeal GET ${url}: ${res.status} ${t}`)
  }
  return res.json()
}

async function fetchPdfBufferFromUrl(pdfUrl: string): Promise<Buffer> {
  const pdfRes = await fetch(pdfUrl)
  if (!pdfRes.ok) throw new Error(`Download PDF failed: ${pdfRes.status}`)
  return Buffer.from(await pdfRes.arrayBuffer())
}

function extractCombinedDocumentUrlFromSubmissionPayload(root: Record<string, unknown>): string | null {
  const pick = (o: unknown): string | null => {
    if (!o || typeof o !== 'object') return null
    const u = (o as Record<string, unknown>).combined_document_url
    return typeof u === 'string' && u.startsWith('http') ? u : null
  }
  const data = root.data
  const dataSub =
    data && typeof data === 'object' ? (data as Record<string, unknown>).submission : undefined
  return pick(root) || pick(root.submission) || pick(dataSub)
}

type DocusealDocumentPart = { name: string; url: string }

function extractDocumentPartsFromResponse(docsJson: unknown): DocusealDocumentPart[] {
  let list: unknown[] = []
  if (Array.isArray(docsJson)) {
    list = docsJson
  } else if (docsJson && typeof docsJson === 'object') {
    const d = docsJson as Record<string, unknown>
    if (Array.isArray(d.data)) list = d.data
    else if (Array.isArray(d.documents)) list = d.documents
  }
  const out: DocusealDocumentPart[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const u = r.url
    if (typeof u !== 'string' || !u.startsWith('http')) continue
    const n = typeof r.name === 'string' ? r.name : ''
    out.push({ name: n, url: u })
  }
  return out
}

function extractDocumentPartsFromSubmissionRoot(sub: Record<string, unknown>): DocusealDocumentPart[] {
  const docs = sub.documents
  if (!Array.isArray(docs)) return []
  const out: DocusealDocumentPart[] = []
  for (const item of docs) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const u = r.url
    if (typeof u !== 'string' || !u.startsWith('http')) continue
    const n = typeof r.name === 'string' ? r.name : ''
    out.push({ name: n, url: u })
  }
  return out
}

/** Prescribed RTA draft first, Quni addendum second - matches signing package order (NSW or QLD). */
function sortResidentialPackageDocumentParts(parts: DocusealDocumentPart[]): DocusealDocumentPart[] {
  const score = (name: string): number => {
    const n = name.toLowerCase()
    if (n.includes('addendum')) return 2
    if (
      n.includes('nsw') ||
      n.includes('ft6600') ||
      n.includes('form 18a') ||
      n.includes('qld') ||
      n.includes('general tenancy')
    )
      return 0
    if (n.includes('residential tenancy') && !n.includes('addendum')) return 0
    return 1
  }
  return [...parts].sort((a, b) => score(a.name) - score(b.name))
}

async function mergePdfBuffersFromUrls(urls: string[]): Promise<Buffer> {
  const merged = await PDFDocument.create()
  for (const url of urls) {
    const buf = await fetchPdfBufferFromUrl(url)
    const src = await PDFDocument.load(buf, { ignoreEncryption: true })
    const pages = await merged.copyPages(src, src.getPageIndices())
    for (const p of pages) merged.addPage(p)
  }
  const saved = await merged.save({ useObjectStreams: false, addDefaultPage: false })
  return Buffer.from(saved)
}

/**
 * Download the completed submission PDF from DocuSeal (same combined file signees see when all parties have signed).
 * For NSW residential packages, prefers `combined_document_url`, then merge=true, then merges multiple per-document URLs in FT6600 → addendum order.
 */
export async function downloadSignedSubmissionPdfFromDocuseal(
  submissionId: string,
  residentialTenancyPackage: boolean,
): Promise<Buffer> {
  const subJson = (await fetchDocusealJson(`/api/submissions/${submissionId}`)) as Record<string, unknown>

  if (residentialTenancyPackage) {
    const combined = extractCombinedDocumentUrlFromSubmissionPayload(subJson)
    if (combined) {
      return fetchPdfBufferFromUrl(combined)
    }
  }

  const documentsPath = residentialTenancyPackage
    ? `/api/submissions/${submissionId}/documents?merge=true`
    : `/api/submissions/${submissionId}/documents`

  let parts = extractDocumentPartsFromResponse(await fetchDocusealJson(documentsPath))

  if (residentialTenancyPackage && parts.length <= 1) {
    const fromRoot = extractDocumentPartsFromSubmissionRoot(subJson)
    if (fromRoot.length > parts.length) parts = fromRoot
  }

  if (residentialTenancyPackage && parts.length <= 1) {
    const unmerged = extractDocumentPartsFromResponse(
      await fetchDocusealJson(`/api/submissions/${submissionId}/documents`),
    )
    if (unmerged.length > parts.length) parts = unmerged
  }

  if (residentialTenancyPackage && parts.length > 1) {
    return mergePdfBuffersFromUrls(sortResidentialPackageDocumentParts(parts).map((p) => p.url))
  }

  if (parts.length >= 1) {
    return fetchPdfBufferFromUrl(parts[0].url)
  }

  if (residentialTenancyPackage) {
    throw new Error('Could not resolve signed residential tenancy package PDF from DocuSeal')
  }

  const audit = subJson.audit_log_url
  if (typeof audit === 'string' && audit.startsWith('http')) {
    return fetchPdfBufferFromUrl(audit)
  }

  throw new Error('Could not resolve signed PDF URL from DocuSeal')
}

/**
 * NSW residential signing package: fetch RTA and addendum as separate PDFs from DocuSeal.
 * Does not use `combined_document_url` (can be a single merged blob) and does not merge buffers.
 * Returns null when DocuSeal only exposes one PDF URL (caller may fall back to merged download).
 */
export async function downloadSignedResidentialTenancyPackagePartsFromDocuseal(
  submissionId: string,
): Promise<{ rta: Buffer; addendum: Buffer } | null> {
  const subJson = (await fetchDocusealJson(`/api/submissions/${submissionId}`)) as Record<string, unknown>

  let parts = extractDocumentPartsFromResponse(
    await fetchDocusealJson(`/api/submissions/${submissionId}/documents`),
  )
  if (parts.length <= 1) {
    const fromRoot = extractDocumentPartsFromSubmissionRoot(subJson)
    if (fromRoot.length > parts.length) parts = fromRoot
  }

  const sorted = sortResidentialPackageDocumentParts(parts)
  if (sorted.length < 2) return null

  const addendumPart =
    sorted.find((p) => p.name.toLowerCase().includes('addendum')) ?? sorted[sorted.length - 1]
  const rtaPart =
    sorted.find((p) => {
      const n = p.name.toLowerCase()
      return (
        n.includes('nsw') ||
        n.includes('ft6600') ||
        n.includes('form 18a') ||
        n.includes('qld') ||
        n.includes('general tenancy') ||
        (n.includes('residential tenancy') && !n.includes('addendum'))
      )
    }) ?? sorted[0]

  if (rtaPart.url === addendumPart.url) return null

  const [rta, addendum] = await Promise.all([
    fetchPdfBufferFromUrl(rtaPart.url),
    fetchPdfBufferFromUrl(addendumPart.url),
  ])
  return { rta, addendum }
}

/** Create DocuSeal submission from PDF bytes (base64) and two signers. */
export { createDocusealSubmissionFromPdf }

/** After draft PDF exists in Storage: send to DocuSeal and notify both parties. */
export async function sendForSigning(
  documentId: string,
  opts?: { documentPdfName?: string; removeTags?: boolean; skipCoTenantSigner?: boolean },
): Promise<void> {
  const admin = adminClient()

  const { data: row, error: rowErr } = await admin
    .from('tenancy_documents')
    .select('id, tenancy_id, status, file_path')
    .eq('id', documentId)
    .maybeSingle()

  if (rowErr) throw rowErr
  if (!row?.file_path || !row.tenancy_id) {
    throw new Error('Tenancy document not found or missing file_path')
  }

  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('landlord_profile_id, student_profile_id')
    .eq('id', row.tenancy_id)
    .maybeSingle()

  if (tErr) throw tErr
  if (!tenancy?.landlord_profile_id || !tenancy.student_profile_id) {
    throw new Error('Tenancy missing profile ids')
  }

  const { data: lpRow, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('full_name, first_name, last_name, email, company_name')
    .eq('id', tenancy.landlord_profile_id)
    .maybeSingle()

  const { data: spRow, error: spErr } = await admin
    .from('student_profiles')
    .select('full_name, first_name, last_name, email, verification_type, legal_name_locked_at')
    .eq('id', tenancy.student_profile_id)
    .maybeSingle()

  if (lpErr) throw lpErr
  if (spErr) throw spErr
  if (!lpRow || !spRow) throw new Error('Could not load landlord or student profile')

  await assertStudentLegalNameForSigning(admin, spRow)

  const landlordName =
    [lpRow.first_name, lpRow.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lpRow.full_name === 'string' ? lpRow.full_name.trim() : '') ||
    'Landlord'
  const tenantSalutationName = legacyStudentNameFromProfile(spRow, 'Tenant')
  const tenantSubmitterName = tenantLegalNameForDocuments(spRow, 'Tenant')
  const landlordEmail = typeof lpRow.email === 'string' ? lpRow.email.trim() : ''
  const tenantEmail = typeof spRow.email === 'string' ? spRow.email.trim() : ''

  if (!landlordEmail || !tenantEmail) {
    throw new Error('Landlord or tenant email missing for DocuSeal')
  }

  const { data: fileBlob, error: dlErr } = await admin.storage
    .from('tenancy-documents')
    .download(row.file_path)

  if (dlErr || !fileBlob) {
    throw new Error(dlErr?.message || 'Could not download draft PDF from storage')
  }

  const buf = Buffer.from(await fileBlob.arrayBuffer())
  const pdfBase64 = buf.toString('base64')

  let coTenantSigner: { name: string; email: string } | null = null
  if (!opts?.skipCoTenantSigner) {
    try {
      coTenantSigner = await resolveCoTenantSignerForSubmission(row.tenancy_id, tenantEmail)
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e))
    }
  }

  const submissionRaw = await createDocusealSubmissionFromPdf({
    name: `Lease - ${landlordName} / ${tenantSalutationName}`,
    pdfBase64,
    documentPdfName: opts?.documentPdfName,
    removeTags: opts?.removeTags,
    landlord: { name: landlordName, email: landlordEmail },
    tenant: { name: tenantSubmitterName, email: tenantEmail },
    coTenant: coTenantSigner,
  })
  const submission = wrapSubmissionSubmitters(submissionRaw, false)

  const submissionId = submission.id != null ? String(submission.id) : null
  if (!submissionId) {
    throw new Error('DocuSeal response missing submission id')
  }

  const { error: upErr } = await admin
    .from('tenancy_documents')
    .update({
      docuseal_submission_id: submissionId,
      status: 'sent_for_signing',
      metadata: { docuseal_response: submission as unknown as Json } as Json,
    })
    .eq('id', documentId)

  if (upErr) throw upErr

  try {
    const { emitDocumentSentForSigning, loadBookingIdsForTenancy } = await import(
      './booking/events/emitDocusealDocumentEvents.js'
    )
    const bookingIds = await loadBookingIdsForTenancy(admin, row.tenancy_id)
    if (bookingIds) {
      await emitDocumentSentForSigning(admin, {
        ...bookingIds,
        documentId,
        submissionId,
        actorType: 'system',
        source: 'send',
      })
    }
  } catch (evErr) {
    console.error('[docuseal] document.sent_for_signing', documentId, evErr)
  }

  const submitters = Array.isArray(submission.submitters) ? submission.submitters : []
  const landlordLink =
    submitters.find((s) => (s.role || '').toLowerCase().includes('landlord'))?.embed_src ||
    submitters[0]?.embed_src ||
    ''
  const tenantLink =
    submitters.find((s) => (s.role || '').toLowerCase().includes('tenant'))?.embed_src ||
    submitters[1]?.embed_src ||
    ''

  const signHtml = (who: string, link: string) => `
    <p>Hi ${escapeHtml(who)},</p>
    <p>Your Quni Living residential tenancy agreement is ready to sign.</p>
    <p><a href="${escapeHtml(link)}">Open signing page</a></p>
    <p>If the button does not work, copy this link: ${escapeHtml(link)}</p>
    <p>- Quni Living (quni.com.au)</p>
  `

  const coTenantLink =
    coTenantSigner &&
    submitters.find((s) => (s.role || '').toLowerCase().includes('co-tenant'))?.embed_src

  await Promise.all([
    landlordLink
      ? sendEmail({
          to: landlordEmail,
          subject: 'Your Quni Living lease is ready to sign',
          html: signHtml(landlordName, landlordLink),
        })
      : Promise.resolve(),
    tenantLink
      ? sendEmail({
          to: tenantEmail,
          subject: 'Your Quni Living lease is ready to sign',
          html: signHtml(tenantSalutationName, tenantLink),
        })
      : Promise.resolve(),
    coTenantSigner && coTenantLink
      ? sendEmail({
          to: coTenantSigner.email,
          subject: 'Your Quni Living lease is ready to sign (co-tenant)',
          html: signHtml(coTenantSigner.name, coTenantLink),
        })
      : Promise.resolve(),
  ])
}

async function resolveCoTenantSignerForSubmission(
  tenancyId: string,
  primaryTenantEmail: string,
): Promise<{ name: string; email: string } | null> {
  const admin = adminClient()
  const co = await fetchCoTenantSignerForTenancy(admin, tenancyId)
  if (!co) return null
  if (!coTenantEmailDistinctFromPrimary(primaryTenantEmail, co.email)) {
    throw new Error(
      'Co-tenant must use a different email from the primary tenant so each party can sign the lease.',
    )
  }
  return co
}

/** NSW RTA package (FT6600 + Quni addendum): two draft PDFs in Storage, one DocuSeal submission. */
export async function sendResidentialTenancyPackageForSigning(
  documentId: string,
  docusealOpts?: { submitterSignReason?: boolean },
): Promise<void> {
  const admin = adminClient()

  const { data: row, error: rowErr } = await admin
    .from('tenancy_documents')
    .select('id, tenancy_id, status, file_path, metadata')
    .eq('id', documentId)
    .maybeSingle()

  if (rowErr) throw rowErr
  if (!row?.file_path || !row.tenancy_id) {
    throw new Error('Tenancy document not found or missing file_path')
  }

  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  const addendumPath = typeof meta.addendum_file_path === 'string' ? meta.addendum_file_path.trim() : ''
  if (!addendumPath) {
    throw new Error('Residential tenancy package missing metadata.addendum_file_path')
  }
  const signingPkg = meta.signing_package
  if (
    signingPkg !== 'residential_tenancy' &&
    signingPkg !== 'residential_tenancy_qld' &&
    signingPkg !== 'residential_tenancy_vic'
  ) {
    throw new Error(
      'Tenancy document is not a residential tenancy signing package (FT6600, Form 18a, or Form 1)',
    )
  }
  const isQldResidential = signingPkg === 'residential_tenancy_qld'
  const isVicResidential = signingPkg === 'residential_tenancy_vic'

  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('landlord_profile_id, student_profile_id')
    .eq('id', row.tenancy_id)
    .maybeSingle()

  if (tErr) throw tErr
  if (!tenancy?.landlord_profile_id || !tenancy.student_profile_id) {
    throw new Error('Tenancy missing profile ids')
  }

  const { data: lpRow, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('full_name, first_name, last_name, email, company_name')
    .eq('id', tenancy.landlord_profile_id)
    .maybeSingle()

  const { data: spRow, error: spErr } = await admin
    .from('student_profiles')
    .select('full_name, first_name, last_name, email, verification_type, legal_name_locked_at')
    .eq('id', tenancy.student_profile_id)
    .maybeSingle()

  if (lpErr) throw lpErr
  if (spErr) throw spErr
  if (!lpRow || !spRow) throw new Error('Could not load landlord or student profile')

  await assertStudentLegalNameForSigning(admin, spRow)

  const landlordName =
    [lpRow.first_name, lpRow.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lpRow.full_name === 'string' ? lpRow.full_name.trim() : '') ||
    'Landlord'
  const tenantSalutationName = legacyStudentNameFromProfile(spRow, 'Tenant')
  const tenantSubmitterName = tenantLegalNameForDocuments(spRow, 'Tenant')
  const tenantName = tenantSalutationName
  const landlordEmail = typeof lpRow.email === 'string' ? lpRow.email.trim() : ''
  const tenantEmail = typeof spRow.email === 'string' ? spRow.email.trim() : ''

  if (!landlordEmail || !tenantEmail) {
    throw new Error('Landlord or tenant email missing for DocuSeal')
  }

  const { data: rtaBlob, error: rtaDlErr } = await admin.storage
    .from('tenancy-documents')
    .download(row.file_path)
  const { data: addBlob, error: addDlErr } = await admin.storage.from('tenancy-documents').download(addendumPath)

  if (rtaDlErr || !rtaBlob) {
    throw new Error(rtaDlErr?.message || 'Could not download prescribed tenancy draft PDF from storage')
  }
  if (addDlErr || !addBlob) {
    throw new Error(addDlErr?.message || 'Could not download addendum draft PDF from storage')
  }

  const rtaBase64 = Buffer.from(await rtaBlob.arrayBuffer()).toString('base64')
  const addendumBase64 = Buffer.from(await addBlob.arrayBuffer()).toString('base64')

  const coTenantSigner = await resolveCoTenantSignerForSubmission(row.tenancy_id, tenantEmail)

  // NSW FT6600 execution dates are stamped read-only so signers only sign — never type the date.
  // QLD Form 18a and VIC Form 1 use different date fields and are left untouched.
  const isNswFt6600 = !isQldResidential && !isVicResidential
  const nswReadonlyDates = isNswFt6600
    ? officialFt6600ReadonlyDateFieldValues(new Date(), { includeCoTenant: Boolean(coTenantSigner) })
    : null

  const nswDateRefresh = signingPackageNeedsDateRefresh(signingPkg)

  const submissionRaw = await createDocusealSubmissionFromPdf({
    name: isVicResidential
      ? coTenantSigner
        ? `VIC Form 1 - ${landlordName} / ${tenantName} / ${coTenantSigner.name}`
        : `VIC Form 1 - ${landlordName} / ${tenantName}`
      : isQldResidential
        ? coTenantSigner
          ? `QLD Form 18a - ${landlordName} / ${tenantName} / ${coTenantSigner.name}`
          : `QLD Form 18a - ${landlordName} / ${tenantName}`
        : coTenantSigner
          ? `NSW RTA - ${landlordName} / ${tenantName} / ${coTenantSigner.name}`
          : `NSW RTA - ${landlordName} / ${tenantName}`,
    documents: [
      {
        name: isVicResidential
          ? 'VIC Form 1 Residential Rental Agreement.pdf'
          : isQldResidential
            ? 'QLD Form 18a General Tenancy Agreement.pdf'
            : 'NSW Residential Tenancy Agreement.pdf',
        file: rtaBase64,
      },
      { name: 'Quni Platform Addendum.pdf', file: addendumBase64 },
    ],
    landlord: { name: landlordName, email: landlordEmail },
    tenant: { name: tenantSubmitterName, email: tenantEmail },
    coTenant: coTenantSigner,
    ...(nswReadonlyDates
      ? {
          landlordRole: 'First Party',
          tenantRole: 'Second Party',
          coTenantRole: 'Co-tenant',
          landlordFields: nswReadonlyDates.firstParty,
          tenantFields: nswReadonlyDates.secondParty,
          coTenantFields: nswReadonlyDates.coTenant,
        }
      : {}),
    ...(docusealOpts?.submitterSignReason === false ? { submitterSignReason: false } : {}),
  })
  const submission = wrapSubmissionSubmitters(submissionRaw, nswDateRefresh)

  const submissionId = submission.id != null ? String(submission.id) : null
  if (!submissionId) {
    throw new Error('DocuSeal response missing submission id')
  }

  const { error: upErr } = await admin
    .from('tenancy_documents')
    .update({
      docuseal_submission_id: submissionId,
      status: 'sent_for_signing',
      metadata: {
        ...meta,
        signing_package: signingPkg,
        addendum_file_path: addendumPath,
        docuseal_response: submission as unknown as Json,
      } as Json,
    })
    .eq('id', documentId)

  if (upErr) throw upErr

  try {
    const { emitDocumentSentForSigning, loadBookingIdsForTenancy } = await import(
      './booking/events/emitDocusealDocumentEvents.js'
    )
    const bookingIds = await loadBookingIdsForTenancy(admin, row.tenancy_id)
    if (bookingIds) {
      await emitDocumentSentForSigning(admin, {
        ...bookingIds,
        documentId,
        submissionId,
        actorType: 'system',
        source: 'send',
      })
    }
  } catch (evErr) {
    console.error('[docuseal] document.sent_for_signing (package)', documentId, evErr)
  }

  const submitters = Array.isArray(submission.submitters) ? submission.submitters : []
  const landlordLink =
    submitters.find((s) => (s.role || '').toLowerCase().includes('landlord'))?.embed_src ||
    submitters[0]?.embed_src ||
    ''
  const tenantLink =
    submitters.find((s) => (s.role || '').toLowerCase().includes('tenant'))?.embed_src ||
    submitters[1]?.embed_src ||
    ''

  const signHtml = (who: string, link: string) =>
    isVicResidential
      ? `
    <p>Hi ${escapeHtml(who)},</p>
    <p>Your Victoria Form 1 residential rental agreement package is ready to sign (prescribed agreement plus Quni platform addendum).</p>
    <p><a href="${escapeHtml(link)}">Open signing page</a></p>
    <p>If the button does not work, copy this link: ${escapeHtml(link)}</p>
    <p>- Quni Living (quni.com.au)</p>
  `
      : isQldResidential
        ? `
    <p>Hi ${escapeHtml(who)},</p>
    <p>Your Queensland Form 18a general tenancy agreement package is ready to sign (prescribed agreement plus Quni platform addendum).</p>
    <p><a href="${escapeHtml(link)}">Open signing page</a></p>
    <p>If the button does not work, copy this link: ${escapeHtml(link)}</p>
    <p>- Quni Living (quni.com.au)</p>
  `
        : `
    <p>Hi ${escapeHtml(who)},</p>
    <p>Your NSW residential tenancy agreement package is ready to sign (standard form plus Quni platform addendum).</p>
    <p><a href="${escapeHtml(link)}">Open signing page</a></p>
    <p>If the button does not work, copy this link: ${escapeHtml(link)}</p>
    <p>- Quni Living (quni.com.au)</p>
  `

  const readySubject = isVicResidential
    ? 'Your VIC Form 1 tenancy agreement is ready to sign'
    : isQldResidential
      ? 'Your QLD Form 18a tenancy agreement is ready to sign'
      : 'Your NSW residential tenancy agreement is ready to sign'

  const coTenantLink =
    coTenantSigner &&
    submitters.find((s) => (s.role || '').toLowerCase().includes('co-tenant'))?.embed_src

  await Promise.all([
    landlordLink
      ? sendEmail({
          to: landlordEmail,
          subject: readySubject,
          html: signHtml(landlordName, landlordLink),
        })
      : Promise.resolve(),
    tenantLink
      ? sendEmail({
          to: tenantEmail,
          subject: readySubject,
          html: signHtml(tenantSalutationName, tenantLink),
        })
      : Promise.resolve(),
    coTenantSigner && coTenantLink
      ? sendEmail({
          to: coTenantSigner.email,
          subject: isVicResidential
            ? 'Your VIC tenancy agreement is ready to sign (co-tenant)'
            : isQldResidential
              ? 'Your QLD tenancy agreement is ready to sign (co-tenant)'
              : 'Your NSW tenancy agreement is ready to sign (co-tenant)',
          html: signHtml(coTenantSigner.name, coTenantLink),
        })
      : Promise.resolve(),
  ])
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** DocuSeal webhook: store signed PDF and update tenancy_documents. */
export async function handleSigningWebhook(payload: unknown): Promise<{ ok: boolean; message?: string }> {
  const submissionId = extractSubmissionIdFromWebhook(payload)
  if (!submissionId) {
    return { ok: false, message: 'No submission id in payload' }
  }

  const admin = adminClient()

  const { data: docRow, error: findErr } = await admin
    .from('tenancy_documents')
    .select(
      'id, tenancy_id, docuseal_submission_id, metadata, status, landlord_signed_at, student_signed_at, co_tenant_signed_at',
    )
    .eq('docuseal_submission_id', submissionId)
    .maybeSingle()

  if (findErr) throw findErr
  if (!docRow?.tenancy_id) {
    return { ok: true, message: 'No matching tenancy_document (ignored)' }
  }

  const { data: tenancyForBooking, error: tenancyLookupErr } = await admin
    .from('tenancies')
    .select('booking_id')
    .eq('id', docRow.tenancy_id)
    .maybeSingle()

  if (tenancyLookupErr) throw tenancyLookupErr

  if (tenancyForBooking?.booking_id) {
    const { data: bookingRow, error: bookingLookupErr } = await admin
      .from('bookings')
      .select('id, status, property_id, landlord_id, student_id, service_tier_final')
      .eq('id', tenancyForBooking.booking_id)
      .maybeSingle()

    if (bookingLookupErr) throw bookingLookupErr

    if (bookingRow && isTerminalBookingStatus(bookingRow.status)) {
      console.warn('[docuseal-webhook] signature on terminal booking ignored', {
        bookingId: bookingRow.id,
        submissionId,
        bookingStatus: bookingRow.status,
      })

      try {
        const { emitSignatureOnTerminalBooking } = await import(
          './booking/events/emitDocusealDocumentEvents.js'
        )
        await emitSignatureOnTerminalBooking(admin, {
          bookingId: bookingRow.id,
          landlordId: bookingRow.landlord_id,
          studentId: bookingRow.student_id,
          documentId: docRow.id,
          submissionId,
          bookingStatus: bookingRow.status,
        })
      } catch (evErr) {
        console.error('[docuseal-webhook] signature.on_terminal_booking telemetry', evErr)
      }

      return { ok: true, message: 'Booking terminal; signature ignored' }
    }
  }

  const { syncFullySignedDocusealSubmission } = await import('./docuseal/reconcileFromDocuseal.js')
  const syncResult = await syncFullySignedDocusealSubmission({
    admin,
    docRow,
    submissionId,
    submissionPayload: payload,
    metadataExtra: { last_webhook: payload as unknown as Json },
    eventOptions: {
      source: 'webhook',
      actorType: 'webhook',
    },
  })

  const {
    fullySigned,
    signedUrl: link,
    isResidentialTenancyPackage,
    isQldResidentialPackage,
    isVicResidentialPackage,
  } = syncResult

  if (!fullySigned) {
    return { ok: true, message: 'Webhook stored; awaiting remaining signatures' }
  }

  const { data: tny } = await admin
    .from('tenancies')
    .select('landlord_profile_id, student_profile_id')
    .eq('id', docRow.tenancy_id)
    .maybeSingle()

  if (!tny?.landlord_profile_id || !tny.student_profile_id) {
    return { ok: true, message: 'Tenancy profiles missing' }
  }

  const { data: lp } = await admin
    .from('landlord_profiles')
    .select('email, full_name, first_name, last_name')
    .eq('id', tny.landlord_profile_id)
    .maybeSingle()

  const { data: sp } = await admin
    .from('student_profiles')
    .select('email, full_name, first_name, last_name')
    .eq('id', tny.student_profile_id)
    .maybeSingle()

  const le = typeof lp?.email === 'string' ? lp.email.trim() : ''
  const se = typeof sp?.email === 'string' ? sp.email.trim() : ''
  const ln =
    [lp?.first_name, lp?.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp?.full_name === 'string' ? lp.full_name : 'Landlord')
  const sn =
    [sp?.first_name, sp?.last_name].filter(Boolean).join(' ').trim() ||
    (typeof sp?.full_name === 'string' ? sp.full_name : 'Tenant')

  const signedDocLabel = isResidentialTenancyPackage
    ? 'Download signed agreement package (7-day link)'
    : 'Download signed lease (7-day link)'
  const signedSubject = isResidentialTenancyPackage
    ? isVicResidentialPackage
      ? 'Your VIC tenancy agreement is signed - Quni Living'
      : isQldResidentialPackage
        ? 'Your QLD tenancy agreement is signed - Quni Living'
        : 'Your NSW tenancy agreement is signed - Quni Living'
    : 'Your lease is signed - Quni Living'
  const doneHtml = (name: string) => `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your residential tenancy agreement has been fully signed. You can download a copy here:</p>
    <p><a href="${escapeHtml(link)}">${escapeHtml(signedDocLabel)}</a></p>
    <p>- Quni Living</p>
  `

  if (le && link) await sendEmail({ to: le, subject: signedSubject, html: doneHtml(String(ln)) })
  if (se && link) await sendEmail({ to: se, subject: signedSubject, html: doneHtml(String(sn)) })

  const { data: tenancyRow } = await admin
    .from('tenancies')
    .select('booking_id')
    .eq('id', docRow.tenancy_id)
    .maybeSingle()
  if (isResidentialTenancyPackage && tenancyRow?.booking_id) {
    const coDone = await fetchCoTenantSignerForBooking(admin, tenancyRow.booking_id)
    if (coDone?.email && link) {
      await sendEmail({
        to: coDone.email,
        subject: signedSubject,
        html: doneHtml(coDone.name),
      })
    }
  }

  return { ok: true }
}

/**
 * Extract a real `completed_at` timestamp for the given role from a DocuSeal webhook payload.
 *
 * Returns the string timestamp DocuSeal supplied for that submitter, or `null` when:
 *   - no submitters array is present;
 *   - the role is not represented in the submitters list;
 *   - the matching submitter has no completed_at value.
 *
 * Phase 3 / Task J: previously this returned `new Date().toISOString()` as a fallback,
 * which caused both `landlord_signed_at` and `student_signed_at` to be populated whenever
 * any DocuSeal webhook fired (even after a single party signed). The "fully signed" gate
 * for the Download button needs accurate per-party timestamps, so we now return null when
 * the payload does not actually carry a per-role completion time.
 */
function submitterRoleMatches(roleStr: string, role: 'landlord' | 'tenant' | 'co_tenant'): boolean {
  if (role === 'co_tenant') {
    return roleStr.includes('co-tenant') || roleStr.includes('co tenant')
  }
  if (roleStr.includes('co-tenant') || roleStr.includes('co tenant')) return false
  if (role === 'landlord') return roleStr.includes('landlord') || roleStr.includes('first party')
  return (
    roleStr.includes('tenant') ||
    roleStr.includes('second party') ||
    roleStr.includes('renter')
  )
}

export function extractCompletedAt(
  payload: unknown,
  role: 'landlord' | 'tenant' | 'co_tenant',
): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const submitters = root.submitters
  if (Array.isArray(submitters)) {
    for (const s of submitters) {
      if (!s || typeof s !== 'object') continue
      const r = (s as Record<string, unknown>).role
      const roleStr = typeof r === 'string' ? r.toLowerCase() : ''
      if (!submitterRoleMatches(roleStr, role)) continue
      const c = (s as Record<string, unknown>).completed_at
      if (typeof c === 'string' && c.trim()) return c
      return null
    }
    return null
  }

  // form.completed: `data` is a single submitter (role + completed_at), not a submitters[].
  const roleStr = typeof root.role === 'string' ? root.role.toLowerCase() : ''
  if (!roleStr || !submitterRoleMatches(roleStr, role)) return null
  const c = root.completed_at
  if (typeof c === 'string' && c.trim()) return c
  return null
}

/** Fallback for the top-level `event_type === 'submission.completed'` case (all parties done). */
function extractSubmissionCompletedAt(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const evt = typeof o.event_type === 'string' ? o.event_type.toLowerCase() : ''
  if (evt !== 'submission.completed') return null
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const completedAt = root.completed_at
  if (typeof completedAt === 'string' && completedAt.trim()) return completedAt
  return new Date().toISOString()
}

export async function getManagedLandlordFeePercentForProperty(propertyId: string): Promise<number> {
  const admin = adminClient()

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select('landlord_id')
    .eq('id', propertyId)
    .maybeSingle()
  if (propErr) throw propErr

  const pricingCell = await getActivePricingSnapshotForProperty(propertyId, 'managed')
  const feeExempt =
    property?.landlord_id != null ? await isLandlordFeeExempt(admin, property.landlord_id) : false
  return resolveManagedApplicationFeePercent(feeExempt, pricingCell)
}
