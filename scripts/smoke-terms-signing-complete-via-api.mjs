/**
 * Complete DocuSeal submitters via API (typed signature) so live webhooks can land.
 *
 * Prefer browser signing when a human is available. API completion still exercises
 * DocuSeal → quni.com.au/api/webhooks/docuseal → tenancy_documents if webhooks fire on PUT.
 *
 * Usage:
 *   SMOKE_CONFIRM_PROD_WRITE=1 node scripts/run-with-env.mjs node scripts/smoke-terms-signing-complete-via-api.mjs <bookingId>
 */
import {
  classifySubmitterRole,
  createAdmin,
  envFlag,
  fetchDocusealSubmission,
  loadBookingBundle,
  writeArtifact,
} from './smoke-terms-signing-lib.mjs'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docusealClient.js'

const bookingId = (process.argv[2] || '').trim()
if (!bookingId) {
  console.error('Usage: smoke-terms-signing-complete-via-api.mjs <bookingId>')
  process.exit(1)
}
if (!envFlag('SMOKE_CONFIRM_PROD_WRITE')) {
  console.error('Requires SMOKE_CONFIRM_PROD_WRITE=1')
  process.exit(1)
}

const TYPED_SIG = 'Smoke Test Signature'
const EXPLICIT_AU_DATE = new Date().toLocaleDateString('en-AU') // e.g. 22/07/2026

const admin = createAdmin()
const bundle = await loadBookingBundle(admin, bookingId)
const submissionId = bundle.doc?.docuseal_submission_id
if (!submissionId) throw new Error('No docuseal_submission_id')

const base = getDocusealApiBase()
const h = { ...getDocusealAuthHeaders(), 'Content-Type': 'application/json' }

async function jfetch(pathname, init) {
  const res = await fetch(`${base}${pathname}`, { ...init, headers: { ...h, ...(init?.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${pathname} ${res.status}: ${text.slice(0, 600)}`)
  return text ? JSON.parse(text) : null
}

const sm = await fetchDocusealSubmission(submissionId)
const fields = Array.isArray(sm.fields) ? sm.fields : []
const submitters = Array.isArray(sm.submitters) ? sm.submitters : []

const order = ['landlord', 'tenant', 'co_tenant']
const byParty = {}
for (const s of submitters) {
  const party = classifySubmitterRole(s.role)
  if (party !== 'unknown' && !byParty[party]) byParty[party] = s
}

function payloadFor(submitter) {
  const mine = fields.filter((f) => f.submitter_uuid === submitter.uuid)
  const payloadFields = []
  for (const f of mine) {
    if (f.type === 'signature' || f.type === 'initials') {
      payloadFields.push({ name: f.name, default_value: TYPED_SIG })
    } else if (f.type === 'date' && !f.readonly) {
      payloadFields.push({ name: f.name, default_value: EXPLICIT_AU_DATE })
    }
  }
  // If field map empty (one-off PDF GET), send completed with empty fields and hope defaults exist
  return { completed: true, fields: payloadFields }
}

const results = []
for (const party of order) {
  const s = byParty[party]
  if (!s) throw new Error(`Missing submitter for ${party}`)
  if (s.completed_at || s.status === 'completed') {
    results.push({ party, skipped: true, submitterId: s.id })
    continue
  }
  const body = payloadFor(s)
  const put = await jfetch(`/api/submitters/${s.id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  results.push({
    party,
    submitterId: s.id,
    role: s.role,
    fieldsSent: body.fields.length,
    statusAfter: put?.status ?? null,
    completed_at: put?.completed_at ?? null,
  })
  await new Promise((r) => setTimeout(r, 2500))
}

// Allow webhooks to land
await new Promise((r) => setTimeout(r, 8000))

const report = {
  phase: 'complete-via-api',
  ranAt: new Date().toISOString(),
  bookingId,
  submissionId,
  results,
  note: 'API PUT completed=true. Verify must still pass via webhooks — do not reconcile if verify fails.',
}
writeArtifact(`complete-via-api-${bookingId}.json`, report)
console.log(JSON.stringify(report, null, 2))
