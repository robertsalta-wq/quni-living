/// <reference types="node" />
// @ts-nocheck — Vercel isolated API TS pass (see tsconfig.api.json for full check).
/**
 * DocuSeal (self-hosted) + tenancy lease workflow — server-only (Vercel Node).
 * Uses SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, RESEND_API_KEY.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../src/lib/database.types'
import { sendEmail } from './sendEmail.js'
import {
  createDocusealSubmissionFromPdf,
  getDocusealSubmissionsUrl as getDocusealSubmissionsUrlImpl,
} from './docuseal.shared.js'

const PLATFORM_FEE_PERCENT = 3

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

  const direct = tryVal(o.id) ?? tryVal(o.submission_id)
  if (direct) return direct

  const data = o.data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const fromData = tryVal(d.id) ?? tryVal(d.submission_id)
    if (fromData) return fromData
    const sub = d.submission
    if (sub && typeof sub === 'object') {
      const s = sub as Record<string, unknown>
      const fromSub = tryVal(s.id)
      if (fromSub) return fromSub
    }
  }

  const submission = o.submission
  if (submission && typeof submission === 'object') {
    const s = submission as Record<string, unknown>
    const fromSub = tryVal(s.id)
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

/** Create DocuSeal submission from PDF bytes (base64) and two signers. */
export { createDocusealSubmissionFromPdf }

/** After draft PDF exists in Storage: send to DocuSeal and notify both parties. */
export async function sendForSigning(documentId: string): Promise<void> {
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
    .select('full_name, first_name, last_name, email')
    .eq('id', tenancy.student_profile_id)
    .maybeSingle()

  if (lpErr) throw lpErr
  if (spErr) throw spErr
  if (!lpRow || !spRow) throw new Error('Could not load landlord or student profile')

  const landlordName =
    [lpRow.first_name, lpRow.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lpRow.full_name === 'string' ? lpRow.full_name.trim() : '') ||
    'Landlord'
  const tenantName =
    [spRow.first_name, spRow.last_name].filter(Boolean).join(' ').trim() ||
    (typeof spRow.full_name === 'string' ? spRow.full_name.trim() : '') ||
    'Tenant'
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

  const submission = await createDocusealSubmissionFromPdf({
    name: `Lease — ${landlordName} / ${tenantName}`,
    pdfBase64,
    landlord: { name: landlordName, email: landlordEmail },
    tenant: { name: tenantName, email: tenantEmail },
  })

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
    <p>— Quni Living (quni.com.au)</p>
  `

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
          html: signHtml(tenantName, tenantLink),
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
    .select('id, tenancy_id, docuseal_submission_id')
    .eq('docuseal_submission_id', submissionId)
    .maybeSingle()

  if (findErr) throw findErr
  if (!docRow?.tenancy_id) {
    return { ok: true, message: 'No matching tenancy_document (ignored)' }
  }

  const docsJson = await fetchDocusealJson(`/api/submissions/${submissionId}/documents`)
  let list: unknown[] = []
  if (Array.isArray(docsJson)) {
    list = docsJson
  } else if (docsJson && typeof docsJson === 'object') {
    const d = docsJson as Record<string, unknown>
    if (Array.isArray(d.data)) list = d.data
    else if (Array.isArray(d.documents)) list = d.documents
  }

  let pdfUrl: string | null = null
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const u = (item as Record<string, unknown>).url
    if (typeof u === 'string' && u.startsWith('http')) {
      pdfUrl = u
      break
    }
  }

  if (!pdfUrl) {
    const sub = (await fetchDocusealJson(`/api/submissions/${submissionId}`)) as Record<string, unknown>
    const audit = sub.audit_log_url
    if (typeof audit === 'string' && audit.startsWith('http')) pdfUrl = audit
  }

  if (!pdfUrl) {
    throw new Error('Could not resolve signed PDF URL from DocuSeal')
  }

  const pdfRes = await fetch(pdfUrl)
  if (!pdfRes.ok) throw new Error(`Download signed PDF failed: ${pdfRes.status}`)
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer())

  const signedPath = `${docRow.tenancy_id}/lease/lease_signed.pdf`
  const { error: upStorageErr } = await admin.storage
    .from('tenancy-documents')
    .upload(signedPath, pdfBuf, { contentType: 'application/pdf', upsert: true })

  if (upStorageErr) throw upStorageErr

  const { data: signedUrlData } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(signedPath, 60 * 60 * 24 * 7)

  const landlordSignedAt = extractCompletedAt(payload, 'landlord')
  const studentSignedAt = extractCompletedAt(payload, 'tenant')

  const { error: upDocErr } = await admin
    .from('tenancy_documents')
    .update({
      status: 'signed',
      file_path: signedPath,
      landlord_signed_at: landlordSignedAt,
      student_signed_at: studentSignedAt,
      metadata: { last_webhook: payload as unknown as Json } as Json,
    })
    .eq('id', docRow.id)

  if (upDocErr) throw upDocErr

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

  const link = signedUrlData?.signedUrl || ''
  const doneHtml = (name: string) => `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your residential tenancy agreement has been fully signed. You can download a copy here:</p>
    <p><a href="${escapeHtml(link)}">Download signed lease (7-day link)</a></p>
    <p>— Quni Living</p>
  `

  if (le && link) await sendEmail({ to: le, subject: 'Your lease is signed — Quni Living', html: doneHtml(String(ln)) })
  if (se && link) await sendEmail({ to: se, subject: 'Your lease is signed — Quni Living', html: doneHtml(String(sn)) })

  return { ok: true }
}

function extractCompletedAt(payload: unknown, role: 'landlord' | 'tenant'): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const submitters = root.submitters
  if (!Array.isArray(submitters)) return new Date().toISOString()
  const needle = role === 'landlord' ? 'landlord' : 'tenant'
  for (const s of submitters) {
    if (!s || typeof s !== 'object') continue
    const r = (s as Record<string, unknown>).role
    const roleStr = typeof r === 'string' ? r.toLowerCase() : ''
    if (!roleStr.includes(needle)) continue
    const c = (s as Record<string, unknown>).completed_at
    if (typeof c === 'string' && c) return c
  }
  return new Date().toISOString()
}

export { PLATFORM_FEE_PERCENT }
